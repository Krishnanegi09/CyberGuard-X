from datetime import datetime
import uuid

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=True,
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    hostname: Mapped[str | None] = mapped_column(String(255))
    operating_system: Mapped[str | None] = mapped_column(String(255))
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_assets_id", "id"),
        Index("ix_assets_ip_address", "ip_address"),
        Index("ix_assets_organization_ip", "organization_id", "ip_address"),
    )


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    network_scope_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    target: Mapped[str] = mapped_column(String(255), nullable=False)
    scan_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(String(1000))
    scanner_name: Mapped[str | None] = mapped_column(String(50))
    scanner_version: Mapped[str | None] = mapped_column(String(50))
    scan_arguments: Mapped[str | None] = mapped_column(String(1000))
    port_scope: Mapped[str | None] = mapped_column(String(100))
    configuration_hash: Mapped[str | None] = mapped_column(String(64))

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "network_scope_id"],
            ["network_scopes.organization_id", "network_scopes.id"],
            ondelete="RESTRICT",
            name="fk_scan_runs_organization_scope",
        ),
        CheckConstraint(
            "(organization_id IS NULL AND network_scope_id IS NULL) OR "
            "(organization_id IS NOT NULL AND network_scope_id IS NOT NULL)",
            name="scan_run_scope_consistency",
        ),
        Index("ix_scan_runs_organization_started", "organization_id", "started_at"),
    )


class PortObservation(Base):
    __tablename__ = "port_observations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    protocol: Mapped[str] = mapped_column(String(10), nullable=False)
    service: Mapped[str | None] = mapped_column(String(100))
    product: Mapped[str | None] = mapped_column(String(255))
    version: Mapped[str | None] = mapped_column(String(100))
    detection_method: Mapped[str] = mapped_column(String(100), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    scan_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("scan_runs.id", ondelete="CASCADE"), nullable=True
    )

    __table_args__ = (
        CheckConstraint("port BETWEEN 1 AND 65535", name="valid_observed_port"),
        CheckConstraint("protocol IN ('tcp', 'udp')", name="valid_observed_protocol"),
        Index("ix_port_observations_asset_id", "asset_id"),
        Index("ix_port_observations_scan_run_id", "scan_run_id"),
    )
