import hashlib
import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.api.deps import (
    get_db,
    require_organization_permission,
)
from backend.app.db.models.network_scopes import (
    NetworkScope,
    NetworkScopeRange,
)
from backend.app.db.models.observations import ScanRun
from backend.app.schemas.discovery import (
    DiscoveryScanCreate,
    DiscoveryScanList,
    DiscoveryScanPublic,
)
from backend.app.services.discovery.execution import execute_discovery_scan
from backend.app.services.discovery.target_validation import (
    DiscoveryValidationError,
    build_nmap_arguments,
    validate_target,
)


router = APIRouter(
    prefix="/organizations/{organization_id}/network-scopes/{scope_id}/scans",
    tags=["Network Discovery"],
)


@router.post(
    "",
    response_model=DiscoveryScanPublic,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_discovery_scan(
    organization_id: UUID,
    scope_id: UUID,
    payload: DiscoveryScanCreate,
    background_tasks: BackgroundTasks,
    membership=Depends(
        require_organization_permission("discovery.run")
    ),
    db: Session = Depends(get_db),
):
    scope = db.scalar(
        select(NetworkScope).where(
            NetworkScope.id == scope_id,
            NetworkScope.organization_id == organization_id,
        )
    )

    if scope is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Network scope not found.",
        )

    if scope.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active network scopes can be scanned.",
        )

    ranges = db.scalars(
        select(NetworkScopeRange.cidr).where(
            NetworkScopeRange.organization_id == organization_id,
            NetworkScopeRange.network_scope_id == scope_id,
        )
    ).all()

    if not ranges:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This network scope has no approved CIDR ranges.",
        )

    try:
        validated_target = validate_target(
            payload.target_cidr,
            [str(cidr) for cidr in ranges],
            payload.profile,
        )
    except DiscoveryValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    arguments = build_nmap_arguments(validated_target)

    configuration = {
        "target": str(validated_target.network),
        "profile": payload.profile.name,
        "arguments": arguments,
    }

    configuration_hash = hashlib.sha256(
        json.dumps(
            configuration,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()

    scan_run = ScanRun(
        organization_id=organization_id,
        network_scope_id=scope_id,
        target=str(validated_target.network),
        scan_type=payload.profile.name,
        status="queued",
        started_at=datetime.now(timezone.utc),
        scan_arguments=json.dumps(arguments),
        port_scope=(
            "top-100-tcp"
            if payload.profile.name == "TCP_SERVICE_DISCOVERY"
            else "host-discovery"
        ),
        configuration_hash=configuration_hash,
    )

    try:
        db.add(scan_run)
        db.commit()
        db.refresh(scan_run)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to create the discovery scan.",
        ) from exc

    background_tasks.add_task(
        execute_discovery_scan,
        scan_run.id,
    )

    return scan_run


@router.get(
    "",
    response_model=DiscoveryScanList,
)
def list_discovery_scans(
    organization_id: UUID,
    scope_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    membership=Depends(
        require_organization_permission("observations.read")
    ),
    db: Session = Depends(get_db),
):
    scope_exists = db.scalar(
        select(NetworkScope.id).where(
            NetworkScope.id == scope_id,
            NetworkScope.organization_id == organization_id,
        )
    )

    if scope_exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Network scope not found.",
        )

    filters = (
        ScanRun.organization_id == organization_id,
        ScanRun.network_scope_id == scope_id,
    )

    total = db.scalar(
        select(func.count())
        .select_from(ScanRun)
        .where(*filters)
    ) or 0

    items = db.scalars(
        select(ScanRun)
        .where(*filters)
        .order_by(
            ScanRun.started_at.desc(),
            ScanRun.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).all()

    return DiscoveryScanList(
        items=items,
        total=total,
    )
