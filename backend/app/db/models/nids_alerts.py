import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Index,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class NIDSAlertRecord(Base):
    __tablename__ = "nids_alerts"

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

    rule_id: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    source_ip: Mapped[str] = mapped_column(
        String(45),
        nullable=False,
    )

    destination_ip: Mapped[str] = mapped_column(
        String(45),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    evidence: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="open",
        server_default="open",
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
            name="fk_nids_alerts_organization_scope",
        ),
        CheckConstraint(
            "severity IN ('low', 'medium', 'high', 'critical')",
            name="valid_nids_alert_severity",
        ),
        CheckConstraint(
            "status IN ('open', 'acknowledged', 'resolved')",
            name="valid_nids_alert_status",
        ),
        Index(
            "ix_nids_alerts_organization_scope_occurred",
            "organization_id",
            "network_scope_id",
            "occurred_at",
        ),
        Index(
            "ix_nids_alerts_organization_status_occurred",
            "organization_id",
            "status",
            "occurred_at",
        ),
    )
