"""add collector telemetry

Revision ID: d8c4a1e07b22
Revises: 1f81ffbc6e67
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8c4a1e07b22"
down_revision: Union[str, Sequence[str], None] = "1f81ffbc6e67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_collector_heartbeats_identity",
        "collector_heartbeats",
        ["id", "organization_id", "collector_id"],
    )
    op.create_table(
        "collector_telemetry",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("heartbeat_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("collector_id", sa.Uuid(), nullable=False),
        sa.Column("cpu_percent", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("memory_percent", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("disk_percent", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("uptime_seconds", sa.BigInteger(), nullable=True),
        sa.Column("packets_observed", sa.BigInteger(), nullable=True),
        sa.Column("flows_observed", sa.BigInteger(), nullable=True),
        sa.Column("queue_depth", sa.Integer(), nullable=True),
        sa.Column("interface_name", sa.String(length=64), nullable=True),
        sa.Column("note", sa.String(length=200), nullable=True),
        sa.CheckConstraint(
            "cpu_percent IS NULL OR (cpu_percent >= 0 AND cpu_percent <= 100)",
            name=op.f("ck_collector_telemetry_valid_telemetry_cpu_percent"),
        ),
        sa.CheckConstraint(
            "memory_percent IS NULL OR (memory_percent >= 0 AND memory_percent <= 100)",
            name=op.f("ck_collector_telemetry_valid_telemetry_memory_percent"),
        ),
        sa.CheckConstraint(
            "disk_percent IS NULL OR (disk_percent >= 0 AND disk_percent <= 100)",
            name=op.f("ck_collector_telemetry_valid_telemetry_disk_percent"),
        ),
        sa.CheckConstraint(
            "uptime_seconds IS NULL OR (uptime_seconds >= 0 AND uptime_seconds <= 315360000)",
            name=op.f("ck_collector_telemetry_valid_telemetry_uptime"),
        ),
        sa.CheckConstraint(
            "packets_observed IS NULL OR (packets_observed >= 0 AND packets_observed <= 1000000000000000)",
            name=op.f("ck_collector_telemetry_valid_telemetry_packets"),
        ),
        sa.CheckConstraint(
            "flows_observed IS NULL OR (flows_observed >= 0 AND flows_observed <= 1000000000000000)",
            name=op.f("ck_collector_telemetry_valid_telemetry_flows"),
        ),
        sa.CheckConstraint(
            "queue_depth IS NULL OR (queue_depth >= 0 AND queue_depth <= 10000000)",
            name=op.f("ck_collector_telemetry_valid_telemetry_queue_depth"),
        ),
        sa.ForeignKeyConstraint(
            ["heartbeat_id", "organization_id", "collector_id"],
            [
                "collector_heartbeats.id",
                "collector_heartbeats.organization_id",
                "collector_heartbeats.collector_id",
            ],
            name="fk_collector_telemetry_heartbeat",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_collector_telemetry")),
        sa.UniqueConstraint(
            "heartbeat_id",
            name="uq_collector_telemetry_heartbeat",
        ),
    )
    op.create_index(
        "ix_collector_telemetry_organization_collector",
        "collector_telemetry",
        ["organization_id", "collector_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_collector_telemetry_organization_collector",
        table_name="collector_telemetry",
    )
    op.drop_table("collector_telemetry")
    op.drop_constraint(
        "uq_collector_heartbeats_identity",
        "collector_heartbeats",
        type_="unique",
    )
