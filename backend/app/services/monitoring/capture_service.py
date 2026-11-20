from __future__ import annotations

from dataclasses import dataclass
from ipaddress import ip_address, ip_network
from queue import Empty, Full, Queue
from threading import Event, Lock, Thread
from typing import Callable, Iterable, Literal

from scapy.all import AsyncSniffer
from scapy.packet import Packet

from backend.app.services.monitoring.flow_tracker import FlowTracker
from backend.app.services.monitoring.packet_parser import (
    PacketObservation,
    parse_packet,
)
from backend.app.services.monitoring.nids_engine import (
    NIDSAlert,
    NIDSEngine,
)


CaptureStatus = Literal[
    "stopped",
    "starting",
    "running",
    "stopping",
    "failed",
]


@dataclass(frozen=True, slots=True)
class CaptureStats:
    status: CaptureStatus
    interface: str | None
    captured_packets: int
    queued_packets: int
    processed_packets: int
    dropped_packets: int
    ignored_packets: int
    processing_errors: int
    queue_size: int


class PacketCaptureService:
    """
    Controlled, scope-filtered packet capture.

    Security properties:
    - Only explicitly allowed interfaces can be selected.
    - An explicit, non-empty CIDR scope is required to start capture.
    - A validated BPF filter restricts capture to approved networks.
    - Both packet endpoints are checked again before queueing.
    - Only metadata observations enter the processing queue.
    - Full Scapy packets and payloads are never queued or persisted.
    - One worker owns the FlowTracker.
    """

    def __init__(
        self,
        *,
        queue_capacity: int = 2048,
        allowed_interfaces: Iterable[str] = ("en0",),
        sniffer_factory: Callable[..., object] = AsyncSniffer,
        parser: Callable[[Packet], PacketObservation | None] = parse_packet,
        flow_tracker: FlowTracker | None = None,
        nids_engine: NIDSEngine | None = None,
        alert_handler: Callable[[NIDSAlert], None] | None = None,
        worker_join_timeout: float = 5.0,
    ) -> None:
        if queue_capacity < 1:
            raise ValueError("queue_capacity must be at least one")

        if worker_join_timeout <= 0:
            raise ValueError(
                "worker_join_timeout must be greater than zero"
            )

        interfaces = frozenset(
            interface.strip()
            for interface in allowed_interfaces
            if isinstance(interface, str) and interface.strip()
        )

        if not interfaces:
            raise ValueError(
                "At least one allowed capture interface is required"
            )

        self._queue: Queue[PacketObservation] = Queue(
            maxsize=queue_capacity
        )
        self._allowed_interfaces = interfaces
        self._allowed_networks = ()
        self._capture_filter: str | None = None

        self._sniffer_factory = sniffer_factory
        self._parser = parser
        self.flow_tracker = (
            flow_tracker if flow_tracker is not None else FlowTracker()
        )
        self.nids_engine = (
            nids_engine if nids_engine is not None else NIDSEngine()
        )
        self._alert_handler = alert_handler
        self._worker_join_timeout = worker_join_timeout

        self._lifecycle_lock = Lock()
        self._stats_lock = Lock()

        self._status: CaptureStatus = "stopped"
        self._interface: str | None = None

        self._stop_event: Event | None = None
        self._worker: Thread | None = None
        self._sniffer: object | None = None

        self._captured_packets = 0
        self._queued_packets = 0
        self._processed_packets = 0
        self._dropped_packets = 0
        self._ignored_packets = 0
        self._processing_errors = 0

    @property
    def status(self) -> CaptureStatus:
        with self._stats_lock:
            return self._status

    @property
    def capture_filter(self) -> str | None:
        with self._stats_lock:
            return self._capture_filter

    def stats(self) -> CaptureStats:
        with self._stats_lock:
            return CaptureStats(
                status=self._status,
                interface=self._interface,
                captured_packets=self._captured_packets,
                queued_packets=self._queued_packets,
                processed_packets=self._processed_packets,
                dropped_packets=self._dropped_packets,
                ignored_packets=self._ignored_packets,
                processing_errors=self._processing_errors,
                queue_size=self._queue.qsize(),
            )

    @staticmethod
    def _validate_networks(
        allowed_networks: Iterable[str],
    ) -> tuple:
        """
        Parse and normalize the explicitly approved network boundaries.

        Strict=False normalizes valid host-address CIDRs to their
        canonical network representation.
        """
        if isinstance(allowed_networks, (str, bytes)):
            raise ValueError(
                "Allowed networks must be an iterable of CIDR strings"
            )

        try:
            values = tuple(allowed_networks)
        except TypeError as exc:
            raise ValueError(
                "Allowed networks must be an iterable of CIDR strings"
            ) from exc

        if not values:
            raise ValueError(
                "At least one approved CIDR network is required"
            )

        networks = set()

        for value in values:
            if not isinstance(value, str) or not value.strip():
                raise ValueError("Every approved network must be a CIDR string")

            try:
                networks.add(ip_network(value.strip(), strict=False))
            except ValueError as exc:
                raise ValueError(
                    f"Invalid approved CIDR network: {value!r}"
                ) from exc

        return tuple(
            sorted(
                networks,
                key=lambda network: (
                    network.version,
                    int(network.network_address),
                    network.prefixlen,
                ),
            )
        )

    @staticmethod
    def _build_capture_filter(networks: tuple) -> str:
        """
        Build a BPF filter using only normalized ipaddress networks.

        User-provided strings are never interpolated directly.
        """
        clauses = [
            f"net {network.with_prefixlen}"
            for network in networks
        ]

        return "(" + " or ".join(clauses) + ")"

    def _observation_is_in_scope(
        self,
        observation: PacketObservation,
    ) -> bool:
        try:
            source = ip_address(observation.source_ip)
            destination = ip_address(observation.destination_ip)
        except ValueError:
            raise ValueError(
                "Packet parser returned an invalid IP address"
            )

        for network in self._allowed_networks:
            source_in_scope = (
                source.version == network.version and source in network
            )
            destination_in_scope = (
                destination.version == network.version and destination in network
            )

            if source_in_scope or destination_in_scope:
                return True

        return False

    def _on_packet(self, packet: Packet) -> None:
        """Parse, validate scope, and enqueue metadata without blocking."""
        with self._stats_lock:
            self._captured_packets += 1

        try:
            observation = self._parser(packet)
        except Exception:
            with self._stats_lock:
                self._processing_errors += 1
            return

        if observation is None:
            with self._stats_lock:
                self._ignored_packets += 1
            return

        try:
            in_scope = self._observation_is_in_scope(observation)
        except Exception:
            with self._stats_lock:
                self._processing_errors += 1
            return

        if not in_scope:
            with self._stats_lock:
                self._ignored_packets += 1
            return

        try:
            self._queue.put_nowait(observation)
        except Full:
            with self._stats_lock:
                self._dropped_packets += 1
            return

        with self._stats_lock:
            self._queued_packets += 1

    def _process_queue(self, stop_event: Event) -> None:
        """Single worker responsible for flow updates and expiration."""
        while not stop_event.is_set() or not self._queue.empty():
            try:
                observation = self._queue.get(timeout=0.1)
            except Empty:
                try:
                    self.flow_tracker.expire()
                except Exception:
                    with self._stats_lock:
                        self._processing_errors += 1
                continue

            flow_succeeded = False

            try:
                self.flow_tracker.update(observation)
                flow_succeeded = True
            except Exception:
                with self._stats_lock:
                    self._processing_errors += 1

            try:
                alerts = self.nids_engine.process(observation)

                if self._alert_handler is not None:
                    for alert in alerts:
                        try:
                            self._alert_handler(alert)
                        except Exception:
                            with self._stats_lock:
                                self._processing_errors += 1

            except Exception:
                with self._stats_lock:
                    self._processing_errors += 1

            if flow_succeeded:
                with self._stats_lock:
                    self._processed_packets += 1

            self._queue.task_done()

    def start(
        self,
        interface: str,
        allowed_networks: Iterable[str],
    ) -> None:
        """
        Start capture on an authorized interface and approved CIDR scope.

        The caller must resolve scope authorization before invoking this
        method. The service independently enforces the supplied boundaries.
        """
        with self._lifecycle_lock:
            networks = self._validate_networks(allowed_networks)

            if not isinstance(interface, str) or not interface.strip():
                raise ValueError("A valid capture interface is required")

            interface = interface.strip()

            with self._stats_lock:
                if self._status != "stopped":
                    raise RuntimeError(
                        f"Cannot start capture while status is {self._status}"
                    )

                if interface not in self._allowed_interfaces:
                    raise ValueError(
                        f"Interface {interface!r} is not authorized"
                    )

                self._status = "starting"
                self._interface = interface
                self._allowed_networks = networks
                self._capture_filter = self._build_capture_filter(networks)

            stop_event = Event()
            worker = Thread(
                target=self._process_queue,
                args=(stop_event,),
                name="cyberguard-packet-processor",
                daemon=True,
            )

            sniffer = None

            try:
                sniffer = self._sniffer_factory(
                    iface=interface,
                    filter=self._capture_filter,
                    prn=self._on_packet,
                    store=False,
                )

                self._stop_event = stop_event
                self._worker = worker
                self._sniffer = sniffer

                worker.start()
                sniffer.start()

            except Exception:
                sniffer_stopped = sniffer is None

                if sniffer is not None:
                    try:
                        sniffer.stop(join=True)
                        sniffer_stopped = True
                    except Exception:
                        sniffer_stopped = False

                stop_event.set()

                if worker.is_alive():
                    worker.join(timeout=self._worker_join_timeout)

                with self._stats_lock:
                    self._status = "failed"

                if not worker.is_alive():
                    self._worker = None
                    self._stop_event = None

                if sniffer_stopped:
                    self._sniffer = None
                    self._allowed_networks = ()
                    self._capture_filter = None

                raise

            with self._stats_lock:
                self._status = "running"

    def stop(self) -> CaptureStats:
        """Stop capture and drain queued observations before returning."""
        with self._lifecycle_lock:
            with self._stats_lock:
                current_status = self._status

                if current_status == "failed":
                    raise RuntimeError(
                        "Capture service is in a failed state"
                    )

                if current_status == "stopped":
                    already_stopped = True
                elif current_status == "running":
                    already_stopped = False
                    self._status = "stopping"
                else:
                    raise RuntimeError(
                        f"Cannot stop capture while status is {current_status}"
                    )

            if already_stopped:
                return self.stats()

            sniffer_error: Exception | None = None

            try:
                if self._sniffer is not None:
                    self._sniffer.stop(join=True)
            except Exception as exc:
                sniffer_error = exc
            finally:
                if self._stop_event is not None:
                    self._stop_event.set()

                if self._worker is not None:
                    self._worker.join(
                        timeout=self._worker_join_timeout
                    )

            if self._worker is not None and self._worker.is_alive():
                with self._stats_lock:
                    self._status = "failed"

                raise RuntimeError(
                    "Packet processing worker did not stop in time"
                )

            if sniffer_error is None:
                self._sniffer = None

            self._worker = None
            self._stop_event = None

            with self._stats_lock:
                self._status = (
                    "failed" if sniffer_error is not None else "stopped"
                )

                if sniffer_error is None:
                    self._allowed_networks = ()
                    self._capture_filter = None

            if sniffer_error is not None:
                raise RuntimeError(
                    "Packet capture failed while stopping"
                ) from sniffer_error

            return self.stats()
