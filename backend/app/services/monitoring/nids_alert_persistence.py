import logging
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from backend.app.db.models.nids_alerts import NIDSAlertRecord
from backend.app.db.session import SessionLocal
from backend.app.services.monitoring.nids_engine import NIDSAlert

logger = logging.getLogger(__name__)


def persist_nids_alert(
    alert: NIDSAlert,
    organization_id: UUID,
    network_scope_id: UUID,
    *,
    session_factory: sessionmaker = SessionLocal,
) -> None:
    """
    Persist one NIDS alert using an independent database session.

    Organization and scope identifiers must come from the
    server-authorized monitoring session, never from packet data.
    """
    db = session_factory()

    try:
        record = NIDSAlertRecord(
            organization_id=organization_id,
            network_scope_id=network_scope_id,
            rule_id=alert.rule_id,
            name=alert.name,
            severity=alert.severity,
            occurred_at=alert.occurred_at,
            source_ip=alert.source_ip,
            destination_ip=alert.destination_ip,
            description=alert.description,
            evidence=alert.evidence,
            status="open",
        )

        db.add(record)
        db.commit()

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Failed to persist NIDS alert %s for organization %s.",
            alert.alert_id,
            organization_id,
        )
        raise

    finally:
        db.close()
