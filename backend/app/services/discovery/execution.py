import hashlib
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from backend.app.db.models.network_scopes import (
    NetworkScope,
    NetworkScopeRange,
)
from backend.app.db.models.observations import ScanRun
from backend.app.db.session import SessionLocal
from backend.app.services.discovery.nmap_runner import run_nmap_scan
from backend.app.services.discovery.persistence import persist_scan_results
from backend.app.services.discovery.target_validation import (
    ScanProfile,
    build_nmap_arguments,
    validate_target,
)

logger = logging.getLogger(__name__)


def execute_discovery_scan(scan_run_id: int) -> None:
    """
    Execute one queued scan using an independent database session.

    Scan results and the completed status are committed atomically.
    """
    db = SessionLocal()

    try:
        scan_run = db.scalar(
            select(ScanRun)
            .where(ScanRun.id == scan_run_id)
            .with_for_update()
        )

        if scan_run is None or scan_run.status != "queued":
            return

        scan_run.status = "running"
        scan_run.started_at = datetime.now(timezone.utc)
        db.commit()

        scan_run = db.get(ScanRun, scan_run_id)
        if scan_run is None:
            return

        scope = db.scalar(
            select(NetworkScope).where(
                NetworkScope.id == scan_run.network_scope_id,
                NetworkScope.organization_id == scan_run.organization_id,
            )
        )

        if scope is None or scope.status != "active":
            raise RuntimeError("The approved network scope is no longer active.")

        ranges = db.scalars(
            select(NetworkScopeRange.cidr).where(
                NetworkScopeRange.organization_id == scan_run.organization_id,
                NetworkScopeRange.network_scope_id == scan_run.network_scope_id,
            )
        ).all()

        if not ranges:
            raise RuntimeError("The network scope has no approved CIDR ranges.")

        profile = ScanProfile[scan_run.scan_type]

        # Revalidate authorization immediately before executing Nmap.
        validated_target = validate_target(
            scan_run.target,
            [str(cidr) for cidr in ranges],
            profile,
        )

        result = run_nmap_scan(validated_target)

        persist_scan_results(db, scan_run, result)

        scan_run.status = "completed"
        scan_run.completed_at = datetime.now(timezone.utc)
        scan_run.error_message = None

        db.commit()

    except Exception:
        db.rollback()
        logger.exception(
            "Discovery scan %s failed.",
            scan_run_id,
        )

        try:
            failed_run = db.get(ScanRun, scan_run_id)

            if failed_run is not None and failed_run.status in {
                "queued",
                "running",
            }:
                failed_run.status = "failed"
                failed_run.completed_at = datetime.now(timezone.utc)
                failed_run.error_message = (
                    "Scan execution failed. Review backend logs."
                )
                db.commit()

        except Exception:
            db.rollback()
            logger.exception(
                "Unable to persist failure status for scan %s.",
                scan_run_id,
            )

    finally:
        db.close()
