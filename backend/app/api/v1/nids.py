from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, require_organization_permission
from backend.app.db.models.nids_alerts import NIDSAlertRecord
from backend.app.db.models.network_scopes import NetworkScope
from backend.app.schemas.nids import (
    NIDSAlertList,
    NIDSAlertPublic,
    NIDSAlertStatusUpdate,
)


router = APIRouter(
    prefix="/organizations/{organization_id}/network-scopes/{scope_id}/nids-alerts",
    tags=["NIDS"],
)


def _require_scope(
    db: Session,
    organization_id: UUID,
    scope_id: UUID,
) -> None:
    exists = db.scalar(
        select(NetworkScope.id).where(
            NetworkScope.id == scope_id,
            NetworkScope.organization_id == organization_id,
        )
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Network scope not found.",
        )


@router.get("", response_model=NIDSAlertList)
def list_nids_alerts(
    organization_id: UUID,
    scope_id: UUID,
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    membership=Depends(require_organization_permission("observations.read")),
    db: Session = Depends(get_db),
):
    _require_scope(db, organization_id, scope_id)

    filters = [
        NIDSAlertRecord.organization_id == organization_id,
        NIDSAlertRecord.network_scope_id == scope_id,
    ]
    if status_filter is not None:
        if status_filter not in {"open", "acknowledged", "resolved"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Invalid alert status.",
            )
        filters.append(NIDSAlertRecord.status == status_filter)

    total = db.scalar(
        select(func.count()).select_from(NIDSAlertRecord).where(*filters)
    ) or 0
    items = db.scalars(
        select(NIDSAlertRecord)
        .where(*filters)
        .order_by(NIDSAlertRecord.occurred_at.desc(), NIDSAlertRecord.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return NIDSAlertList(items=items, total=total)


@router.patch("/{alert_id}/status", response_model=NIDSAlertPublic)
def update_nids_alert_status(
    organization_id: UUID,
    scope_id: UUID,
    alert_id: UUID,
    payload: NIDSAlertStatusUpdate,
    membership=Depends(require_organization_permission("monitoring.manage")),
    db: Session = Depends(get_db),
):
    _require_scope(db, organization_id, scope_id)
    alert = db.scalar(
        select(NIDSAlertRecord).where(
            NIDSAlertRecord.id == alert_id,
            NIDSAlertRecord.organization_id == organization_id,
            NIDSAlertRecord.network_scope_id == scope_id,
        )
    )
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NIDS alert not found.",
        )

    alert.status = payload.status
    db.commit()
    db.refresh(alert)
    return alert
