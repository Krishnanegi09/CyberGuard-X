from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.deps import (
    get_db,
    require_organization_permission,
)
from backend.app.db.models.network_scopes import (
    NetworkScope,
    NetworkScopeRange,
)
from backend.app.schemas.network_scopes import (
    NetworkScopeCreate,
    NetworkScopePublic,
    NetworkScopeStatusUpdate,
)

router = APIRouter(
    prefix="/organizations/{organization_id}/network-scopes",
    tags=["Network Scopes"],
)


def serialize_scope(
    scope: NetworkScope,
    ranges: list[NetworkScopeRange],
) -> NetworkScopePublic:
    return NetworkScopePublic(
        id=scope.id,
        organization_id=scope.organization_id,
        name=scope.name,
        description=scope.description,
        status=scope.status,
        cidr_ranges=sorted(str(item.cidr) for item in ranges),
        created_at=scope.created_at,
        updated_at=scope.updated_at,
    )


@router.post(
    "",
    response_model=NetworkScopePublic,
    status_code=status.HTTP_201_CREATED,
)
def create_network_scope(
    organization_id: UUID,
    payload: NetworkScopeCreate,
    membership=Depends(
        require_organization_permission("network_scopes.manage")
    ),
    db: Session = Depends(get_db),
):
    try:
        scope = NetworkScope(
            organization_id=organization_id,
            name=payload.name,
            description=payload.description,
            status="active",
        )
        db.add(scope)
        db.flush()

        ranges = [
            NetworkScopeRange(
                organization_id=organization_id,
                network_scope_id=scope.id,
                cidr=cidr,
            )
            for cidr in payload.cidr_ranges
        ]
        db.add_all(ranges)

        db.commit()
        db.refresh(scope)

        return serialize_scope(scope, ranges)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A network scope with this name or one of these "
                "CIDR ranges already exists in this organization."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise


@router.get(
    "",
    response_model=list[NetworkScopePublic],
)
def list_network_scopes(
    organization_id: UUID,
    membership=Depends(
        require_organization_permission("assets.read")
    ),
    db: Session = Depends(get_db),
):
    scopes = db.scalars(
        select(NetworkScope)
        .where(NetworkScope.organization_id == organization_id)
        .order_by(NetworkScope.created_at.desc())
    ).all()

    if not scopes:
        return []

    scope_ids = [scope.id for scope in scopes]

    ranges = db.scalars(
        select(NetworkScopeRange).where(
            NetworkScopeRange.organization_id == organization_id,
            NetworkScopeRange.network_scope_id.in_(scope_ids),
        )
    ).all()

    ranges_by_scope: dict[UUID, list[NetworkScopeRange]] = {
        scope_id: [] for scope_id in scope_ids
    }

    for network_range in ranges:
        ranges_by_scope[network_range.network_scope_id].append(
            network_range
        )

    return [
        serialize_scope(scope, ranges_by_scope[scope.id])
        for scope in scopes
    ]


@router.patch(
    "/{scope_id}/status",
    response_model=NetworkScopePublic,
)
def update_network_scope_status(
    organization_id: UUID,
    scope_id: UUID,
    payload: NetworkScopeStatusUpdate,
    membership=Depends(
        require_organization_permission("network_scopes.manage")
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

    scope.status = payload.status

    try:
        db.commit()
        db.refresh(scope)

        ranges = db.scalars(
            select(NetworkScopeRange).where(
                NetworkScopeRange.organization_id == organization_id,
                NetworkScopeRange.network_scope_id == scope.id,
            )
        ).all()

        return serialize_scope(scope, ranges)

    except Exception:
        db.rollback()
        raise
