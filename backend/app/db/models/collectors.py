import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class Collector(Base):
    __tablename__ = "collectors"

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

    platform: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    collector_version: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )

    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
            name="uq_collectors_organization_id",
        ),
        CheckConstraint(
            "status IN ('pending', 'active', 'offline', 'revoked')",
            name="valid_collector_status",
        ),
        CheckConstraint(
            "(status = 'revoked' AND revoked_at IS NOT NULL) "
            "OR (status != 'revoked' AND revoked_at IS NULL)",
            name="collector_revocation_consistency",
        ),
        Index(
            "ix_collectors_organization_status",
            "organization_id",
            "status",
        ),
    )


class CollectorHeartbeat(Base):
    __tablename__ = "collector_heartbeats"

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

    sequence_number: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    health_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "collector_id"],
            ["collectors.organization_id", "collectors.id"],
            ondelete="RESTRICT",
            name="fk_collector_heartbeats_collector",
        ),
        CheckConstraint(
            "sequence_number > 0",
            name="positive_heartbeat_sequence",
        ),
        CheckConstraint(
            "health_status IN ('healthy', 'degraded', 'unhealthy')",
            name="valid_collector_health_status",
        ),
        UniqueConstraint(
            "organization_id",
            "collector_id",
            "sequence_number",
            name="uq_collector_heartbeats_sequence",
        ),
        UniqueConstraint(
            "id",
            "organization_id",
            "collector_id",
            name="uq_collector_heartbeats_identity",
        ),
        Index(
            "ix_collector_heartbeats_organization_received",
            "organization_id",
            "received_at",
        ),
    )


class CollectorTelemetry(Base):
    """
    Operational health snapshot attached to one collector heartbeat.

    Stores counters and resource percentages only. Packet contents,
    credentials, and capture payloads do not belong here.
    """

    __tablename__ = "collector_telemetry"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    heartbeat_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )

    collector_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )

    cpu_percent: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )

    memory_percent: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )

    disk_percent: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )

    uptime_seconds: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    packets_observed: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    flows_observed: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    queue_depth: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    interface_name: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    note: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["heartbeat_id", "organization_id", "collector_id"],
            [
                "collector_heartbeats.id",
                "collector_heartbeats.organization_id",
                "collector_heartbeats.collector_id",
            ],
            ondelete="RESTRICT",
            name="fk_collector_telemetry_heartbeat",
        ),
        UniqueConstraint(
            "heartbeat_id",
            name="uq_collector_telemetry_heartbeat",
        ),
        CheckConstraint(
            "cpu_percent IS NULL OR "
            "(cpu_percent >= 0 AND cpu_percent <= 100)",
            name="valid_telemetry_cpu_percent",
        ),
        CheckConstraint(
            "memory_percent IS NULL OR "
            "(memory_percent >= 0 AND memory_percent <= 100)",
            name="valid_telemetry_memory_percent",
        ),
        CheckConstraint(
            "disk_percent IS NULL OR "
            "(disk_percent >= 0 AND disk_percent <= 100)",
            name="valid_telemetry_disk_percent",
        ),
        CheckConstraint(
            "uptime_seconds IS NULL OR "
            "(uptime_seconds >= 0 AND uptime_seconds <= 315360000)",
            name="valid_telemetry_uptime",
        ),
        CheckConstraint(
            "packets_observed IS NULL OR "
            "(packets_observed >= 0 AND packets_observed <= 1000000000000000)",
            name="valid_telemetry_packets",
        ),
        CheckConstraint(
            "flows_observed IS NULL OR "
            "(flows_observed >= 0 AND flows_observed <= 1000000000000000)",
            name="valid_telemetry_flows",
        ),
        CheckConstraint(
            "queue_depth IS NULL OR "
            "(queue_depth >= 0 AND queue_depth <= 10000000)",
            name="valid_telemetry_queue_depth",
        ),
        Index(
            "ix_collector_telemetry_organization_collector",
            "organization_id",
            "collector_id",
        ),
    )
