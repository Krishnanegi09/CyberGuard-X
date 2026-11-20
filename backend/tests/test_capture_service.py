from dataclasses import replace
from datetime import datetime, timezone
from threading import Event
from uuid import uuid4

import pytest

from backend.app.services.monitoring.capture_service import (
    PacketCaptureService,
)
from backend.app.services.monitoring.flow_tracker import FlowTracker
from backend.app.services.monitoring.manager import MonitoringManager
from backend.app.services.monitoring.packet_parser import PacketObservation


def make_observation():
    return PacketObservation(
        captured_at=datetime.now(timezone.utc),
        source_ip="192.0.2.10",
        destination_ip="192.0.2.20",
        ip_version=4,
        transport_protocol="tcp",
        source_port=50000,
        destination_port=443,
        tcp_flags=0x02,
        packet_length=100,
        dns_present=False,
    )


class FakeSniffer:
    def __init__(self, *, iface, filter, prn, store):
        self.iface = iface
        self.filter = filter
        self.callback = prn
        self.store = store
        self.started = False
        self.stop_called = False
        self.fail_on_start = False
        self.fail_on_stop = False

    def start(self):
        if self.fail_on_start:
            raise RuntimeError("Simulated sniffer startup failure")
        self.started = True

    def stop(self, join=True):
        self.stop_called = True
        if self.fail_on_stop:
            raise RuntimeError("Simulated sniffer shutdown failure")


def make_sniffer_factory():
    created = []

    def factory(**kwargs):
        sniffer = FakeSniffer(**kwargs)
        created.append(sniffer)
        return sniffer

    return factory, created


def test_rejects_unauthorized_interface():
    factory, created = make_sniffer_factory()
    service = PacketCaptureService(sniffer_factory=factory)

    with pytest.raises(ValueError, match="not authorized"):
        service.start("lo0", ["192.0.2.0/24"])

    assert service.status == "stopped"
    assert created == []


def test_start_uses_en0_without_storing_packets():
    factory, created = make_sniffer_factory()
    service = PacketCaptureService(sniffer_factory=factory)

    service.start("en0", ["192.0.2.0/24"])

    assert service.status == "running"
    assert len(created) == 1
    assert created[0].iface == "en0"
    assert created[0].filter == "(net 192.0.2.0/24)"
    assert created[0].store is False
    assert callable(created[0].callback)

    service.stop()
    assert created[0].stop_called


def test_repeated_stop_is_safe():
    service = PacketCaptureService()

    first = service.stop()
    second = service.stop()

    assert first.status == "stopped"
    assert second.status == "stopped"


def test_queue_overflow_is_counted():
    observation = make_observation()

    service = PacketCaptureService(
        queue_capacity=1,
        parser=lambda packet: observation,
    )
    service._allowed_networks = service._validate_networks(
        ["192.0.2.0/24"]
    )

    service._on_packet(object())
    service._on_packet(object())

    stats = service.stats()

    assert stats.captured_packets == 2
    assert stats.queued_packets == 1
    assert stats.dropped_packets == 1
    assert stats.queue_size == 1


def test_ignores_unparseable_non_ip_packet():
    service = PacketCaptureService(parser=lambda packet: None)

    service._on_packet(object())

    stats = service.stats()

    assert stats.captured_packets == 1
    assert stats.ignored_packets == 1
    assert stats.queued_packets == 0
    assert stats.processing_errors == 0


def test_parser_errors_are_counted():
    def failing_parser(packet):
        raise ValueError("Invalid packet")

    service = PacketCaptureService(parser=failing_parser)

    service._on_packet(object())

    stats = service.stats()

    assert stats.captured_packets == 1
    assert stats.processing_errors == 1
    assert stats.queued_packets == 0


def test_worker_processes_and_drains_queue_on_shutdown():
    factory, created = make_sniffer_factory()
    tracker = FlowTracker()
    observation = make_observation()

    service = PacketCaptureService(
        queue_capacity=10,
        sniffer_factory=factory,
        parser=lambda packet: observation,
        flow_tracker=tracker,
    )

    service.start("en0", ["192.0.2.0/24"])

    service._on_packet(object())
    service._on_packet(object())

    stats = service.stop()

    assert stats.status == "stopped"
    assert stats.captured_packets == 2
    assert stats.queued_packets == 2
    assert stats.processed_packets == 2
    assert stats.dropped_packets == 0
    assert stats.queue_size == 0

    assert len(tracker) == 1
    assert tracker.snapshots()[0].total_packets == 2
    assert created[0].stop_called


def test_startup_failure_stops_sniffer_and_worker():
    created = []

    def failing_factory(**kwargs):
        sniffer = FakeSniffer(**kwargs)
        sniffer.fail_on_start = True
        created.append(sniffer)
        return sniffer

    service = PacketCaptureService(sniffer_factory=failing_factory)

    with pytest.raises(RuntimeError, match="Simulated sniffer"):
        service.start("en0", ["192.0.2.0/24"])

    assert service.status == "failed"
    assert created[0].stop_called
    assert service._worker is None
    assert service._stop_event is None


def test_worker_processing_errors_are_counted():
    class FailingFlowTracker:
        def update(self, observation):
            raise RuntimeError("Simulated processing failure")

        def expire(self):
            return 0

    factory, _ = make_sniffer_factory()

    service = PacketCaptureService(
        sniffer_factory=factory,
        parser=lambda packet: make_observation(),
        flow_tracker=FailingFlowTracker(),
    )

    service.start("en0", ["192.0.2.0/24"])
    service._on_packet(object())

    stats = service.stop()

    assert stats.queued_packets == 1
    assert stats.processed_packets == 0
    assert stats.processing_errors == 1
    assert stats.queue_size == 0


def test_rejects_invalid_queue_capacity():
    with pytest.raises(ValueError, match="queue_capacity"):
        PacketCaptureService(queue_capacity=0)


def test_rejects_invalid_worker_timeout():
    with pytest.raises(ValueError, match="worker_join_timeout"):
        PacketCaptureService(worker_join_timeout=0)


def test_worker_survives_flow_expiration_error():
    class ExpireFailsOnceTracker(FlowTracker):
        def __init__(self):
            super().__init__()
            self.expire_attempted = Event()
            self.updated = Event()
            self.expire_calls = 0

        def expire(self):
            self.expire_calls += 1
            if self.expire_calls == 1:
                self.expire_attempted.set()
                raise RuntimeError("Simulated expiration failure")
            return super().expire()

        def update(self, observation):
            result = super().update(observation)
            self.updated.set()
            return result

    factory, created = make_sniffer_factory()
    tracker = ExpireFailsOnceTracker()
    observation = make_observation()

    service = PacketCaptureService(
        sniffer_factory=factory,
        parser=lambda packet: observation,
        flow_tracker=tracker,
    )

    service.start("en0", ["192.0.2.0/24"])

    try:
        assert tracker.expire_attempted.wait(timeout=2)

        service._on_packet(object())

        assert tracker.updated.wait(timeout=2), (
            "Worker terminated after expiration raised an exception"
        )
    finally:
        stats = service.stop()

    assert stats.status == "stopped"
    assert stats.processed_packets == 1
    assert stats.processing_errors >= 1
    assert stats.queue_size == 0


def test_startup_cleanup_failure_preserves_sniffer_reference():
    created = []

    def failing_factory(**kwargs):
        sniffer = FakeSniffer(**kwargs)
        sniffer.fail_on_start = True
        sniffer.fail_on_stop = True
        created.append(sniffer)
        return sniffer

    service = PacketCaptureService(sniffer_factory=failing_factory)

    with pytest.raises(RuntimeError, match="Simulated sniffer startup"):
        service.start("en0", ["192.0.2.0/24"])

    assert service.status == "failed"
    assert created[0].stop_called
    assert service._sniffer is created[0]
    assert service._worker is None


def test_shutdown_failure_preserves_sniffer_reference():
    factory, created = make_sniffer_factory()
    service = PacketCaptureService(sniffer_factory=factory)

    service.start("en0", ["192.0.2.0/24"])
    created[0].fail_on_stop = True

    with pytest.raises(RuntimeError, match="failed while stopping"):
        service.stop()

    assert service.status == "failed"
    assert service._sniffer is created[0]
    assert service._worker is None


# Scope enforcement tests

def test_capture_requires_non_empty_scope():
    service = PacketCaptureService()

    with pytest.raises(ValueError, match="At least one"):
        service.start("en0", [])

    assert service.status == "stopped"


def test_capture_rejects_invalid_cidr():
    service = PacketCaptureService()

    with pytest.raises(ValueError, match="Invalid approved CIDR"):
        service.start("en0", ["not-a-network"])

    assert service.status == "stopped"


def test_capture_builds_validated_bpf_filter():
    factory, created = make_sniffer_factory()
    service = PacketCaptureService(sniffer_factory=factory)

    service.start(
        "en0",
        ["192.0.2.0/24", "2001:db8::/32"],
    )

    assert len(created) == 1
    assert created[0].filter == (
        "(net 192.0.2.0/24 or net 2001:db8::/32)"
    )

    service.stop()


def test_out_of_scope_packet_is_not_queued():
    observation = make_observation()
    factory, _ = make_sniffer_factory()

    service = PacketCaptureService(
        sniffer_factory=factory,
        parser=lambda packet: observation,
    )

    service.start("en0", ["198.51.100.0/24"])
    service._on_packet(object())

    stats = service.stats()

    assert stats.captured_packets == 1
    assert stats.ignored_packets == 1
    assert stats.queued_packets == 0
    assert stats.queue_size == 0

    service.stop()


def test_in_scope_destination_is_accepted():
    observation = make_observation()
    factory, _ = make_sniffer_factory()

    service = PacketCaptureService(
        sniffer_factory=factory,
        parser=lambda packet: observation,
    )

    service.start("en0", ["192.0.2.0/24"])
    service._on_packet(object())

    assert service.stats().queued_packets == 1

    service.stop()


def test_ipv6_scope_is_enforced():
    observation = replace(
        make_observation(),
        source_ip="2001:db8::10",
        destination_ip="2001:db8::20",
        ip_version=6,
    )

    factory, _ = make_sniffer_factory()

    service = PacketCaptureService(
        sniffer_factory=factory,
        parser=lambda packet: observation,
    )

    service.start("en0", ["2001:db8::/32"])
    service._on_packet(object())

    assert service.stats().queued_packets == 1

    service.stop()


def test_scope_accepts_ipv4_source_when_destination_is_ipv6_out_of_scope():
    observation = replace(
        make_observation(),
        source_ip="192.0.2.10",
        destination_ip="2001:db8::20",
        ip_version=4,
    )
    service = PacketCaptureService(parser=lambda packet: observation)
    service.start("en0", ["192.0.2.0/24"])

    service._on_packet(object())

    assert service.stats().queued_packets == 1
    service.stop()


def test_scope_accepts_ipv6_destination_when_source_is_ipv4_out_of_scope():
    observation = replace(
        make_observation(),
        source_ip="192.0.2.10",
        destination_ip="2001:db8::20",
        ip_version=6,
    )
    service = PacketCaptureService(parser=lambda packet: observation)
    service.start("en0", ["2001:db8::/32"])

    service._on_packet(object())

    assert service.stats().queued_packets == 1
    service.stop()


def test_scope_rejects_mixed_version_endpoints_outside_approved_networks():
    observation = replace(
        make_observation(),
        source_ip="192.0.2.10",
        destination_ip="2001:db8::20",
    )
    service = PacketCaptureService(parser=lambda packet: observation)
    service.start("en0", ["198.51.100.0/24", "2001:db9::/32"])

    service._on_packet(object())

    assert service.stats().queued_packets == 0
    assert service.stats().ignored_packets == 1
    service.stop()


def test_scope_rejects_invalid_observation_ip():
    observation = replace(make_observation(), source_ip="not-an-ip")
    service = PacketCaptureService(parser=lambda packet: observation)
    service.start("en0", ["192.0.2.0/24"])

    service._on_packet(object())

    assert service.stats().queued_packets == 0
    assert service.stats().processing_errors == 1
    service.stop()


def test_manager_rejects_unauthorized_interface_before_service_creation():
    created = []

    def service_factory(**kwargs):
        created.append(kwargs)
        raise AssertionError("service must not be constructed")

    manager = MonitoringManager(
        allowed_interfaces=("en0", "en1"),
        service_factory=service_factory,
    )

    with pytest.raises(ValueError, match="not authorized"):
        manager.start(
            organization_id=uuid4(),
            scope_id=uuid4(),
            interface="lo0",
            networks=["192.0.2.0/24"],
            alert_handler=None,
        )

    assert created == []


def test_manager_passes_configured_allowlist_to_service():
    created = []

    class FakeService:
        def __init__(self, **kwargs):
            created.append(kwargs)

        def start(self, interface, networks):
            self.interface = interface
            self.networks = networks

        def stop(self):
            return None

    manager = MonitoringManager(
        allowed_interfaces=("en0", "en1"),
        service_factory=FakeService,
    )

    manager.start(
        organization_id=uuid4(),
        scope_id=uuid4(),
        interface="en1",
        networks=["192.0.2.0/24"],
        alert_handler=None,
    )

    assert created == [{
        "allowed_interfaces": frozenset({"en0", "en1"}),
        "alert_handler": None,
    }]
