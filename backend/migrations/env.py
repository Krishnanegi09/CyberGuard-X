import os
from pathlib import Path
import sys

from alembic import context
from sqlalchemy import create_engine, pool

PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.db.base import Base
import backend.app.db.models  # noqa: F401 - registers all model classes


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    from backend.app.core.config import settings
    return settings.database_url


config = context.config


target_metadata = Base.metadata


def include_name(name, type_, parent_names):
    """
    Include only tables represented by current application metadata.

    Legacy tables are excluded from autogeneration until their models
    and tenant ownership have been formally reconciled.
    """
    if type_ == "table":
        return name in target_metadata.tables

    return True


def run_migrations_offline():
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_name=include_name,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = create_engine(
        get_database_url(),
        poolclass=pool.NullPool,
    )

    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
                include_name=include_name,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
