"""add jobs and audit logs tables

Revision ID: fa12b34cd56e
Revises: e9e0ccd8f860
Create Date: 2026-11-19 17:05:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'fa12b34cd56e'
down_revision: Union[str, Sequence[str], None] = 'e9e0ccd8f860'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=True),
        sa.Column('type', sa.String(length=64), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.String(length=32), server_default='QUEUED', nullable=False),
        sa.Column('attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('max_attempts', sa.Integer(), server_default='3', nullable=False),
        sa.Column('run_after', sa.DateTime(timezone=True), nullable=True),
        sa.Column('locked_by', sa.String(length=128), nullable=True),
        sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('timeout_s', sa.Integer(), server_default='60', nullable=False),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('idempotency_key', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DEAD')",
            name='ck_jobs_valid_status'
        ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name='fk_jobs_organization_id'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_jobs')),
        sa.UniqueConstraint('idempotency_key', name='uq_jobs_idempotency_key')
    )
    op.create_index('ix_jobs_status_run_after', 'jobs', ['status', 'run_after'], unique=False)
    op.create_index('ix_jobs_org_created', 'jobs', ['organization_id', 'created_at'], unique=False)

    # 2. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=True),
        sa.Column('actor_id', sa.Uuid(), nullable=True),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('target_type', sa.String(length=64), nullable=False),
        sa.Column('target_id', sa.String(length=128), nullable=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL', name='fk_audit_logs_organization_id'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_logs'))
    )
    op.create_index('ix_audit_logs_org_created', 'audit_logs', ['organization_id', 'created_at'], unique=False)
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)

    # 3. Create immutable trigger on audit_logs
    op.execute("""
        CREATE OR REPLACE FUNCTION block_audit_log_mutation()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'audit_logs is append-only: updates and deletes are forbidden';
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_audit_logs_immutable
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION block_audit_log_mutation();
    """)


def downgrade() -> None:
    op.execute("""
        DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
        DROP FUNCTION IF EXISTS block_audit_log_mutation();
    """)
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_org_created', table_name='audit_logs')
    op.drop_table('audit_logs')

    op.drop_index('ix_jobs_org_created', table_name='jobs')
    op.drop_index('ix_jobs_status_run_after', table_name='jobs')
    op.drop_table('jobs')
