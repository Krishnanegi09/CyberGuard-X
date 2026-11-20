"""add monitoring management permission

Revision ID: 1f81ffbc6e67
Revises: 4b741a6d1f7a
"""

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert


revision = "1f81ffbc6e67"
down_revision = "4b741a6d1f7a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    permissions = sa.table(
        "permissions",
        sa.column("id", sa.Uuid()),
        sa.column("code", sa.String(100)),
        sa.column("name", sa.String(120)),
        sa.column("description", sa.String(255)),
    )

    roles = sa.table(
        "roles",
        sa.column("id", sa.Uuid()),
        sa.column("organization_id", sa.Uuid()),
        sa.column("name", sa.String(80)),
    )

    role_permissions = sa.table(
        "role_permissions",
        sa.column("organization_id", sa.Uuid()),
        sa.column("role_id", sa.Uuid()),
        sa.column("permission_id", sa.Uuid()),
    )

    connection = op.get_bind()

    connection.execute(
        insert(permissions)
        .values(
            id=uuid.uuid4(),
            code="monitoring.manage",
            name="Manage monitoring",
            description=(
                "Start, inspect, and stop authorized live network "
                "monitoring sessions."
            ),
        )
        .on_conflict_do_nothing(
            index_elements=["code"],
        )
    )

    permission_id = connection.execute(
        sa.select(permissions.c.id).where(
            permissions.c.code == "monitoring.manage"
        )
    ).scalar_one()

    existing_roles = connection.execute(
        sa.select(
            roles.c.organization_id,
            roles.c.id,
        ).where(
            roles.c.name.in_(["Owner", "Admin"])
        )
    ).all()

    if existing_roles:
        connection.execute(
            insert(role_permissions)
            .values([
                {
                    "organization_id": role.organization_id,
                    "role_id": role.id,
                    "permission_id": permission_id,
                }
                for role in existing_roles
            ])
            .on_conflict_do_nothing()
        )


def downgrade() -> None:
    permissions = sa.table(
        "permissions",
        sa.column("id", sa.Uuid()),
        sa.column("code", sa.String(100)),
    )

    role_permissions = sa.table(
        "role_permissions",
        sa.column("permission_id", sa.Uuid()),
    )

    connection = op.get_bind()

    permission_id = connection.execute(
        sa.select(permissions.c.id).where(
            permissions.c.code == "monitoring.manage"
        )
    ).scalar_one_or_none()

    if permission_id is not None:
        connection.execute(
            sa.delete(role_permissions).where(
                role_permissions.c.permission_id == permission_id
            )
        )

        connection.execute(
            sa.delete(permissions).where(
                permissions.c.id == permission_id
            )
        )
