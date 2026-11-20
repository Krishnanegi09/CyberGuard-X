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
from backend.app.db.models.observations import ScanRun
from backend.app.db.models.users import User
from backend.app.db.session import engine
from backend.app.main import app


@pytest.fixture
def discovery_api_context():
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


def create_user(connection, label):
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
            full_name="Discovery API Test User",
            email=email,
            firebase_uid=uid,
            password_hash=None,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        return uid, email, user.id
    finally:
        db.close()


def authenticate(monkeypatch, uid, email):
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
    return {"Authorization": "Bearer test-firebase-token"}


def create_organization(client, connection, monkeypatch):
    uid, email, _ = create_user(connection, "discovery-owner")
    headers = authenticate(monkeypatch, uid, email)

    response = client.post(
        "/api/v1/organizations",
        headers=headers,
        json={
            "name": "Discovery API Test Organization",
            "slug": f"discovery-api-{uuid4().hex[:12]}",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"], headers


def create_scope(client, organization_id, headers, status="active"):
    response = client.post(
        f"/api/v1/organizations/{organization_id}/network-scopes",
        headers=headers,
        json={
            "name": f"Discovery Scope {uuid4().hex[:8]}",
            "description": "Test-only approved CIDR range",
            "cidr_ranges": ["192.168.10.0/24"],
        },
    )
    assert response.status_code == 201, response.text
    scope = response.json()

    if status == "disabled":
        disabled = client.patch(
            f"/api/v1/organizations/{organization_id}"
            f"/network-scopes/{scope['id']}/status",
            headers=headers,
            json={"status": "disabled"},
        )
        assert disabled.status_code == 200, disabled.text
        scope = disabled.json()

    return scope


def scan_endpoint(organization_id, scope_id):
    return (
        f"/api/v1/organizations/{organization_id}"
        f"/network-scopes/{scope_id}/scans"
    )


def test_create_scan_returns_queued_record_without_running_nmap(
    discovery_api_context,
    monkeypatch,
):
    client, connection = discovery_api_context

    # The API test must never execute a real network scan.
    monkeypatch.setattr(
        "backend.app.api.v1.discovery.execute_discovery_scan",
        lambda scan_run_id: None,
    )

    organization_id, headers = create_organization(
        client, connection, monkeypatch
    )
    scope = create_scope(client, organization_id, headers)

    response = client.post(
        scan_endpoint(organization_id, scope["id"]),
        headers=headers,
        json={
            "target_cidr": "192.168.10.0/28",
            "profile": "host_discovery",
        },
    )

    assert response.status_code == 202, response.text
    scan = response.json()

    assert scan["organization_id"] == organization_id
    assert scan["network_scope_id"] == scope["id"]
    assert scan["target"] == "192.168.10.0/28"
    assert scan["scan_type"] == "HOST_DISCOVERY"
    assert scan["status"] == "queued"
    assert scan["completed_at"] is None
    assert scan["error_message"] is None

    db = Session(
        bind=connection,
        autoflush=False,
        autocommit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        stored = db.scalar(
            select(ScanRun).where(ScanRun.id == scan["id"])
        )
        assert stored is not None
        assert stored.status == "queued"
        assert stored.organization_id is not None
        assert stored.network_scope_id is not None
        assert stored.configuration_hash
        assert len(stored.configuration_hash) == 64
        assert stored.scan_arguments
    finally:
        db.close()


def test_scan_rejects_target_outside_approved_scope(
    discovery_api_context,
    monkeypatch,
):
    client, connection = discovery_api_context
    organization_id, headers = create_organization(
        client, connection, monkeypatch
    )
    scope = create_scope(client, organization_id, headers)

    response = client.post(
        scan_endpoint(organization_id, scope["id"]),
        headers=headers,
        json={
            "target_cidr": "192.168.20.0/28",
            "profile": "host_discovery",
        },
    )

    assert response.status_code == 422, response.text
    assert "approved network scope" in response.json()["detail"]


def test_scan_rejects_target_larger_than_address_limit(
    discovery_api_context,
    monkeypatch,
):
    client, connection = discovery_api_context
    organization_id, headers = create_organization(
        client, connection, monkeypatch
    )
    scope = create_scope(client, organization_id, headers)

    response = client.post(
        scan_endpoint(organization_id, scope["id"]),
        headers=headers,
        json={
            "target_cidr": "192.168.10.0/23",
            "profile": "host_discovery",
        },
    )

    assert response.status_code == 422, response.text


def test_disabled_scope_cannot_be_scanned(
    discovery_api_context,
    monkeypatch,
):
    client, connection = discovery_api_context
    organization_id, headers = create_organization(
        client, connection, monkeypatch
    )
    scope = create_scope(
        client,
        organization_id,
        headers,
        status="disabled",
    )

    response = client.post(
        scan_endpoint(organization_id, scope["id"]),
        headers=headers,
        json={
            "target_cidr": "192.168.10.0/28",
            "profile": "host_discovery",
        },
    )

    assert response.status_code == 409, response.text


def test_viewer_cannot_start_discovery_scan(
    discovery_api_context,
    monkeypatch,
):
    client, connection = discovery_api_context
    organization_id, _ = create_organization(
        client, connection, monkeypatch
    )
    owner_uid, owner_email, _ = create_user(
        connection, "discovery-owner-extra"
    )
    owner_headers = authenticate(
        monkeypatch, owner_uid, owner_email
    )

    # Create the scope using the actual organization owner.
    # Retrieve the original owner from the organization membership.
    from backend.app.db.models.access_control import Membership
    from backend.app.db.models.organizations import Organization

    db = Session(
        bind=connection,
        autoflush=False,
        autocommit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        organization = db.get(Organization, organization_id)
        assert organization is not None
        owner_membership = db.scalar(
            select(Membership).where(
                Membership.organization_id == organization.id
            )
        )
        assert owner_membership is not None
        owner_user = db.get(User, owner_membership.user_id)
        assert owner_user is not None
        owner_uid = owner_user.firebase_uid
        owner_email = owner_user.email
    finally:
        db.close()

    owner_headers = authenticate(
        monkeypatch, owner_uid, owner_email
    )
    scope = create_scope(client, organization_id, owner_headers)

    viewer_uid, viewer_email, viewer_id = create_user(
        connection, "discovery-viewer"
    )

    db = Session(
        bind=connection,
        autoflush=False,
        autocommit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        viewer_role = db.scalar(
            select(Role).where(
                Role.organization_id == organization_id,
                Role.name == "Viewer",
            )
        )
        assert viewer_role is not None

        membership = Membership(
            organization_id=organization_id,
            user_id=viewer_id,
            status="active",
        )
        db.add(membership)
        db.flush()

        db.add(
            MembershipRole(
                organization_id=organization_id,
                membership_id=membership.id,
                role_id=viewer_role.id,
            )
        )
        db.commit()
    finally:
        db.close()

    viewer_headers = authenticate(
        monkeypatch, viewer_uid, viewer_email
    )

    response = client.post(
        scan_endpoint(organization_id, scope["id"]),
        headers=viewer_headers,
        json={
            "target_cidr": "192.168.10.0/28",
            "profile": "host_discovery",
        },
    )

    assert response.status_code == 403, response.text


def test_user_outside_organization_cannot_list_scan_history(
    discovery_api_context,
    monkeypatch,
):
    client, connection = discovery_api_context
    organization_id, headers = create_organization(
        client, connection, monkeypatch
    )
    scope = create_scope(client, organization_id, headers)

    other_uid, other_email, _ = create_user(
        connection, "discovery-outsider"
    )
    other_headers = authenticate(
        monkeypatch, other_uid, other_email
    )

    response = client.get(
        scan_endpoint(organization_id, scope["id"]),
        headers=other_headers,
    )

    assert response.status_code == 403, response.text


def test_list_scan_history_returns_empty_list_for_new_scope(
    discovery_api_context,
    monkeypatch,
):
    client, connection = discovery_api_context
    organization_id, headers = create_organization(
        client, connection, monkeypatch
    )
    scope = create_scope(client, organization_id, headers)

    response = client.get(
        scan_endpoint(organization_id, scope["id"]),
        headers=headers,
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"items": [], "total": 0}
