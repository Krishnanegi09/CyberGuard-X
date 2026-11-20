from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock
from uuid import uuid4

from backend.app.services.monitoring.packet_parser import PacketObservation


@dataclass(frozen=True, slots=True)
class NIDSAlert:
    alert_id: str
    rule_id: str
    name: str
    severity: str
    occurred_at: datetime
    source_ip: str
    destination_ip: str
    description: str
    evidence: str


@dataclass(frozen=True, slots=True)
class NIDSConfig:
    syn_scan_ports: int = 12
    udp_scan_ports: int = 15
    port_sweep_hosts: int = 8

    syn_window_seconds: int = 10
    udp_window_seconds: int = 15
    sweep_window_seconds: int = 20

    alert_cooldown_seconds: int = 30
    max_tracked_sources: int = 10000


class NIDSEngine:
    """
    Lightweight, metadata-only network intrusion detection engine.

    Detects:
      - TCP SYN port scanning
      - UDP port scanning
      - TCP/UDP port sweeping

    Only PacketObservation metadata is processed.
    Packet payloads are never accessed or stored.
    """

    def __init__(self, config: NIDSConfig | None = None) -> None:
        self.config = config or NIDSConfig()

        if (
            self.config.syn_scan_ports < 2
            or self.config.udp_scan_ports < 2
            or self.config.port_sweep_hosts < 2
            or self.config.max_tracked_sources < 1
            or self.config.alert_cooldown_seconds < 0
        ):
            raise ValueError("Invalid NIDS configuration")

        self._lock = Lock()

        # source IP -> recent packet metadata
        self._events: dict[
            str, deque[tuple[float, str, int | None, str, int | None]]
        ] = {}

        # rule/source/destination -> last alert timestamp
        self._last_alert: dict[tuple[str, str, str], float] = {}

        self._alerts_generated = 0
        self._observations_processed = 0

    def process(
        self, observation: PacketObservation
    ) -> tuple[NIDSAlert, ...]:
        """
        Process one real packet observation and return new alerts.
        """

        if observation.transport_protocol not in ("tcp", "udp"):
            return ()

        if observation.source_port is not None and not (
            0 <= observation.source_port <= 65535
        ):
            return ()

        if observation.destination_port is not None and not (
            0 <= observation.destination_port <= 65535
        ):
            return ()

        timestamp = observation.captured_at.timestamp()

        if timestamp < 0:
            return ()

        source = observation.source_ip
        destination = observation.destination_ip

        with self._lock:
            self._observations_processed += 1

            if source not in self._events:
                if len(self._events) >= self.config.max_tracked_sources:
                    oldest_source = next(iter(self._events))
                    del self._events[oldest_source]

                self._events[source] = deque()

            events = self._events[source]

            events.append(
                (
                    timestamp,
                    destination,
                    observation.destination_port,
                    observation.transport_protocol,
                    observation.tcp_flags,
                )
            )

            max_window = max(
                self.config.syn_window_seconds,
                self.config.udp_window_seconds,
                self.config.sweep_window_seconds,
            )

            cutoff = timestamp - max_window

            while events and events[0][0] < cutoff:
                events.popleft()

            alerts: list[NIDSAlert] = []

            if observation.transport_protocol == "tcp":
                alerts.extend(
                    self._detect_syn_scan(
                        source, destination, timestamp, events
                    )
                )

            if observation.transport_protocol == "udp":
                alerts.extend(
                    self._detect_udp_scan(
                        source, destination, timestamp, events
                    )
                )

            alerts.extend(
                self._detect_port_sweep(
                    source, timestamp, events
                )
            )

            self._alerts_generated += len(alerts)

            self._cleanup_cooldowns(timestamp)

            return tuple(alerts)

    def _detect_syn_scan(
        self,
        source: str,
        destination: str,
        timestamp: float,
        events: deque,
    ) -> list[NIDSAlert]:

        window_start = timestamp - self.config.syn_window_seconds

        syn_ports = {
            port
            for event_time, dst, port, protocol, flags in events
            if (
                event_time >= window_start
                and dst == destination
                and protocol == "tcp"
                and port is not None
                and flags is not None
                and (flags & 0x02) != 0
                and (flags & 0x10) == 0
            )
        }

        if len(syn_ports) < self.config.syn_scan_ports:
            return []

        alert = self._create_alert(
            rule_id="NIDS-001",
            name="TCP SYN Port Scan",
            severity="high",
            source=source,
            destination=destination,
            timestamp=timestamp,
            description=(
                "Multiple TCP SYN packets targeting different "
                "destination ports were observed."
            ),
            evidence=f"Unique destination ports: {len(syn_ports)}",
        )

        return [alert] if alert else []

    def _detect_udp_scan(
        self,
        source: str,
        destination: str,
        timestamp: float,
        events: deque,
    ) -> list[NIDSAlert]:

        window_start = timestamp - self.config.udp_window_seconds

        udp_ports = {
            port
            for event_time, dst, port, protocol, _ in events
            if (
                event_time >= window_start
                and dst == destination
                and protocol == "udp"
                and port is not None
            )
        }

        if len(udp_ports) < self.config.udp_scan_ports:
            return []

        alert = self._create_alert(
            rule_id="NIDS-002",
            name="UDP Port Scan",
            severity="medium",
            source=source,
            destination=destination,
            timestamp=timestamp,
            description=(
                "Multiple UDP destination ports were targeted "
                "within a short time window."
            ),
            evidence=f"Unique UDP ports: {len(udp_ports)}",
        )

        return [alert] if alert else []

    def _detect_port_sweep(
        self,
        source: str,
        timestamp: float,
        events: deque,
    ) -> list[NIDSAlert]:

        window_start = timestamp - self.config.sweep_window_seconds

        destinations: dict[
            tuple[str, int], set[str]
        ] = defaultdict(set)

        for event_time, dst, port, protocol, _ in events:
            if (
                event_time >= window_start
                and port is not None
                and protocol in ("tcp", "udp")
            ):
                destinations[(protocol, port)].add(dst)

        alerts = []

        for (protocol, port), hosts in destinations.items():
            if len(hosts) < self.config.port_sweep_hosts:
                continue

            target = f"{protocol}:{port}"

            alert = self._create_alert(
                rule_id="NIDS-003",
                name="Network Port Sweep",
                severity="medium",
                source=source,
                destination="multiple",
                timestamp=timestamp,
                description=(
                    "One source contacted the same destination port "
                    "on multiple network hosts."
                ),
                evidence=(
                    f"Protocol: {protocol}, port: {port}, "
                    f"unique destinations: {len(hosts)}"
                ),
                dedup_target=target,
            )

            if alert:
                alerts.append(alert)

        return alerts

    def _create_alert(
        self,
        *,
        rule_id: str,
        name: str,
        severity: str,
        source: str,
        destination: str,
        timestamp: float,
        description: str,
        evidence: str,
        dedup_target: str | None = None,
    ) -> NIDSAlert | None:

        target = dedup_target or destination
        key = (rule_id, source, target)

        previous = self._last_alert.get(key)

        if (
            previous is not None
            and timestamp - previous
            < self.config.alert_cooldown_seconds
        ):
            return None

        self._last_alert[key] = timestamp

        occurred_at = datetime.fromtimestamp(
            timestamp, tz=timezone.utc
        )

        return NIDSAlert(
            alert_id=str(uuid4()),
            rule_id=rule_id,
            name=name,
            severity=severity,
            occurred_at=occurred_at,
            source_ip=source,
            destination_ip=destination,
            description=description,
            evidence=evidence,
        )

    def _cleanup_cooldowns(self, timestamp: float) -> None:
        expiry = timestamp - max(
            self.config.syn_window_seconds,
            self.config.udp_window_seconds,
            self.config.sweep_window_seconds,
            self.config.alert_cooldown_seconds,
        ) * 2

        expired = [
            key
            for key, last_seen in self._last_alert.items()
            if last_seen < expiry
        ]

        for key in expired:
            del self._last_alert[key]

    def stats(self) -> dict[str, int]:
        with self._lock:
            return {
                "observations_processed": self._observations_processed,
                "alerts_generated": self._alerts_generated,
                "tracked_sources": len(self._events),
            }
