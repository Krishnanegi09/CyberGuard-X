from datetime import datetime, timedelta, timezone
from threading import Event

from backend.app.services.monitoring.capture_service import (
    PacketCaptureService,
)
from backend.app.services.monitoring.packet_parser import PacketObservation


class FakeSniffer:
    def __init__(self, *, iface, filter, prn, store):
        self.callback = prn

    def start(self):
        pass

    def stop(self, join=True):
        pass


def test_capture_worker_detects_tcp_syn_scan():
    base_time = datetime(2026, 11, 19, 10, 0, tzinfo=timezone.utc)

    observations = [
        PacketObservation(
            captured_at=base_time + timedelta(seconds=port / 2),
            source_ip="192.0.2.10",
            destination_ip="192.0.2.20",
            ip_version=4,
            transport_protocol="tcp",
            source_port=50000,
            destination_port=port,
            tcp_flags=0x02,
            packet_length=60,
            dns_present=False,
        )
        for port in range(1, 13)
    ]

    iterator = iter(observations)
    received_alerts = []
    alert_received = Event()

    def parser(packet):
        return next(iterator)

    def alert_handler(alert):
        received_alerts.append(alert)
        alert_received.set()

    service = PacketCaptureService(
        sniffer_factory=FakeSniffer,
        parser=parser,
        alert_handler=alert_handler,
    )

    service.start("en0", ["192.0.2.0/24"])

    try:
        sniffer = service._sniffer

        for _ in observations:
            sniffer.callback(object())

        assert alert_received.wait(timeout=3)

    finally:
        stats = service.stop()

    assert stats.status == "stopped"
    assert stats.queued_packets == 12
    assert stats.processed_packets == 12
    assert stats.processing_errors == 0

    assert any(
        alert.rule_id == "NIDS-001"
        for alert in received_alerts
    )
