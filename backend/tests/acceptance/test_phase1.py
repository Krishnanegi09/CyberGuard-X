from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.db.models.access_control import (
    Membership,
    MembershipRole,
    Role,
)
from backend.app.db.models.users import User
from backend.app.db.session import engine
from backend.app.main import app
from backend.app.services.audit import log_audit_event
from backend.app.services.jobs import (
    claim_job,
    enqueue_job,
    fail_job,
    reap_stale_jobs,
)


@pytest.fixture
def acceptance_context():
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


def create_user_record(connection, label):
    db = Session(
        bind=connection,
        autoflush=False,
        autocommit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        uid = f"{label}-{uuid4().hex}"
        email = f"{uid}@example.com"
        user = User(
            full_name="Phase 1 Acceptance User",
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


def auth_headers_for(monkeypatch, uid, email):
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


# ---------------------------------------------------------------------------
# 1. test_invalid_token
# ---------------------------------------------------------------------------
@pytest.mark.phase1
def test_invalid_token(acceptance_context, monkeypatch):
    client, _ = acceptance_context
    from firebase_admin import auth

    def raise_invalid(token):
        raise auth.InvalidIdTokenError("Invalid token")

    monkeypatch.setattr(
        "backend.app.api.deps.verify_firebase_id_token",
        raise_invalid,
    )
    response = client.get(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer invalid-garbage-token"},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# 2. test_revoked_token
# ---------------------------------------------------------------------------
@pytest.mark.phase1
def test_revoked_token(acceptance_context, monkeypatch):
    client, _ = acceptance_context
    from fastapi import HTTPException

    def raise_revoked(token):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    monkeypatch.setattr(
        "backend.app.api.deps.verify_firebase_id_token",
        raise_revoked,
    )
    response = client.get(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer revoked-token-123"},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# 3. test_cross_org_read_denied
# ---------------------------------------------------------------------------
@pytest.mark.phase1
@pytest.mark.cross_org
def test_cross_org_read_denied(acceptance_context, monkeypatch):
    client, connection = acceptance_context

    # Org A
    uid_a, email_a, _ = create_user_record(connection, "org-a-owner")
    headers_a = auth_headers_for(monkeypatch, uid_a, email_a)
    resp_a = client.post(
        "/api/v1/organizations",
        headers=headers_a,
        json={"name": "Org A", "slug": f"org-a-{uuid4().hex[:10]}"},
    )
    org_a_id = resp_a.json()["id"]

    # Org B
    uid_b, email_b, _ = create_user_record(connection, "org-b-owner")
    headers_b = auth_headers_for(monkeypatch, uid_b, email_b)
    resp_b = client.post(
        "/api/v1/organizations",
        headers=headers_b,
        json={"name": "Org B", "slug": f"org-b-{uuid4().hex[:10]}"},
    )
    org_b_id = resp_b.json()["id"]

    # User A tries to read Org B scopes
    headers_a = auth_headers_for(monkeypatch, uid_a, email_a)
    cross_read = client.get(
        f"/api/v1/organizations/{org_b_id}/network-scopes",
        headers=headers_a,
    )
    assert cross_read.status_code == 403


# ---------------------------------------------------------------------------
# 4. test_cross_org_write_denied
# ---------------------------------------------------------------------------
@pytest.mark.phase1
@pytest.mark.cross_org
def test_cross_org_write_denied(acceptance_context, monkeypatch):
    client, connection = acceptance_context

    # Org A and Org B
    uid_a, email_a, _ = create_user_record(connection, "org-a-writer")
    headers_a = auth_headers_for(monkeypatch, uid_a, email_a)
    resp_a = client.post(
        "/api/v1/organizations",
        headers=headers_a,
        json={"name": "Org A Write", "slug": f"org-aw-{uuid4().hex[:10]}"},
    )
    org_a_id = resp_a.json()["id"]

    uid_b, email_b, _ = create_user_record(connection, "org-b-writer")
    headers_b = auth_headers_for(monkeypatch, uid_b, email_b)
    resp_b = client.post(
        "/api/v1/organizations",
        headers=headers_b,
        json={"name": "Org B Target", "slug": f"org-bw-{uuid4().hex[:10]}"},
    )
    org_b_id = resp_b.json()["id"]

    # User A attempts to write network scope into Org B
    headers_a = auth_headers_for(monkeypatch, uid_a, email_a)
    cross_write = client.post(
        f"/api/v1/organizations/{org_b_id}/network-scopes",
        headers=headers_a,
        json={
            "name": "Unauthorized Scope",
            "description": "Cross-org injection attempt",
            "cidr_ranges": ["10.10.10.0/24"],
        },
    )
    assert cross_write.status_code == 403


# ---------------------------------------------------------------------------
# 5. test_role_escalation
# ---------------------------------------------------------------------------
@pytest.mark.phase1
def test_role_escalation(acceptance_context, monkeypatch):
    client, connection = acceptance_context

    # Create Org with Owner
    owner_uid, owner_email, _ = create_user_record(connection, "escalate-owner")
    owner_headers = auth_headers_for(monkeypatch, owner_uid, owner_email)
    org_resp = client.post(
        "/api/v1/organizations",
        headers=owner_headers,
        json={"name": "Escalate Org", "slug": f"esc-org-{uuid4().hex[:10]}"},
    )
    org_id = org_resp.json()["id"]

    # Create Viewer User and assign Viewer membership
    viewer_uid, viewer_email, viewer_id = create_user_record(connection, "escalate-viewer")

    db = Session(bind=connection)
    try:
        viewer_role = db.execute(
            select(Role).where(
                Role.organization_id == org_id,
                Role.name == "Viewer",
            )
        ).scalar_one()

        membership = Membership(
            organization_id=org_id,
            user_id=viewer_id,
            status="active",
        )
        db.add(membership)
        db.flush()

        db.add(MembershipRole(
            membership_id=membership.id,
            role_id=viewer_role.id,
            organization_id=org_id,
        ))
        db.commit()
    finally:
        db.close()

    # Viewer attempts privileged action: creating network scope (needs network_scopes.manage)
    viewer_headers = auth_headers_for(monkeypatch, viewer_uid, viewer_email)
    escalate_resp = client.post(
        f"/api/v1/organizations/{org_id}/network-scopes",
        headers=viewer_headers,
        json={
            "name": "Viewer Scope Attempt",
            "cidr_ranges": ["192.168.1.0/24"],
        },
    )
    assert escalate_resp.status_code == 403


# ---------------------------------------------------------------------------
# 6. test_audit_immutable
# ---------------------------------------------------------------------------
@pytest.mark.phase1
def test_audit_immutable(acceptance_context):
    _, connection = acceptance_context
    db = Session(bind=connection)
    try:
        event_1 = log_audit_event(
            db=db,
            action="security.baseline_established_1",
            target_type="system",
            payload={"initial": True},
        )
        event_2 = log_audit_event(
            db=db,
            action="security.baseline_established_2",
            target_type="system",
            payload={"initial": True},
        )
        db.flush()
        id_1 = event_1.id
        id_2 = event_2.id

        # Attempt UPDATE on audit log record (must be blocked by DB trigger)
        with pytest.raises(Exception) as exc_update:
            with db.begin_nested():
                db.execute(
                    text("UPDATE audit_logs SET action = 'tampered' WHERE id = :id"),
                    {"id": id_1},
                )
        assert "audit_logs is append-only" in str(exc_update.value)

        # Attempt DELETE on audit log record (must be blocked by DB trigger)
        with pytest.raises(Exception) as exc_delete:
            with db.begin_nested():
                db.execute(
                    text("DELETE FROM audit_logs WHERE id = :id"),
                    {"id": id_2},
                )
        assert "audit_logs is append-only" in str(exc_delete.value)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 7. test_job_retry_and_dead
# ---------------------------------------------------------------------------
@pytest.mark.phase1
def test_job_retry_and_dead(acceptance_context):
    _, connection = acceptance_context
    db = Session(bind=connection)
    try:
        job = enqueue_job(
            db=db,
            type="scan.run",
            payload={"target": "10.0.0.0/28"},
            max_attempts=2,
        )
        db.commit()
        job_id = job.id

        # Attempt 1: Claim and fail
        claimed = claim_job(db, "worker-test-1")
        assert claimed is not None
        assert claimed.id == job_id
        assert claimed.status == "RUNNING"
        db.commit()

        failed_1 = fail_job(db, job_id, "Temporary network timeout")
        assert failed_1.status == "QUEUED"
        assert failed_1.attempts == 1
        db.commit()

        # Reset run_after so it is immediately claimable for attempt 2
        job_record = db.get(type(failed_1), job_id)
        job_record.run_after = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

        # Attempt 2: Claim and fail (hits max_attempts=2 -> DEAD)
        claimed_2 = claim_job(db, "worker-test-1")
        assert claimed_2 is not None
        failed_2 = fail_job(db, job_id, "Fatal host unreachable")
        assert failed_2.status == "DEAD"
        assert failed_2.attempts == 2
        assert failed_2.finished_at is not None
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 8. test_job_reaper
# ---------------------------------------------------------------------------
@pytest.mark.phase1
def test_job_reaper(acceptance_context):
    _, connection = acceptance_context
    db = Session(bind=connection)
    try:
        job = enqueue_job(
            db=db,
            type="detect.window",
            payload={"window": "5m"},
            timeout_s=5,
            max_attempts=3,
        )
        db.commit()
        job_id = job.id

        claimed = claim_job(db, "worker-reaper-target")
        assert claimed is not None
        assert claimed.id == job_id
        db.commit()

        # Backdate locked_at by 30 seconds (exceeding timeout_s=5)
        db.execute(
            text("UPDATE jobs SET locked_at = :stale WHERE id = :id"),
            {"stale": datetime.now(timezone.utc) - timedelta(seconds=30), "id": job_id},
        )
        db.commit()

        reaped_jobs = reap_stale_jobs(db)
        reaped_ids = [j.id for j in reaped_jobs]
        assert job_id in reaped_ids

        db.refresh(claimed)
        assert claimed.status == "QUEUED"
        assert claimed.locked_by is None
        assert "timed out" in (claimed.last_error or "")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 9. test_error_envelope
# ---------------------------------------------------------------------------
@pytest.mark.phase1
def test_error_envelope(acceptance_context, monkeypatch):
    client, connection = acceptance_context
    uid, email, _ = create_user_record(connection, "envelope-user")
    headers = auth_headers_for(monkeypatch, uid, email)

    # Missing required 'name' field
    response = client.post(
        "/api/v1/organizations",
        headers=headers,
        json={"slug": "missing-name-org"},
    )
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert isinstance(data["detail"], list)
    assert len(data["detail"]) > 0
    assert any("name" in str(err) for err in data["detail"])


# ---------------------------------------------------------------------------
# 10. test_scope_violation
# ---------------------------------------------------------------------------
@pytest.mark.phase1
def test_scope_violation(acceptance_context, monkeypatch):
    client, connection = acceptance_context
    uid, email, _ = create_user_record(connection, "scope-violator")
    headers = auth_headers_for(monkeypatch, uid, email)

    # Create Org
    org_resp = client.post(
        "/api/v1/organizations",
        headers=headers,
        json={"name": "Scope Test Org", "slug": f"scope-org-{uuid4().hex[:10]}"},
    )
    org_id = org_resp.json()["id"]

    # Register approved scope: 192.168.10.0/24
    scope_resp = client.post(
        f"/api/v1/organizations/{org_id}/network-scopes",
        headers=headers,
        json={
            "name": "Approved Scope",
            "cidr_ranges": ["192.168.10.0/24"],
        },
    )
    scope_id = scope_resp.json()["id"]

    # Launch scan for out-of-scope target: 10.99.99.0/24
    scan_resp = client.post(
        f"/api/v1/organizations/{org_id}/network-scopes/{scope_id}/scans",
        headers=headers,
        json={
            "target_cidr": "10.99.99.0/24",
            "profile": "host_discovery",
        },
    )
    assert scan_resp.status_code in (400, 422)
    assert "outside" in scan_resp.text.lower() or "not completely" in scan_resp.text.lower() or "approved" in scan_resp.text.lower()

