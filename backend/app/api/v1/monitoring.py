from dataclasses import asdict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, require_organization_permission
from backend.app.db.models.network_scopes import NetworkScope, NetworkScopeRange
from backend.app.schemas.monitoring import MonitoringStart, MonitoringStats
from backend.app.core.config import settings
from backend.app.services.monitoring.manager import MonitoringManager
from backend.app.services.monitoring.nids_alert_persistence import persist_nids_alert


router = APIRouter(
    prefix="/organizations/{organization_id}/network-scopes/{scope_id}/monitoring",
    tags=["NIDS Monitoring"],
)

monitoring_manager = MonitoringManager(settings.capture_allowed_interfaces)


def _scope_ranges(db: Session, organization_id: UUID, scope_id: UUID) -> list[str]:
    scope = db.scalar(select(NetworkScope).where(
        NetworkScope.id == scope_id,
        NetworkScope.organization_id == organization_id,
    ))
    if scope is None:
        raise HTTPException(status_code=404, detail="Network scope not found.")
    if scope.status != "active":
        raise HTTPException(status_code=409, detail="Only active network scopes can be monitored.")
    return [str(value) for value in db.scalars(select(NetworkScopeRange.cidr).where(
        NetworkScopeRange.organization_id == organization_id,
        NetworkScopeRange.network_scope_id == scope_id,
    )).all()]


def _stats(service) -> MonitoringStats:
    return MonitoringStats(**asdict(service.stats()))


@router.get("/interfaces", response_model=list[str])
def list_monitoring_interfaces(
    organization_id: UUID,
    scope_id: UUID,
    membership=Depends(require_organization_permission("observations.read")),
):
    try:
        import scapy.all as scapy
        raw_ifaces = scapy.get_if_list()
    except Exception:
        raw_ifaces = list(settings.capture_allowed_interfaces)
    available = [
        iface for iface in raw_ifaces
        if iface in settings.capture_allowed_interfaces
    ]
    return sorted(list(set(available or list(settings.capture_allowed_interfaces))))


@router.get("/status", response_model=MonitoringStats)
def monitoring_status(
    organization_id: UUID,
    scope_id: UUID,
    membership=Depends(require_organization_permission("observations.read")),
):
    service = monitoring_manager.get(organization_id, scope_id)
    if service is None:
        return MonitoringStats(
            status="stopped", interface=None, captured_packets=0,
            queued_packets=0, processed_packets=0, dropped_packets=0,
            ignored_packets=0, processing_errors=0, queue_size=0,
        )
    return _stats(service)


@router.post("/start", response_model=MonitoringStats, status_code=status.HTTP_201_CREATED)
def start_monitoring(
    organization_id: UUID,
    scope_id: UUID,
    payload: MonitoringStart,
    membership=Depends(require_organization_permission("monitoring.manage")),
    db: Session = Depends(get_db),
):
    networks = _scope_ranges(db, organization_id, scope_id)
    if not networks:
        raise HTTPException(status_code=409, detail="This scope has no approved CIDR ranges.")

    def handle_alert(alert):
        persist_nids_alert(alert, organization_id, scope_id)

    try:
        service = monitoring_manager.start(
            organization_id, scope_id, payload.interface.strip(), networks, handle_alert
        )
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to start packet capture.") from exc
    return _stats(service)


@router.post("/stop", response_model=MonitoringStats)
def stop_monitoring(
    organization_id: UUID,
    scope_id: UUID,
    membership=Depends(require_organization_permission("monitoring.manage")),
):
    try:
        stats = monitoring_manager.stop(organization_id, scope_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if stats is None:
        return monitoring_status(organization_id, scope_id, membership)
    return MonitoringStats(**asdict(stats))
