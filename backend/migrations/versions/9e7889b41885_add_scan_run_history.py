
"""add scan run history

Revision ID: 9e7889b41885
Revises: a2cf1b0989db
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9e7889b41885"
down_revision: Union[str, Sequence[str], None] = "a2cf1b0989db"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scan_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("target", sa.String(255), nullable=False),
        sa.Column("scan_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.String(1000), nullable=True),
    )

    # Preserve existing observations without inventing historical scan IDs.
    op.add_column(
        "port_observations",
        sa.Column("scan_run_id", sa.Integer(), nullable=True),
    )

    op.create_index(
        "ix_port_observations_scan_run_id",
        "port_observations",
        ["scan_run_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_port_observations_scan_run_id_scan_runs",
        "port_observations",
        "scan_runs",
        ["scan_run_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_port_observations_scan_run_id_scan_runs",
        "port_observations",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_port_observations_scan_run_id",
        table_name="port_observations",
    )
    op.drop_column("port_observations", "scan_run_id")
    op.drop_table("scan_runs")
