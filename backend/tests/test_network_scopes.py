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


@pytest.fixture
def network_scope_test_context():
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


def create_user(connection, label="scope-owner"):
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
            full_name="Network Scope Test User",
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


def create_organization(client, monkeypatch, connection):
    uid, email, user_id = create_user(connection)

    headers = authenticate(monkeypatch, uid, email)

    response = client.post(
        "/api/v1/organizations",
        headers=headers,
        json={
            "name": "Network Scope Test Organization",
            "slug": f"scope-test-{uuid4().hex[:12]}",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()["id"], headers


def test_create_and_list_network_scope_with_ipv4_and_ipv6(
    network_scope_test_context,
    monkeypatch,
):
    client, connection = network_scope_test_context

    organization_id, headers = create_organization(
        client, monkeypatch, connection
    )

    payload = {
        "name": "Approved Internal Network",
        "description": "Authorized test network ranges",
        "cidr_ranges": [
            "192.168.10.0/24",
            "2001:db8:abcd::/48",
        ],
    }

    create_response = client.post(
        f"/api/v1/organizations/{organization_id}/network-scopes",
        headers=headers,
        json=payload,
    )

    assert create_response.status_code == 201, create_response.text

    created = create_response.json()

    assert created["name"] == payload["name"]
    assert created["description"] == payload["description"]
    assert created["status"] == "active"
    assert set(created["cidr_ranges"]) == set(payload["cidr_ranges"])
    assert created["organization_id"] == organization_id

    list_response = client.get(
        f"/api/v1/organizations/{organization_id}/network-scopes",
        headers=headers,
    )

    assert list_response.status_code == 200, list_response.text
    scopes = list_response.json()

    assert len(scopes) == 1
    assert scopes[0]["id"] == created["id"]
    assert set(scopes[0]["cidr_ranges"]) == set(payload["cidr_ranges"])


@pytest.mark.parametrize(
    "cidr",
    [
        "not-a-cidr",
        "192.168.10.5/24",
        "2001:db8::1/64",
        "",
    ],
)
def test_invalid_cidr_is_rejected(
    network_scope_test_context,
    monkeypatch,
    cidr,
):
    client, connection = network_scope_test_context

    organization_id, headers = create_organization(
        client, monkeypatch, connection
    )

    response = client.post(
        f"/api/v1/organizations/{organization_id}/network-scopes",
        headers=headers,
        json={
            "name": "Invalid Scope",
            "cidr_ranges": [cidr],
        },
    )

    assert response.status_code == 422, response.text


def test_duplicate_scope_name_returns_conflict(
    network_scope_test_context,
    monkeypatch,
):
    client, connection = network_scope_test_context

    organization_id, headers = create_organization(
        client, monkeypatch, connection
    )

    endpoint = (
        f"/api/v1/organizations/{organization_id}/network-scopes"
    )

    first = client.post(
        endpoint,
        headers=headers,
        json={
            "name": "Duplicate Name Test",
            "cidr_ranges": ["10.10.0.0/16"],
        },
    )
    assert first.status_code == 201, first.text

    second = client.post(
        endpoint,
        headers=headers,
        json={
            "name": "Duplicate Name Test",
            "cidr_ranges": ["10.20.0.0/16"],
        },
    )

    assert second.status_code == 409, second.text


def test_viewer_cannot_create_network_scope(
    network_scope_test_context,
    monkeypatch,
):
    client, connection = network_scope_test_context

    organization_id, _ = create_organization(
        client, monkeypatch, connection
    )

    viewer_uid, viewer_email, viewer_id = create_user(
        connection, "scope-viewer"
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
        f"/api/v1/organizations/{organization_id}/network-scopes",
        headers=viewer_headers,
        json={
            "name": "Unauthorized Scope",
            "cidr_ranges": ["10.30.0.0/16"],
        },
    )

    assert response.status_code == 403, response.text


def test_user_from_another_organization_cannot_list_scopes(
    network_scope_test_context,
    monkeypatch,
):
    client, connection = network_scope_test_context

    organization_id, _ = create_organization(
        client, monkeypatch, connection
    )

    other_uid, other_email, _ = create_user(
        connection, "scope-other-user"
    )
    other_headers = authenticate(
        monkeypatch, other_uid, other_email
    )

    response = client.get(
        f"/api/v1/organizations/{organization_id}/network-scopes",
        headers=other_headers,
    )

    assert response.status_code == 403, response.text


def test_disabling_scope_preserves_scope_and_ranges(
    network_scope_test_context,
    monkeypatch,
):
    client, connection = network_scope_test_context

    organization_id, headers = create_organization(
        client, monkeypatch, connection
    )

    endpoint = (
        f"/api/v1/organizations/{organization_id}/network-scopes"
    )

    create_response = client.post(
        endpoint,
        headers=headers,
        json={
            "name": "Disable Test Scope",
            "cidr_ranges": ["172.20.0.0/16"],
        },
    )

    assert create_response.status_code == 201, create_response.text
    scope_id = create_response.json()["id"]

    disable_response = client.patch(
        f"{endpoint}/{scope_id}/status",
        headers=headers,
        json={"status": "disabled"},
    )

    assert disable_response.status_code == 200, disable_response.text

    disabled = disable_response.json()
    assert disabled["status"] == "disabled"
    assert disabled["id"] == scope_id
    assert disabled["cidr_ranges"] == ["172.20.0.0/16"]

    list_response = client.get(
        endpoint,
        headers=headers,
    )

    assert list_response.status_code == 200
    listed_scope = next(
        item for item in list_response.json()
        if item["id"] == scope_id
    )

    assert listed_scope["status"] == "disabled"
    assert listed_scope["cidr_ranges"] == ["172.20.0.0/16"]
