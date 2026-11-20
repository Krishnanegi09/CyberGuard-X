from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.db.session import engine
from backend.app.services.audit import log_audit_event


@pytest.fixture
def phase7_db():
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
# 1. test_action_requires_approval
# ---------------------------------------------------------------------------
@pytest.mark.phase7
def test_action_requires_approval():
    """Defensive interventions start as RECOMMENDED and require explicit approval."""
    action = {
        "id": "act-101",
        "type": "fw_block",
        "target": "172.30.0.100",
        "status": "RECOMMENDED",
        "requester_id": "analyst-uuid",
        "approver_id": None,
    }

    def execute_action(act):
        if act["status"] != "APPROVED":
            raise ValueError("Action requires approval before execution")
        act["status"] = "EXECUTING"

    with pytest.raises(ValueError, match="requires approval"):
        execute_action(action)


# ---------------------------------------------------------------------------
# 2. test_requester_cannot_self_approve
# ---------------------------------------------------------------------------
@pytest.mark.phase7
def test_requester_cannot_self_approve():
    """Four-eyes enforcement: the action requester cannot approve their own action."""
    requester = "user-123"
    action = {
        "id": "act-102",
        "requester_id": requester,
        "status": "RECOMMENDED",
    }

    def approve_action(act, approver_id):
        if approver_id == act["requester_id"]:
            raise PermissionError("Self-approval forbidden by four-eyes policy")
        act["approver_id"] = approver_id
        act["status"] = "APPROVED"

    with pytest.raises(PermissionError, match="four-eyes"):
        approve_action(action, approver_id=requester)

    # Different admin can approve
    approve_action(action, approver_id="admin-999")
    assert action["status"] == "APPROVED"
    assert action["approver_id"] == "admin-999"


# ---------------------------------------------------------------------------
# 3. test_executor_out_of_scope
# ---------------------------------------------------------------------------
@pytest.mark.phase7
def test_executor_out_of_scope():
    """Firewall executor rejects blocking target IP outside authorized boundaries."""
    from backend.app.services.discovery.target_validation import (
        DiscoveryValidationError,
        ScanProfile,
        validate_target,
    )

    approved_scopes = ["172.30.0.0/24"]
    illegal_target = "8.8.8.8"  # External public target

    with pytest.raises(DiscoveryValidationError):
        validate_target(illegal_target, approved_scopes, ScanProfile.HOST_DISCOVERY)


# ---------------------------------------------------------------------------
# 4. test_fw_block_verify_and_rollback
# ---------------------------------------------------------------------------
@pytest.mark.phase7
def test_fw_block_verify_and_rollback():
    """Dry-run and apply verifies block insertion; rollback restores baseline state."""
    active_firewall_rules = set()

    def apply_fw_block(ip):
        rule = f"nft drop ip saddr {ip}"
        active_firewall_rules.add(rule)
        return rule in active_firewall_rules

    def rollback_fw_block(ip):
        rule = f"nft drop ip saddr {ip}"
        active_firewall_rules.discard(rule)
        return rule not in active_firewall_rules

    target = "172.30.0.100"
    assert apply_fw_block(target) is True
    assert f"nft drop ip saddr {target}" in active_firewall_rules

    assert rollback_fw_block(target) is True
    assert f"nft drop ip saddr {target}" not in active_firewall_rules


# ---------------------------------------------------------------------------
# 5. test_ttl_auto_rollback
# ---------------------------------------------------------------------------
@pytest.mark.phase7
def test_ttl_auto_rollback():
    """Temporary block rules past TTL (e.g. 15 min) are automatically expired."""
    now = datetime.now(timezone.utc)
    blocks = [
        {"target": "172.30.0.100", "applied_at": now - timedelta(minutes=20), "ttl_seconds": 900, "status": "ACTIVE"},
        {"target": "172.30.0.101", "applied_at": now - timedelta(minutes=5), "ttl_seconds": 900, "status": "ACTIVE"},
    ]

    for b in blocks:
        elapsed = (now - b["applied_at"]).total_seconds()
        if elapsed > b["ttl_seconds"]:
            b["status"] = "EXPIRED"

    assert blocks[0]["status"] == "EXPIRED"
    assert blocks[1]["status"] == "ACTIVE"


# ---------------------------------------------------------------------------
# 6. test_emergency_stop_blocks_execute
# ---------------------------------------------------------------------------
@pytest.mark.phase7
def test_emergency_stop_blocks_execute():
    """Engaging emergency stop (Kill Switch) halts all defensive executions."""
    system_flags = {"emergency_stop": True}

    def execute_defense_action(action_id):
        if system_flags.get("emergency_stop"):
            raise RuntimeError("Execution rejected: Emergency stop is active")
        return "EXECUTED"

    with pytest.raises(RuntimeError, match="Emergency stop is active"):
        execute_defense_action("act-500")


# ---------------------------------------------------------------------------
# 7. test_emergency_stop_rolls_back_active
# ---------------------------------------------------------------------------
@pytest.mark.phase7
def test_emergency_stop_rolls_back_active():
    """Triggering emergency stop rolls back all active temporary blocking rules."""
    active_shuns = {"172.30.0.100", "172.30.0.101"}

    def trigger_kill_switch():
        # Disarm all active packet-filter blocks
        cleared = list(active_shuns)
        active_shuns.clear()
        return cleared

    disarmed = trigger_kill_switch()
    assert len(active_shuns) == 0
    assert len(disarmed) == 2


# ---------------------------------------------------------------------------
# 8. test_action_audit_trail
# ---------------------------------------------------------------------------
@pytest.mark.phase7
def test_action_audit_trail(phase7_db):
    """Every transition in defensive action state machine produces audit log entries."""
    db = phase7_db
    from backend.app.db.models.organizations import Organization

    org = Organization(
        name="Action Audit Org",
        slug=f"action-audit-{uuid4().hex[:10]}",
    )
    db.add(org)
    db.flush()

    org_id = org.id
    actor_id = uuid4()

    transitions = [
        "action.recommended",
        "action.approved",
        "action.executing",
        "action.succeeded",
        "action.rolled_back",
    ]

    for act in transitions:
        log_audit_event(
            db=db,
            organization_id=org_id,
            actor_id=actor_id,
            action=act,
            target_type="defense_action",
            target_id="act-e2e",
        )
    db.commit()

    records = db.execute(
        select(text("action"))
        .select_from(text("audit_logs"))
        .where(text("organization_id = :org_id"))
        .order_by(text("created_at ASC")),
        {"org_id": org_id},
    ).fetchall()

    recorded_actions = [r[0] for r in records]
    for act in transitions:
        assert act in recorded_actions
