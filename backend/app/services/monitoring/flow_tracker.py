import time
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Literal

from backend.app.services.monitoring.packet_parser import PacketObservation

FlowProtocol = Literal["tcp", "udp"]


@dataclass(frozen=True, slots=True, order=True)
class Endpoint:
    ip: str
    port: int


@dataclass(frozen=True, slots=True)
class FlowKey:
    ip_version: int
    protocol: FlowProtocol
    endpoint_a: Endpoint
    endpoint_b: Endpoint


@dataclass(frozen=True, slots=True)
class FlowSnapshot:
    key: FlowKey
    packets_a_to_b: int
    packets_b_to_a: int
    bytes_a_to_b: int
    bytes_b_to_a: int
    first_seen: datetime
    last_seen: datetime
    syn_count: int
    ack_count: int
    fin_count: int
    rst_count: int

    @property
    def total_packets(self) -> int:
        return self.packets_a_to_b + self.packets_b_to_a

    @property
    def total_bytes(self) -> int:
        return self.bytes_a_to_b + self.bytes_b_to_a


@dataclass(slots=True)
class _MutableFlow:
    packets_a_to_b: int
    packets_b_to_a: int
    bytes_a_to_b: int
    bytes_b_to_a: int
    first_seen: datetime
    last_seen: datetime
    last_activity: float
    syn_count: int = 0
    ack_count: int = 0
    fin_count: int = 0
    rst_count: int = 0

    def snapshot(self, key: FlowKey) -> FlowSnapshot:
        return FlowSnapshot(
            key=key,
            packets_a_to_b=self.packets_a_to_b,
            packets_b_to_a=self.packets_b_to_a,
            bytes_a_to_b=self.bytes_a_to_b,
            bytes_b_to_a=self.bytes_b_to_a,
            first_seen=self.first_seen,
            last_seen=self.last_seen,
            syn_count=self.syn_count,
            ack_count=self.ack_count,
            fin_count=self.fin_count,
            rst_count=self.rst_count,
        )


class FlowTracker:
    """
    Bounded in-memory bidirectional TCP/UDP flow tracker.

    Idle expiration uses a monotonic clock rather than packet timestamps,
    so out-of-order packet timestamps cannot keep flows alive indefinitely.
    Packet timestamps are retained for first_seen and last_seen.
    """

    def __init__(
        self,
        idle_timeout: float = 60.0,
        max_flows: int = 10_000,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if idle_timeout <= 0:
            raise ValueError("idle_timeout must be greater than zero")

        if max_flows < 1:
            raise ValueError("max_flows must be at least one")

        self.idle_timeout = idle_timeout
        self.max_flows = max_flows
        self._clock = clock
        self._flows: OrderedDict[FlowKey, _MutableFlow] = OrderedDict()

    @staticmethod
    def _make_key(
        observation: PacketObservation,
    ) -> tuple[FlowKey, bool] | None:
        if observation.transport_protocol not in ("tcp", "udp"):
            return None

        if observation.source_port is None or observation.destination_port is None:
            return None

        source = Endpoint(observation.source_ip, observation.source_port)
        destination = Endpoint(
            observation.destination_ip,
            observation.destination_port,
        )

        endpoint_a, endpoint_b = sorted((source, destination))

        key = FlowKey(
            ip_version=observation.ip_version,
            protocol=observation.transport_protocol,
            endpoint_a=endpoint_a,
            endpoint_b=endpoint_b,
        )

        return key, source == endpoint_a

    def expire(self) -> int:
        """Remove flows inactive for at least the configured timeout."""
        now = self._clock()
        expired_count = 0

        # OrderedDict is maintained in last-activity order.
        # Therefore, expiration only needs to inspect the oldest flows.
        while self._flows:
            oldest_key = next(iter(self._flows))
            oldest_flow = self._flows[oldest_key]

            if now - oldest_flow.last_activity < self.idle_timeout:
                break

            del self._flows[oldest_key]
            expired_count += 1

        return expired_count

    def update(self, observation: PacketObservation) -> FlowSnapshot | None:
        """Add one packet observation and return the updated flow."""
        key_result = self._make_key(observation)

        if key_result is None:
            return None

        key, is_a_to_b = key_result
        now = self._clock()

        self.expire()

        flow = self._flows.get(key)

        if flow is None:
            if len(self._flows) >= self.max_flows:
                self._flows.popitem(last=False)

            flow = _MutableFlow(
                packets_a_to_b=0,
                packets_b_to_a=0,
                bytes_a_to_b=0,
                bytes_b_to_a=0,
                first_seen=observation.captured_at,
                last_seen=observation.captured_at,
                last_activity=now,
            )
            self._flows[key] = flow

        else:
            self._flows.move_to_end(key)
            flow.last_activity = now

            if observation.captured_at < flow.first_seen:
                flow.first_seen = observation.captured_at

            if observation.captured_at > flow.last_seen:
                flow.last_seen = observation.captured_at

        if is_a_to_b:
            flow.packets_a_to_b += 1
            flow.bytes_a_to_b += observation.packet_length
        else:
            flow.packets_b_to_a += 1
            flow.bytes_b_to_a += observation.packet_length

        if observation.tcp_flags is not None:
            flags = observation.tcp_flags
            flow.fin_count += bool(flags & 0x01)
            flow.syn_count += bool(flags & 0x02)
            flow.rst_count += bool(flags & 0x04)
            flow.ack_count += bool(flags & 0x10)

        return flow.snapshot(key)

    def get(self, key: FlowKey) -> FlowSnapshot | None:
        flow = self._flows.get(key)
        return flow.snapshot(key) if flow is not None else None

    def snapshots(self) -> tuple[FlowSnapshot, ...]:
        return tuple(
            flow.snapshot(key)
            for key, flow in self._flows.items()
        )

    def clear(self) -> None:
        self._flows.clear()

    def __len__(self) -> int:
        return len(self._flows)
