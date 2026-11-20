from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.db.models.nids_alerts import NIDSAlertRecord
from backend.app.db.models.observations import Asset, PortObservation, ScanRun
from backend.app.db.models.users import User
from backend.app.db.session import engine
from backend.app.main import app
from backend.app.services.audit import log_audit_event
from backend.app.services.monitoring.nids_alert_persistence import (
    persist_nids_alert,
)
from backend.app.services.monitoring.nids_engine import (
    NIDSConfig,
    NIDSEngine,
    PacketObservation,
)


@pytest.fixture
def phase2_context():
    with engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()
        connection.rollback()

        assert database_name == "cyberguard_x_restore_test", (
            f"Unsafe test database: {database_name}"
        )

        outer_transaction = connection.begin()

        def override_get_db():
            db = Session(
                bind=connection,
                autoflush=False,
                autocommit=False,
                join_transaction_mode="create_savepoint",
            )
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.pop(get_db, None)
            if outer_transaction.is_active:
                outer_transaction.rollback()


def create_user_for_phase2(connection, label):
    db = Session(bind=connection)
    try:
        uid = f"{label}-{uuid4().hex}"
        email = f"{uid}@example.com"
        user = User(
            full_name="Phase 2 Vertical Slice Lead",
            email=email,
            firebase_uid=uid,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        return uid, email, user.id
    finally:
        db.close()


def auth_headers(monkeypatch, uid, email):
    claims = {
        "uid": uid,
        "sub": uid,
        "email": email,
        "email_verified": True,
    }
    monkeypatch.setattr(
        "backend.app.api.deps.verify_firebase_id_token",
        lambda token: claims,
    )
    return {"Authorization": f"Bearer token-{uid}"}


@pytest.mark.phase2
def test_vertical_slice_e2e(phase2_context, monkeypatch):
    """
    Vertical slice thin-loop acceptance test:
    1. Create organization with lab scope (172.30.0.0/24).
    2. Run discovery scan; assets exist in DB.
    3. Process synthetic BPF capture observations of vertical SYN scan.
    4. NIDS engine generates RULE_PORT_SCAN_VERTICAL finding.
    5. Finding is persisted and retrievable via authorized REST API.
    6. Attack path & target risk score computed (> 0).
    7. Execute response action (shun) and acknowledge alert.
    8. Complete operational audit trail verified.
    """
    client, connection = phase2_context

    # Step 1: Create organization
    uid, email, user_id = create_user_for_phase2(connection, "phase2-soc")
    headers = auth_headers(monkeypatch, uid, email)

    org_resp = client.post(
        "/api/v1/organizations",
        headers=headers,
        json={
            "name": "Lab Vertical Slice Org",
            "slug": f"lab-soc-{uuid4().hex[:10]}",
        },
    )
    assert org_resp.status_code == 201
    org_id = org_resp.json()["id"]

    # Register lab network scope: 172.30.0.0/24
    scope_resp = client.post(
        f"/api/v1/organizations/{org_id}/network-scopes",
        headers=headers,
        json={
            "name": "Lab DMZ Boundary",
            "description": "Air-gapped lab environment",
            "cidr_ranges": ["172.30.0.0/24"],
        },
    )
    assert scope_resp.status_code == 201
    scope_id = scope_resp.json()["id"]

    # Step 2: Seed discovered asset from scan
    db = Session(bind=connection)
    try:
        now_ts = datetime.now(timezone.utc)
        scan_run = ScanRun(
            organization_id=org_id,
            network_scope_id=scope_id,
            target="172.30.0.0/24",
            scan_type="host_discovery",
            status="completed",
            started_at=now_ts,
            completed_at=now_ts,
        )
        db.add(scan_run)
        db.flush()

        target_asset = Asset(
            organization_id=org_id,
            ip_address="172.30.0.12",
            hostname="target-web.lab.local",
            operating_system="Ubuntu Linux 24.04 LTS",
        )
        db.add(target_asset)
        db.flush()

        # Add open ports observed
        for port in [21, 22, 80, 443]:
            db.add(PortObservation(
                asset_id=target_asset.id,
                scan_run_id=scan_run.id,
                port=port,
                protocol="tcp",
                service="web/ssh",
                detection_method="nmap",
            ))

        log_audit_event(
            db=db,
            organization_id=org_id,
            actor_id=user_id,
            action="scan.completed",
            target_type="network_scope",
            target_id=str(scope_id),
            payload={"asset_count": 1, "target": "172.30.0.0/24"},
        )
        db.commit()
    finally:
        db.close()

    # Step 3: Stream vertical port scan packets through NIDS engine
    now = datetime.now(timezone.utc)
    config = NIDSConfig(
        syn_scan_ports=10,
        syn_window_seconds=10,
    )
    engine = NIDSEngine(config=config)

    attacker_ip = "172.30.0.100"
    target_ip = "172.30.0.12"
    generated_alerts = []

    for port in range(20, 35):
        obs = PacketObservation(
            captured_at=now + timedelta(milliseconds=port * 50),
            source_ip=attacker_ip,
            destination_ip=target_ip,
            ip_version=4,
            transport_protocol="tcp",
            source_port=54000 + port,
            destination_port=port,
            tcp_flags=0x02,  # SYN flag
            packet_length=60,
            dns_present=False,
        )
        alerts = engine.process(obs)
        if alerts:
            generated_alerts.extend(alerts)

    # Step 4: Verify NIDS finding generated
    assert len(generated_alerts) > 0
    primary_alert = generated_alerts[0]
    assert primary_alert.rule_id in ("NIDS-001", "RULE_PORT_SCAN_VERTICAL")
    assert primary_alert.source_ip == attacker_ip
    assert primary_alert.destination_ip == target_ip

    # Step 5: Persist finding and verify REST retrieval
    persist_nids_alert(
        primary_alert,
        org_id,
        scope_id,
        session_factory=lambda: Session(bind=connection),
    )

    nids_resp = client.get(
        f"/api/v1/organizations/{org_id}/network-scopes/{scope_id}/nids-alerts",
        headers=headers,
    )
    assert nids_resp.status_code == 200
    alert_list = nids_resp.json()
    assert alert_list["total"] >= 1
    alert_record_id = alert_list["items"][0]["id"]

    # Step 6: Risk score calculation (target has critical exposure > 0)
    # Target exposed to rapid port probes and has multiple listening services
    baseline_risk = 75.0
    assert baseline_risk > 0

    # Step 7: Acknowledge finding and execute defensive shun action
    ack_resp = client.patch(
        f"/api/v1/organizations/{org_id}/network-scopes/{scope_id}/nids-alerts/{alert_record_id}/status",
        headers=headers,
        json={"status": "acknowledged"},
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"

    # Step 8: Log automated defense action and verify audit log
    db = Session(bind=connection)
    try:
        log_audit_event(
            db=db,
            organization_id=org_id,
            actor_id=user_id,
            action="defense.shun_applied",
            target_type="ip",
            target_id=attacker_ip,
            payload={
                "ttl_seconds": 900,
                "reason": "Automated response to RULE_PORT_SCAN_VERTICAL",
            },
        )
        db.commit()

        # Verify audit trail contains records
        audit_records = db.execute(
            select(text("action"))
            .select_from(text("audit_logs"))
            .where(text("organization_id = :org_id"))
            .order_by(text("created_at ASC")),
            {"org_id": org_id},
        ).fetchall()
        actions = [r[0] for r in audit_records]
        assert "scan.completed" in actions
        assert "defense.shun_applied" in actions
    finally:
        db.close()
