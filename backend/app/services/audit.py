import uuid
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.app.db.models.audit import AuditLogRecord


def log_audit_event(
    db: Session,
    action: str,
    target_type: str,
    organization_id: Optional[uuid.UUID] = None,
    actor_id: Optional[uuid.UUID] = None,
    target_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> AuditLogRecord:
    record = AuditLogRecord(
        organization_id=organization_id,
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        payload=payload or {},
    )
    db.add(record)
    db.flush()
    return record
