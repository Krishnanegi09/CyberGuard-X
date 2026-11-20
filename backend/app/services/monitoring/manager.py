from __future__ import annotations

import re
from collections.abc import Callable, Iterable
from threading import Lock
from uuid import UUID

from backend.app.services.monitoring.capture_service import PacketCaptureService

SAFE_IFACE_PATTERN = re.compile(r"^[a-zA-Z0-9_\-\.]{1,32}$")


def get_system_interfaces(additional_allowed: Iterable[str] = ()) -> list[str]:
    """Scan and return all sanitized local network interfaces available on the host."""
    found: set[str] = set()
    try:
        import scapy.all as scapy
        for iface in scapy.get_if_list():
            iface_str = str(iface).strip()
            if SAFE_IFACE_PATTERN.match(iface_str):
                found.add(iface_str)
    except Exception:
        pass

    for iface in additional_allowed:
        iface_str = str(iface).strip()
        if SAFE_IFACE_PATTERN.match(iface_str):
            found.add(iface_str)

    if not found:
        found.update(["en0", "lo0"])

    return sorted(list(found))


class MonitoringManager:
    """Owns one scope-bound capture service per organization and scope."""

    def __init__(
        self,
        allowed_interfaces: Iterable[str] = ("en0",),
        service_factory: Callable[..., PacketCaptureService] = PacketCaptureService,
    ) -> None:
        interfaces = frozenset(
            interface.strip()
            for interface in allowed_interfaces
            if isinstance(interface, str) and interface.strip()
        )
        if not interfaces:
            raise ValueError("At least one allowed capture interface is required")

        self._lock = Lock()
        self._allowed_interfaces = interfaces
        self._service_factory = service_factory
        self._services: dict[tuple[UUID, UUID], PacketCaptureService] = {}

    def get_allowed_interfaces(self) -> frozenset[str]:
        return self._allowed_interfaces

    def start(
        self,
        organization_id: UUID,
        scope_id: UUID,
        interface: str,
        networks: list[str],
        alert_handler,
    ) -> PacketCaptureService:
        key = (organization_id, scope_id)
        with self._lock:
            if key in self._services:
                raise RuntimeError("Monitoring is already running for this scope.")

            clean_interface = interface.strip()
            if clean_interface not in self._allowed_interfaces:
                raise ValueError(f"Interface {clean_interface!r} is not authorized")

            service = self._service_factory(
                allowed_interfaces=self._allowed_interfaces,
                alert_handler=alert_handler,
            )
            service.start(clean_interface, networks)
            self._services[key] = service
            return service

    def get(self, organization_id: UUID, scope_id: UUID):
        with self._lock:
            return self._services.get((organization_id, scope_id))

    def stop(self, organization_id: UUID, scope_id: UUID):
        key = (organization_id, scope_id)
        with self._lock:
            service = self._services.pop(key, None)
        if service is None:
            return None
        return service.stop()


monitoring_manager = MonitoringManager()
