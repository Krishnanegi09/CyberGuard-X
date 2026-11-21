from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user, get_db
from backend.app.db.models.access_control import (
    Membership,
    MembershipRole,
    Permission,
    Role,
    RolePermission,
)
from backend.app.db.models.organizations import Organization
from backend.app.db.models.users import User
from backend.app.schemas.organizations import (
    OrganizationCreate,
    OrganizationPublic,
)

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"],
)


@router.get(
    "",
    response_model=list[OrganizationPublic],
)
def list_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List active organizations for the authenticated user's
    active memberships only.
    """

    return db.scalars(
        select(Organization)
        .join(
            Membership,
            Membership.organization_id == Organization.id,
        )
        .where(
            Membership.user_id == current_user.id,
            Membership.status == "active",
            Organization.is_active.is_(True),
        )
        .order_by(Organization.created_at.desc())
    ).all()


# This is the authoritative permission catalog.
# The frontend must never define or grant permissions.
PERMISSION_CATALOG = {
    "organization.read": (
        "Read organization",
        "View organization information and settings.",
    ),
    "organization.update": (
        "Update organization",
        "Update organization-level settings.",
    ),
    "organization.members.manage": (
        "Manage members",
        "Invite, suspend, and manage organization memberships.",
    ),
    "organization.roles.manage": (
        "Manage roles",
        "Manage organization roles and role assignments.",
    ),
    "network_scopes.manage": (
        "Manage network scopes",
        "Create and manage explicitly authorized network scopes.",
    ),
    "discovery.run": (
        "Run discovery",
        "Execute discovery within approved network scopes.",
    ),
    "assets.read": (
        "Read assets",
        "View discovered network assets.",
    ),
    "observations.read": (
        "Read observations",
        "View security observations and scan results.",
    ),
    "collectors.manage": (
        "Manage collectors",
        "Manage organization discovery collectors.",
    ),
    "monitoring.manage": (
        "Manage monitoring",
        "Start, inspect, and stop authorized live network monitoring sessions.",
    ),
}


ROLE_DEFINITIONS = {
    "Owner": {
        "description": "Full organization and security administration.",
        "permissions": set(PERMISSION_CATALOG),
    },
    "Admin": {
        "description": (
            "Organization, member, network-scope, collector, and "
            "monitoring administration without owner-level role "
            "management or discovery execution."
        ),
        "permissions": {
            "organization.read",
            "organization.update",
            "organization.members.manage",
            "network_scopes.manage",
            "assets.read",
            "observations.read",
            "collectors.manage",
            "monitoring.manage",
        },
    },
    "Analyst": {
        "description": (
            "Run authorized discovery and read security observations."
        ),
        "permissions": {
            "discovery.run",
            "assets.read",
            "observations.read",
        },
    },
    "Viewer": {
        "description": "Read-only access to assets and observations.",
        "permissions": {
            "assets.read",
            "observations.read",
        },
    },
}


@router.post(
    "",
    response_model=OrganizationPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_organization(
    payload: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create an organization and provision its initial access-control system.

    The organization creator receives an active membership and the Owner
    role. All provisioning operations are committed atomically.
    """

    try:
        organization = Organization(
            name=payload.name,
            slug=payload.slug,
            is_active=True,
        )
        db.add(organization)
        db.flush()

        membership = Membership(
            organization_id=organization.id,
            user_id=current_user.id,
            status="active",
        )
        db.add(membership)
        db.flush()

        roles = {}

        for role_name, definition in ROLE_DEFINITIONS.items():
            role = Role(
                organization_id=organization.id,
                name=role_name,
                description=definition["description"],
                is_system=True,
            )
            db.add(role)
            roles[role_name] = role

        db.flush()

        # Insert centrally defined permissions without racing against
        # another organization being provisioned concurrently.
        permission_rows = [
            {
                "code": code,
                "name": name,
                "description": description,
            }
            for code, (name, description) in PERMISSION_CATALOG.items()
        ]

        permission_insert = (
            insert(Permission)
            .values(permission_rows)
            .on_conflict_do_nothing(
                index_elements=[Permission.code]
            )
        )
        db.execute(permission_insert)

        permissions = db.scalars(
            select(Permission).where(
                Permission.code.in_(PERMISSION_CATALOG.keys())
            )
        ).all()

        permission_map = {
            permission.code: permission
            for permission in permissions
        }

        if set(permission_map) != set(PERMISSION_CATALOG):
            raise RuntimeError(
                "Permission catalog provisioning was incomplete."
            )

        role_permission_rows = []

        for role_name, definition in ROLE_DEFINITIONS.items():
            for permission_code in definition["permissions"]:
                role_permission_rows.append(
                    RolePermission(
                        organization_id=organization.id,
                        role_id=roles[role_name].id,
                        permission_id=permission_map[
                            permission_code
                        ].id,
                    )
                )

        db.add_all(role_permission_rows)

        # The creator receives exactly one initial system role: Owner.
        db.add(
            MembershipRole(
                organization_id=organization.id,
                membership_id=membership.id,
                role_id=roles["Owner"].id,
            )
        )

        db.commit()
        db.refresh(organization)

        return organization

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Organization creation conflict. "
                "The organization slug may already be in use."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise


@router.get(
    "/{organization_id}/assets",
)
def list_organization_assets(
    organization_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from backend.app.db.models.observations import Asset, PortObservation
    try:
        org_uuid = UUID(organization_id)
    except ValueError:
        return []

    assets = db.scalars(
        select(Asset).where(Asset.organization_id == org_uuid)
    ).all()

    result = []
    for asset in assets:
        ports = db.scalars(
            select(PortObservation).where(PortObservation.asset_id == asset.id)
        ).all()
        result.append({
            "id": asset.id,
            "ip_address": asset.ip_address,
            "hostname": asset.hostname,
            "operating_system": asset.operating_system,
            "first_seen": asset.first_seen.isoformat() if asset.first_seen else None,
            "last_seen": asset.last_seen.isoformat() if asset.last_seen else None,
            "ports": [
                {
                    "port": p.port,
                    "protocol": p.protocol,
                    "service": p.service,
                    "product": p.product,
                    "version": p.version,
                    "detection_method": p.detection_method,
                }
                for p in ports
            ],
        })
    return result


@router.get(
    "/{organization_id}/audit-logs",
)
def list_organization_audit_logs(
    organization_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from backend.app.db.models.audit import AuditLogRecord
    try:
        org_uuid = UUID(organization_id)
    except ValueError:
        return []

    logs = db.scalars(
        select(AuditLogRecord)
        .where(AuditLogRecord.organization_id == org_uuid)
        .order_by(AuditLogRecord.created_at.desc())
        .limit(100)
    ).all()
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "actor_id": str(log.actor_id) if log.actor_id else None,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "payload": log.payload,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


@router.get(
    "/{organization_id}/jobs",
)
def list_organization_jobs(
    organization_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from backend.app.db.models.jobs import JobRecord
    try:
        org_uuid = UUID(organization_id)
    except ValueError:
        return []

    jobs = db.scalars(
        select(JobRecord)
        .where(JobRecord.organization_id == org_uuid)
        .order_by(JobRecord.created_at.desc())
        .limit(50)
    ).all()
    return [
        {
            "id": str(j.id),
            "type": j.type,
            "payload": j.payload,
            "status": j.status,
            "attempts": j.attempts,
            "max_attempts": j.max_attempts,
            "timeout_s": j.timeout_s,
            "last_error": j.last_error,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "finished_at": j.finished_at.isoformat() if j.finished_at else None,
        }
        for j in jobs
    ]
