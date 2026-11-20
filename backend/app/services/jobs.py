import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.db.models.jobs import JobRecord


def enqueue_job(
    db: Session,
    type: str,
    payload: Dict[str, Any],
    organization_id: Optional[uuid.UUID] = None,
    max_attempts: int = 3,
    run_after: Optional[datetime] = None,
    timeout_s: int = 60,
    idempotency_key: Optional[str] = None,
) -> JobRecord:
    if idempotency_key:
        existing = db.execute(
            select(JobRecord).where(JobRecord.idempotency_key == idempotency_key)
        ).scalar_one_or_none()
        if existing:
            return existing

    job = JobRecord(
        organization_id=organization_id,
        type=type,
        payload=payload,
        status="QUEUED",
        attempts=0,
        max_attempts=max_attempts,
        run_after=run_after or datetime.now(timezone.utc),
        timeout_s=timeout_s,
        idempotency_key=idempotency_key,
    )
    db.add(job)
    db.flush()
    return job


def claim_job(db: Session, worker_id: str) -> Optional[JobRecord]:
    """
    Claim the next available QUEUED job using FOR UPDATE SKIP LOCKED.
    """
    now = datetime.now(timezone.utc)
    # Using SQL for atomic SKIP LOCKED claim
    claim_sql = text("""
        UPDATE jobs
        SET status = 'RUNNING',
            locked_by = :worker_id,
            locked_at = :now
        WHERE id = (
            SELECT id FROM jobs
            WHERE status = 'QUEUED'
              AND (run_after IS NULL OR run_after <= :now)
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        RETURNING id;
    """)
    result = db.execute(claim_sql, {"worker_id": worker_id, "now": now}).fetchone()
    if not result:
        return None

    job_id = result[0]
    job = db.get(JobRecord, job_id)
    if job:
        db.refresh(job)
    return job


def complete_job(db: Session, job_id: uuid.UUID) -> Optional[JobRecord]:
    job = db.get(JobRecord, job_id)
    if not job:
        return None
    job.status = "COMPLETED"
    job.finished_at = datetime.now(timezone.utc)
    job.locked_by = None
    job.locked_at = None
    db.flush()
    return job


def fail_job(
    db: Session,
    job_id: uuid.UUID,
    error_message: str,
    base_backoff_s: int = 2,
) -> Optional[JobRecord]:
    job = db.get(JobRecord, job_id)
    if not job:
        return None

    job.attempts += 1
    job.last_error = error_message
    job.locked_by = None
    job.locked_at = None

    if job.attempts >= job.max_attempts:
        job.status = "DEAD"
        job.finished_at = datetime.now(timezone.utc)
    else:
        job.status = "QUEUED"
        delay = base_backoff_s * int(math.pow(2, job.attempts - 1))
        job.run_after = datetime.now(timezone.utc) + timedelta(seconds=delay)

    db.flush()
    return job


def reap_stale_jobs(db: Session) -> List[JobRecord]:
    """
    Find RUNNING jobs whose locked_at is older than timeout_s and reset or fail them.
    """
    now = datetime.now(timezone.utc)
    stale_sql = text("""
        SELECT id FROM jobs
        WHERE status = 'RUNNING'
          AND locked_at IS NOT NULL
          AND locked_at + (timeout_s || ' seconds')::interval < :now
        FOR UPDATE SKIP LOCKED;
    """)
    stale_rows = db.execute(stale_sql, {"now": now}).fetchall()
    reaped = []
    for row in stale_rows:
        job = db.get(JobRecord, row[0])
        if job:
            job.attempts += 1
            job.locked_by = None
            job.locked_at = None
            if job.attempts >= job.max_attempts:
                job.status = "DEAD"
                job.finished_at = now
                job.last_error = "Reaped: job lock expired and exceeded maximum attempts"
            else:
                job.status = "QUEUED"
                job.last_error = "Reaped: job lock timed out, rescheduled"
            reaped.append(job)
    db.flush()
    return reaped
