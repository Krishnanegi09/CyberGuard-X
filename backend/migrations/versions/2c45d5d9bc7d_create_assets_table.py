"""create assets table

Revision ID: 2c45d5d9bc7d
Revises:
Create Date: 2026-10-24 20:19:22.463752

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c45d5d9bc7d'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=False),
        sa.Column("hostname", sa.String(length=255), nullable=True),
        sa.Column("operating_system", sa.String(length=255), nullable=True),
        sa.Column(
            "first_seen",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_assets_id", "assets", ["id"], unique=False)
    op.create_index(
        "ix_assets_ip_address",
        "assets",
        ["ip_address"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_assets_ip_address", table_name="assets")
    op.drop_index("ix_assets_id", table_name="assets")
    op.drop_table("assets")
