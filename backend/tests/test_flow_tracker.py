from datetime import datetime, timedelta, timezone

import pytest

from backend.app.services.monitoring.flow_tracker import FlowTracker
from backend.app.services.monitoring.packet_parser import PacketObservation


class FakeClock:
    def __init__(self):
        self.value = 100.0

    def __call__(self):
        return self.value

    def advance(self, seconds):
        self.value += seconds


BASE_TIME = datetime(2026, 11, 18, 9, 0, tzinfo=timezone.utc)


def observation(
    source="192.0.2.10",
    destination="198.51.100.20",
    source_port=51515,
    destination_port=443,
    protocol="tcp",
    flags=0x02,
    length=60,
    timestamp=BASE_TIME,
):
    return PacketObservation(
        captured_at=timestamp,
        source_ip=source,
        destination_ip=destination,
        ip_version=4,
        transport_protocol=protocol,
        source_port=source_port,
        destination_port=destination_port,
        tcp_flags=flags if protocol == "tcp" else None,
        packet_length=length,
        dns_present=False,
    )


def test_tracks_bidirectional_tcp_flow():
    tracker = FlowTracker()

    first = tracker.update(observation(flags=0x02, length=60))
    second = tracker.update(
        observation(
            source="198.51.100.20",
            destination="192.0.2.10",
            source_port=443,
            destination_port=51515,
            flags=0x12,
            length=80,
        )
    )

    assert first is not None
    assert second is not None
    assert len(tracker) == 1

    assert second.total_packets == 2
    assert second.total_bytes == 140
    assert second.packets_a_to_b == 1
    assert second.packets_b_to_a == 1
    assert second.bytes_a_to_b == 60
    assert second.bytes_b_to_a == 80
    assert second.syn_count == 2
    assert second.ack_count == 1


def test_tracks_udp_separately_from_tcp():
    tracker = FlowTracker()

    tracker.update(observation(protocol="tcp"))
    udp_flow = tracker.update(observation(protocol="udp"))

    assert udp_flow is not None
    assert udp_flow.key.protocol == "udp"
    assert len(tracker) == 2


def test_tracks_ipv6_as_separate_flow():
    tracker = FlowTracker()

    ipv6_observation = PacketObservation(
        captured_at=BASE_TIME,
        source_ip="2001:db8::10",
        destination_ip="2001:db8::20",
        ip_version=6,
        transport_protocol="tcp",
        source_port=50000,
        destination_port=443,
        tcp_flags=0x02,
        packet_length=80,
        dns_present=False,
    )

    result = tracker.update(ipv6_observation)

    assert result is not None
    assert result.key.ip_version == 6


def test_ignores_non_transport_protocols():
    tracker = FlowTracker()

    result = tracker.update(
        observation(protocol="other", flags=0)
    )

    assert result is None
    assert len(tracker) == 0


def test_rejects_missing_transport_ports():
    tracker = FlowTracker()

    invalid = PacketObservation(
        captured_at=BASE_TIME,
        source_ip="192.0.2.10",
        destination_ip="198.51.100.20",
        ip_version=4,
        transport_protocol="tcp",
        source_port=None,
        destination_port=443,
        tcp_flags=0x02,
        packet_length=60,
        dns_present=False,
    )

    assert tracker.update(invalid) is None
    assert len(tracker) == 0


def test_expires_inactive_flows():
    clock = FakeClock()
    tracker = FlowTracker(idle_timeout=30, clock=clock)

    tracker.update(observation())

    clock.advance(29)
    assert tracker.expire() == 0
    assert len(tracker) == 1

    clock.advance(1)
    assert tracker.expire() == 1
    assert len(tracker) == 0


def test_enforces_maximum_flow_capacity():
    tracker = FlowTracker(max_flows=2)

    tracker.update(observation(destination="198.51.100.20"))
    tracker.update(observation(destination="198.51.100.21"))
    tracker.update(observation(destination="198.51.100.22"))

    assert len(tracker) == 2

    destinations = {
        flow.key.endpoint_a.ip
        for flow in tracker.snapshots()
    } | {
        flow.key.endpoint_b.ip
        for flow in tracker.snapshots()
    }

    assert "198.51.100.20" not in destinations


def test_uses_packet_timestamps_for_first_and_last_seen():
    tracker = FlowTracker()

    tracker.update(observation(timestamp=BASE_TIME + timedelta(seconds=10)))
    result = tracker.update(
        observation(timestamp=BASE_TIME, flags=0x10)
    )

    assert result is not None
    assert result.first_seen == BASE_TIME
    assert result.last_seen == BASE_TIME + timedelta(seconds=10)


def test_counts_fin_and_rst_flags():
    tracker = FlowTracker()

    result = tracker.update(observation(flags=0x05))

    assert result is not None
    assert result.fin_count == 1
    assert result.rst_count == 1


@pytest.mark.parametrize(
    ("idle_timeout", "max_flows"),
    [
        (0, 10),
        (-1, 10),
        (60, 0),
        (60, -1),
    ],
)
def test_rejects_invalid_configuration(idle_timeout, max_flows):
    with pytest.raises(ValueError):
        FlowTracker(
            idle_timeout=idle_timeout,
            max_flows=max_flows,
        )


def test_expiration_only_removes_inactive_oldest_flows():
    clock = FakeClock()
    tracker = FlowTracker(idle_timeout=30, clock=clock)

    tracker.update(observation(destination="198.51.100.20"))

    clock.advance(20)

    tracker.update(observation(destination="198.51.100.21"))

    clock.advance(11)

    assert tracker.expire() == 1
    assert len(tracker) == 1

    remaining = tracker.snapshots()[0]
    assert "198.51.100.21" in (
        remaining.key.endpoint_a.ip,
        remaining.key.endpoint_b.ip,
    )
