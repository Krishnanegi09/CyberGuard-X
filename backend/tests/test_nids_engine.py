from datetime import datetime, timedelta, timezone

from backend.app.services.monitoring.nids_engine import NIDSEngine
from backend.app.services.monitoring.packet_parser import PacketObservation

BASE_TIME = datetime(2026, 11, 19, 10, 0, tzinfo=timezone.utc)


def make_observation(
    *,
    source="192.168.1.10",
    destination="192.168.1.20",
    protocol="tcp",
    destination_port=80,
    flags=2,
    seconds=0,
):
    return PacketObservation(
        captured_at=BASE_TIME + timedelta(seconds=seconds),
        source_ip=source,
        destination_ip=destination,
        ip_version=4,
        transport_protocol=protocol,
        source_port=50000,
        destination_port=destination_port,
        tcp_flags=flags if protocol == "tcp" else None,
        packet_length=60,
        dns_present=False,
    )


def test_detects_tcp_syn_port_scan():
    engine = NIDSEngine()

    alerts = []

    for port in range(1, 13):
        alerts.extend(
            engine.process(
                make_observation(
                    destination_port=port,
                    seconds=port / 2,
                )
            )
        )

    assert any(alert.rule_id == "NIDS-001" for alert in alerts)


def test_detects_udp_port_scan():
    engine = NIDSEngine()

    alerts = []

    for port in range(1, 16):
        alerts.extend(
            engine.process(
                make_observation(
                    protocol="udp",
                    destination_port=port,
                    seconds=port,
                )
            )
        )

    assert any(alert.rule_id == "NIDS-002" for alert in alerts)


def test_detects_network_port_sweep():
    engine = NIDSEngine()

    alerts = []

    for index in range(8):
        alerts.extend(
            engine.process(
                make_observation(
                    protocol="udp",
                    destination=f"192.168.1.{20 + index}",
                    destination_port=443,
                    seconds=index,
                )
            )
        )

    assert any(alert.rule_id == "NIDS-003" for alert in alerts)


def test_ignores_non_tcp_udp_protocol():
    engine = NIDSEngine()

    observation = make_observation()
    observation = PacketObservation(
        captured_at=observation.captured_at,
        source_ip=observation.source_ip,
        destination_ip=observation.destination_ip,
        ip_version=4,
        transport_protocol="other",
        source_port=None,
        destination_port=None,
        tcp_flags=None,
        packet_length=60,
        dns_present=False,
    )

    assert engine.process(observation) == ()


def test_stats_track_processed_observations():
    engine = NIDSEngine()

    engine.process(make_observation())

    stats = engine.stats()

    assert stats["observations_processed"] == 1
    assert stats["tracked_sources"] == 1
    assert stats["alerts_generated"] == 0
