import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import CIDR
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class NetworkScope(Base):
    __tablename__ = "network_scopes"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "id",
            name="uq_network_scopes_organization_id",
        ),
        UniqueConstraint(
            "organization_id",
            "name",
            name="uq_network_scopes_organization_name",
        ),
        CheckConstraint(
            "status IN ('active', 'disabled', 'archived')",
            name="valid_network_scope_status",
        ),
        Index(
            "ix_network_scopes_organization_status",
            "organization_id",
            "status",
        ),
    )


class NetworkScopeRange(Base):
    __tablename__ = "network_scope_ranges"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )

    network_scope_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )

    cidr: Mapped[str] = mapped_column(
        CIDR,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "network_scope_id"],
            ["network_scopes.organization_id", "network_scopes.id"],
            ondelete="RESTRICT",
            name="fk_network_scope_ranges_scope",
        ),
        UniqueConstraint(
            "network_scope_id",
            "cidr",
            name="uq_network_scope_ranges_scope_cidr",
        ),
        Index(
            "ix_network_scope_ranges_organization_scope",
            "organization_id",
            "network_scope_id",
        ),
    )