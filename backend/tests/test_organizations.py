from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.db.models.users import User
from backend.app.db.session import engine
from backend.app.main import app

EXPECTED_PERMISSIONS = {
    "organization.read",
    "organization.update",
    "organization.members.manage",
    "organization.roles.manage",
    "network_scopes.manage",
    "discovery.run",
    "assets.read",
    "observations.read",
    "collectors.manage",
    "monitoring.manage",
}


@pytest.fixture
def organization_test_context():
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


def firebase_claims(uid, email, verified=True):
    return {
        "uid": uid,
        "sub": uid,
        "email": email,
        "email_verified": verified,
    }


def mock_firebase(monkeypatch, claims):
    monkeypatch.setattr(
        "backend.app.api.deps.verify_firebase_id_token",
        lambda token: claims,
    )


def create_test_user(connection, uid=None):
    db = Session(
        bind=connection,
        autoflush=False,
        autocommit=False,
        join_transaction_mode="create_savepoint",
    )

    try:
        user = User(
            full_name="Organization Test Owner",
            email=f"org-owner-{uuid4().hex}@example.com",
            firebase_uid=uid or f"firebase-{uuid4().hex}",
            password_hash=None,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.firebase_uid, user.email, user.id
    finally:
        db.close()


def test_create_organization_assigns_owner_and_provisions_rbac(
    organization_test_context,
    monkeypatch,
):
    client, connection = organization_test_context

    uid, email, user_id = create_test_user(connection)

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    slug = f"cyber-test-{uuid4().hex[:12]}"

    response = client.post(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={
            "name": "Cyber Test Organization",
            "slug": slug,
        },
    )

    assert response.status_code == 201, response.text

    data = response.json()

    assert data["name"] == "Cyber Test Organization"
    assert data["slug"] == slug
    assert "id" in data
    assert "created_at" in data

    organization_id = data["id"]

    organization = connection.execute(
        text("""
            SELECT id, name, slug, is_active
            FROM organizations
            WHERE id = :organization_id
        """),
        {"organization_id": organization_id},
    ).mappings().one()

    assert str(organization["id"]) == organization_id
    assert organization["name"] == "Cyber Test Organization"
    assert organization["slug"] == slug
    assert organization["is_active"] is True

    membership = connection.execute(
        text("""
            SELECT id, status
            FROM memberships
            WHERE organization_id = :organization_id
              AND user_id = :user_id
        """),
        {
            "organization_id": organization_id,
            "user_id": user_id,
        },
    ).mappings().one()

    assert membership["status"] == "active"

    roles = connection.execute(
        text("""
            SELECT id, name, is_system
            FROM roles
            WHERE organization_id = :organization_id
            ORDER BY name
        """),
        {"organization_id": organization_id},
    ).mappings().all()

    role_map = {role["name"]: role for role in roles}

    assert set(role_map) == {"Owner", "Admin", "Analyst", "Viewer"}
    assert all(role["is_system"] is True for role in roles)

    owner_assignment = connection.execute(
        text("""
            SELECT COUNT(*)
            FROM membership_roles mr
            JOIN roles r
              ON r.id = mr.role_id
             AND r.organization_id = mr.organization_id
            WHERE mr.organization_id = :organization_id
              AND mr.membership_id = :membership_id
              AND r.name = 'Owner'
        """),
        {
            "organization_id": organization_id,
            "membership_id": membership["id"],
        },
    ).scalar_one()

    assert owner_assignment == 1

    permissions = connection.execute(
        text("""
            SELECT code
            FROM permissions
            ORDER BY code
        """)
    ).scalars().all()

    assert set(permissions) == EXPECTED_PERMISSIONS

    owner_permissions = connection.execute(
        text("""
            SELECT p.code
            FROM role_permissions rp
            JOIN permissions p ON p.id = rp.permission_id
            JOIN roles r
              ON r.id = rp.role_id
             AND r.organization_id = rp.organization_id
            WHERE rp.organization_id = :organization_id
              AND r.name = 'Owner'
        """),
        {"organization_id": organization_id},
    ).scalars().all()

    assert set(owner_permissions) == EXPECTED_PERMISSIONS

    analyst_permissions = connection.execute(
        text("""
            SELECT p.code
            FROM role_permissions rp
            JOIN permissions p ON p.id = rp.permission_id
            JOIN roles r
              ON r.id = rp.role_id
             AND r.organization_id = rp.organization_id
            WHERE rp.organization_id = :organization_id
              AND r.name = 'Analyst'
        """),
        {"organization_id": organization_id},
    ).scalars().all()

    assert set(analyst_permissions) == {
        "discovery.run",
        "assets.read",
        "observations.read",
    }

    viewer_permissions = connection.execute(
        text("""
            SELECT p.code
            FROM role_permissions rp
            JOIN permissions p ON p.id = rp.permission_id
            JOIN roles r
              ON r.id = rp.role_id
             AND r.organization_id = rp.organization_id
            WHERE rp.organization_id = :organization_id
              AND r.name = 'Viewer'
        """),
        {"organization_id": organization_id},
    ).scalars().all()

    assert set(viewer_permissions) == {
        "assets.read",
        "observations.read",
    }


def test_create_organization_rejects_duplicate_slug(
    organization_test_context,
    monkeypatch,
):
    client, connection = organization_test_context

    uid, email, _ = create_test_user(connection)

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    payload = {
        "name": "Duplicate Slug Organization",
        "slug": f"duplicate-{uuid4().hex[:12]}",
    }

    first = client.post(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer test-firebase-token"},
        json=payload,
    )

    assert first.status_code == 201

    second = client.post(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer test-firebase-token"},
        json=payload,
    )

    assert second.status_code == 409

    organization_count = connection.execute(
        text("""
            SELECT COUNT(*)
            FROM organizations
            WHERE slug = :slug
        """),
        {"slug": payload["slug"]},
    ).scalar_one()

    assert organization_count == 1


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param(
            {"name": "Invalid Slug", "slug": "UPPERCASE"},
            id="uppercase-slug",
        ),
        pytest.param(
            {"name": "Invalid Slug", "slug": "has spaces"},
            id="slug-with-spaces",
        ),
        pytest.param(
            {"name": "Invalid Slug", "slug": "-starts-with-hyphen"},
            id="slug-leading-hyphen",
        ),
        pytest.param(
            {"name": "Invalid Slug", "slug": "ends-with-hyphen-"},
            id="slug-trailing-hyphen",
        ),
        pytest.param(
            {"name": "Invalid Slug", "slug": "ab"},
            id="slug-too-short",
        ),
        pytest.param(
            {"name": " " , "slug": "valid-slug"},
            id="blank-name",
        ),
        pytest.param(
            {
                "name": "Unexpected Field",
                "slug": "unexpected-field",
                "is_active": True,
            },
            id="client-controlled-active-status",
        ),
    ],
)
def test_create_organization_rejects_invalid_input(
    organization_test_context,
    monkeypatch,
    payload,
):
    client, connection = organization_test_context

    uid, email, _ = create_test_user(connection)

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    response = client.post(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer test-firebase-token"},
        json=payload,
    )

    assert response.status_code == 422

    organization_count = connection.execute(
        text("SELECT COUNT(*) FROM organizations")
    ).scalar_one()

    assert organization_count == 0


def test_create_organization_requires_authentication(
    organization_test_context,
):
    client, connection = organization_test_context

    response = client.post(
        "/api/v1/organizations",
        json={
            "name": "Unauthenticated Organization",
            "slug": "unauthenticated-org",
        },
    )

    assert response.status_code == 401

    assert connection.execute(
        text("SELECT COUNT(*) FROM organizations")
    ).scalar_one() == 0


def test_create_organization_rejects_unverified_firebase_email(
    organization_test_context,
    monkeypatch,
):
    client, connection = organization_test_context

    uid, email, _ = create_test_user(connection)

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email, verified=False),
    )

    response = client.post(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={
            "name": "Unverified Organization",
            "slug": "unverified-org",
        },
    )

    assert response.status_code == 403

    assert connection.execute(
        text("SELECT COUNT(*) FROM organizations")
    ).scalar_one() == 0


def test_list_organizations_returns_only_active_memberships(
    organization_test_context,
    monkeypatch,
):
    client, connection = organization_test_context

    uid, email, user_id = create_test_user(connection)
    other_uid, other_email, other_user_id = create_test_user(connection)

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    active_org_id = uuid4()
    inactive_membership_org_id = uuid4()
    inactive_org_id = uuid4()
    other_user_org_id = uuid4()

    organizations = [
        (active_org_id, "Active Organization", "active-org", True),
        (
            inactive_membership_org_id,
            "Invited Organization",
            "invited-org",
            True,
        ),
        (inactive_org_id, "Inactive Organization", "inactive-org", False),
        (other_user_org_id, "Other User Organization", "other-user-org", True),
    ]

    for organization_id, name, slug, is_active in organizations:
        connection.execute(
            text("""
                INSERT INTO organizations (id, name, slug, is_active)
                VALUES (:id, :name, :slug, :is_active)
            """),
            {
                "id": organization_id,
                "name": name,
                "slug": slug,
                "is_active": is_active,
            },
        )

    memberships = [
        (active_org_id, user_id, "active"),
        (inactive_membership_org_id, user_id, "invited"),
        (inactive_org_id, user_id, "active"),
        (other_user_org_id, other_user_id, "active"),
    ]

    for organization_id, member_user_id, membership_status in memberships:
        connection.execute(
            text("""
                INSERT INTO memberships (
                    id, organization_id, user_id, status
                )
                VALUES (
                    :id, :organization_id, :user_id, :status
                )
            """),
            {
                "id": uuid4(),
                "organization_id": organization_id,
                "user_id": member_user_id,
                "status": membership_status,
            },
        )

    response = client.get(
        "/api/v1/organizations",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == str(active_org_id)
    assert data[0]["name"] == "Active Organization"
    assert data[0]["slug"] == "active-org"


def test_list_organizations_requires_authentication(
    organization_test_context,
):
    client, connection = organization_test_context

    response = client.get("/api/v1/organizations")

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Could not validate Firebase credentials."
    )
