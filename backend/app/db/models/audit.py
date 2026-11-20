import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class AuditLogRecord(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )

    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        nullable=True,
    )

    action: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    target_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    target_id: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )

    payload: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        Index("ix_audit_logs_org_created", "organization_id", "created_at"),
        Index("ix_audit_logs_action", "action"),
    )
