"""add Firebase UID and make legacy password hash nullable

Revision ID: c17f4e92a6b1
Revises: ac71e47783f8
"""

import sqlalchemy as sa
from alembic import op


revision = "c17f4e92a6b1"
down_revision = "ac71e47783f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("firebase_uid", sa.String(length=128), nullable=True),
    )

    op.create_index(
        "uq_users_firebase_uid",
        "users",
        ["firebase_uid"],
        unique=True,
        postgresql_where=sa.text("firebase_uid IS NOT NULL"),
    )

    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    bind = op.get_bind()

    null_password_users = bind.execute(
        sa.text("SELECT COUNT(*) FROM users WHERE password_hash IS NULL")
    ).scalar_one()

    if null_password_users:
        raise RuntimeError(
            "Cannot downgrade: Firebase-only users exist without password hashes."
        )

    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )

    op.drop_index("uq_users_firebase_uid", table_name="users")
    op.drop_column("users", "firebase_uid")
