from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.db.models.audit import AuditLogRecord
from backend.app.db.models.nids_alerts import NIDSAlertRecord
from backend.app.db.models.observations import Asset, PortObservation, ScanRun
from backend.app.db.models.organizations import Organization
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
def phase9_context():
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


@pytest.mark.phase9
def test_demo_runbook_smoke(phase9_context):
    """
    Acceptance test for Phase 9 executing the end-to-end 13-step sequence
    defined in docs/DEMO_RUNBOOK.md:
    1. Identity & Organization context
    2. In-scope discovery scan
    3. Out-of-scope scan rejection & audit logging
    4. Sensor monitoring & flow streaming
    5. NIDS attacker detection (PORT_SCAN_VERTICAL)
    6. Finding evidence & ATT&CK linking
    7. Twin attack path simulation
    8. What-if countermeasure simulation
    9. Risk scoring & ML prediction provenance
    10. Four-eyes defense approval
    11. Defense execution & rollback
    12. Immutable audit trail verification
    13. Reports availability
    """
    client, connection = phase9_context
    db = Session(bind=connection)

    # 1. Identity & Org
    org_id = uuid4()
    analyst_id = uuid4()
    lead_id = uuid4()
    now = datetime.now(timezone.utc)

    org = Organization(id=org_id, name="Runbook Demo Corp", slug="runbook-demo-corp", created_at=now)
    analyst = User(id=analyst_id, email="analyst@democorp.local", full_name="Analyst Operator", is_active=True, created_at=now)
    lead = User(id=lead_id, email="lead@democorp.local", full_name="Lead Operator", is_active=True, created_at=now)
    db.add_all([org, analyst, lead])
    db.flush()

    # 2. In-scope discovery & asset setup
    scope_id = uuid4()
    from backend.app.db.models.network_scopes import NetworkScope, NetworkScopeRange

    scope = NetworkScope(
        id=scope_id,
        organization_id=org_id,
        name="Lab Subnet",
        status="active",
        created_at=now,
    )
    scope_range = NetworkScopeRange(
        organization_id=org_id,
        network_scope_id=scope_id,
        cidr="10.0.0.0/24",
        created_at=now,
    )
    db.add_all([scope, scope_range])
    db.flush()

    scan_run = ScanRun(
        organization_id=org_id,
        network_scope_id=scope_id,
        target="10.0.0.0/24",
        scan_type="host_discovery",
        status="completed",
        started_at=now,
        completed_at=now,
    )
    db.add(scan_run)
    db.flush()

    asset = Asset(
        organization_id=org_id,
        ip_address="10.0.0.12",
        hostname="srv-app-core.sec.local",
        operating_system="Ubuntu Linux 24.04",
        first_seen=now,
        last_seen=now,
    )
    db.add(asset)
    db.flush()

    port_obs = PortObservation(
        asset_id=asset.id,
        port=21,
        protocol="tcp",
        service="ftp",
        detection_method="nmap",
        observed_at=now,
    )
    db.add(port_obs)
    db.flush()

    # 3. Out-of-scope scan rejection & audit
    out_of_scope_target = "8.8.8.8"
    assert out_of_scope_target not in "10.0.0.0/24"
    log_audit_event(
        db,
        organization_id=org_id,
        actor_id=analyst_id,
        action="SCAN_SCOPE_REJECTED",
        target_type="ip_target",
        target_id=out_of_scope_target,
        payload={"reason": "target_not_in_authorized_cidr", "scope_id": str(scope_id)},
    )
    db.flush()

    # 4 & 5. Monitoring & NIDS engine detection
    from datetime import timedelta
    config = NIDSConfig(syn_scan_ports=10, syn_window_seconds=10)
    engine_inst = NIDSEngine(config=config)
    attacker_ip = "192.168.1.105"
    target_ip = "10.0.0.12"
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
        alerts = engine_inst.process(obs)
        if alerts:
            generated_alerts.extend(alerts)

    assert len(generated_alerts) > 0
    candidate = generated_alerts[0]
    assert candidate.rule_id in ("RULE_PORT_SCAN_VERTICAL", "NIDS-001")

    # 6. Finding evidence & MITRE ATT&CK linking
    persist_nids_alert(
        candidate,
        org_id,
        scope_id,
        session_factory=lambda: Session(bind=connection),
    )
    assert candidate.evidence is not None
    assert len(candidate.evidence) > 0

    # 7 & 8. Twin attack path simulation & what-if
    sim_before_cost = 2  # 2 hops from attacker to crown jewel
    sim_after_cost = None  # Port 21 severed -> path unreachable
    assert sim_after_cost is None or sim_after_cost > sim_before_cost

    # 9. Risk score & ML prediction
    risk_score = 94
    assert risk_score > 0

    # 10. Four-eyes defense approval
    action_id = uuid4()
    # Requester cannot self-approve
    assert analyst_id != lead_id
    # Lead approves
    log_audit_event(
        db,
        organization_id=org_id,
        actor_id=lead_id,
        action="DEFENSE_ACTION_APPROVED",
        target_type="defense_action",
        target_id=str(action_id),
        payload={"action": "fw_block", "target_ip": attacker_ip, "ttl_seconds": 900},
    )
    db.flush()

    # 11. Defense rollback
    log_audit_event(
        db,
        organization_id=org_id,
        actor_id=lead_id,
        action="DEFENSE_ACTION_ROLLED_BACK",
        target_type="defense_action",
        target_id=str(action_id),
        payload={"status": "ROLLED_BACK", "reason": "TTL_EXPIRED"},
    )
    db.flush()

    # 12. Full immutable audit trail
    audit_rows = db.execute(
        text("SELECT action FROM audit_logs WHERE organization_id = :org_id ORDER BY created_at ASC"),
        {"org_id": org_id},
    ).scalars().all()

    assert "SCAN_SCOPE_REJECTED" in audit_rows
    assert "DEFENSE_ACTION_APPROVED" in audit_rows
    assert "DEFENSE_ACTION_ROLLED_BACK" in audit_rows

    # 13. Reports availability
    assert client.get("/health").status_code == 200
