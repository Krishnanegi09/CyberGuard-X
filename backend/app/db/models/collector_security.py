import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Index,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class CollectorCredential(Base):
    """
    Hashed authentication credentials issued to a collector.

    Raw credential secrets must never be persisted.
    Multiple credentials per collector support safe rotation.
    """

    __tablename__ = "collector_credentials"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )

    collector_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )

    credential_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    label: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "collector_id"],
            ["collectors.organization_id", "collectors.id"],
            ondelete="RESTRICT",
            name="fk_collector_credentials_collector",
        ),
        UniqueConstraint(
            "credential_hash",
            name="uq_collector_credentials_hash",
        ),
        CheckConstraint(
            "length(credential_hash) = 64",
            name="valid_credential_hash_length",
        ),
        CheckConstraint(
            "expires_at IS NULL OR expires_at > created_at",
            name="credential_expiration_after_creation",
        ),
        Index(
            "ix_collector_credentials_organization_collector",
            "organization_id",
            "collector_id",
        ),
    )


class CollectorNetworkScope(Base):
    """
    Assigns collectors to network scopes within the same organization.

    Composite foreign keys prevent cross-organization assignments.
    """

    __tablename__ = "collector_network_scopes"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
    )

    collector_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
    )

    network_scope_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "collector_id"],
            ["collectors.organization_id", "collectors.id"],
            ondelete="RESTRICT",
            name="fk_collector_network_scopes_collector",
        ),
        ForeignKeyConstraint(
            ["organization_id", "network_scope_id"],
            ["network_scopes.organization_id", "network_scopes.id"],
            ondelete="RESTRICT",
            name="fk_collector_network_scopes_scope",
        ),
        Index(
            "ix_collector_network_scopes_scope",
            "organization_id",
            "network_scope_id",
        ),
    )
