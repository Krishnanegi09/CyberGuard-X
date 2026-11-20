
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.core.security.passwords import hash_password
from backend.app.db.models.users import User
from backend.app.db.session import engine
from backend.app.main import app


@pytest.fixture
def auth_test_context():
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


def create_test_user(
    connection,
    email,
    password="Legacy-Test-Password-2026!",
    is_verified=True,
    is_active=True,
    firebase_uid=None,
):
    db = Session(
        bind=connection,
        autoflush=False,
        autocommit=False,
        join_transaction_mode="create_savepoint",
    )

    try:
        user = User(
            full_name="Existing Authentication User",
            email=email,
            firebase_uid=firebase_uid,
            password_hash=hash_password(password),
            is_verified=is_verified,
            is_active=is_active,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return user.id

    finally:
        db.close()


def test_firebase_sync_creates_new_user(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    email = f"new-{uuid4().hex}@example.com"

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={"full_name": "New Firebase User"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["email"] == email
    assert data["full_name"] == "New Firebase User"
    assert data["is_verified"] is True
    assert "password_hash" not in data

    row = connection.execute(
        text(
            """
            SELECT firebase_uid, password_hash, is_verified
            FROM users
            WHERE email = :email
            """
        ),
        {"email": email},
    ).mappings().one()

    assert row["firebase_uid"] == uid
    assert row["password_hash"] is None
    assert row["is_verified"] is True


def test_firebase_sync_links_existing_account_without_losing_data(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    email = f"legacy-{uuid4().hex}@example.com"
    password = "Legacy-Test-Password-2026!"

    original_user_id = create_test_user(
        connection,
        email.upper(),
        password,
        is_verified=False,
    )

    original_hash = connection.execute(
        text("SELECT password_hash FROM users WHERE id = :id"),
        {"id": original_user_id},
    ).scalar_one()

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={"full_name": "New Display Name"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(original_user_id)
    assert data["email"] == f"{email.split('@')[0].upper()}@example.com"
    assert data["full_name"] == "Existing Authentication User"
    assert data["is_verified"] is True

    row = connection.execute(
        text(
            """
            SELECT id, firebase_uid, password_hash, is_verified
            FROM users
            WHERE id = :id
            """
        ),
        {"id": original_user_id},
    ).mappings().one()

    assert row["id"] == original_user_id
    assert row["firebase_uid"] == uid
    assert row["password_hash"] == original_hash
    assert row["is_verified"] is True


def test_firebase_sync_is_idempotent(
    auth_test_context,
    monkeypatch,
):
    client, _ = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    email = f"idempotent-{uuid4().hex}@example.com"

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    headers = {"Authorization": "Bearer test-firebase-token"}
    payload = {"full_name": "Idempotent User"}

    first = client.post(
        "/api/v1/auth/sync",
        headers=headers,
        json=payload,
    )

    second = client.post(
        "/api/v1/auth/sync",
        headers=headers,
        json=payload,
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


def test_firebase_sync_rejects_unverified_email(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    email = f"unverified-{uuid4().hex}@example.com"

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email, verified=False),
    )

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={"full_name": "Unverified User"},
    )

    assert response.status_code == 403

    count = connection.execute(
        text("SELECT count(*) FROM users WHERE email = :email"),
        {"email": email},
    ).scalar_one()

    assert count == 0


def test_firebase_sync_rejects_uid_linked_to_different_email(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    existing_email = f"existing-{uuid4().hex}@example.com"
    different_email = f"different-{uuid4().hex}@example.com"

    create_test_user(
        connection,
        existing_email,
        firebase_uid=uid,
    )

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, different_email),
    )

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={"full_name": "Conflict User"},
    )

    assert response.status_code == 409


def test_firebase_sync_rejects_email_linked_to_another_uid(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    email = f"linked-{uuid4().hex}@example.com"

    create_test_user(
        connection,
        email,
        firebase_uid=f"existing-{uuid4().hex}",
    )

    mock_firebase(
        monkeypatch,
        firebase_claims(f"new-{uuid4().hex}", email),
    )

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={"full_name": "Conflicting User"},
    )

    assert response.status_code == 409


def test_firebase_sync_rejects_inactive_account(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    email = f"inactive-{uuid4().hex}@example.com"

    create_test_user(
        connection,
        email,
        is_active=False,
    )

    mock_firebase(
        monkeypatch,
        firebase_claims(f"firebase-{uuid4().hex}", email),
    )

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={"full_name": "Inactive User"},
    )

    assert response.status_code == 403


def test_me_returns_linked_firebase_user(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    email = f"me-{uuid4().hex}@example.com"

    user_id = create_test_user(
        connection,
        email,
        firebase_uid=uid,
    )

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(user_id)
    assert response.json()["email"] == email
    assert "password_hash" not in response.json()


def test_me_rejects_missing_firebase_token(auth_test_context):
    client, _ = auth_test_context

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_rejects_invalid_firebase_claims(
    auth_test_context,
    monkeypatch,
):
    client, _ = auth_test_context

    mock_firebase(
        monkeypatch,
        {"email": "invalid@example.com"},
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401


def test_me_rejects_missing_local_account(
    auth_test_context,
    monkeypatch,
):
    client, _ = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    email = f"missing-{uuid4().hex}@example.com"

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "No account is linked to this Firebase user."
    )


def test_me_rejects_inactive_local_account(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    email = f"inactive-me-{uuid4().hex}@example.com"

    create_test_user(
        connection,
        email,
        firebase_uid=uid,
        is_active=False,
    )

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "This account is inactive."


def test_me_rejects_unverified_local_account(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    uid = f"firebase-{uuid4().hex}"
    email = f"unverified-me-{uuid4().hex}@example.com"

    create_test_user(
        connection,
        email,
        firebase_uid=uid,
        is_verified=False,
    )

    mock_firebase(
        monkeypatch,
        firebase_claims(uid, email),
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Account verification required."


def test_firebase_sync_rejects_missing_name(
    auth_test_context,
    monkeypatch,
):
    client, _ = auth_test_context

    mock_firebase(
        monkeypatch,
        firebase_claims(
            f"firebase-{uuid4().hex}",
            f"name-{uuid4().hex}@example.com",
        ),
    )

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={"full_name": " "},
    )

    assert response.status_code == 422


def test_firebase_sync_rejects_client_supplied_email(
    auth_test_context,
    monkeypatch,
):
    client, _ = auth_test_context

    mock_firebase(
        monkeypatch,
        firebase_claims(
            f"firebase-{uuid4().hex}",
            f"trusted-{uuid4().hex}@example.com",
        ),
    )

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={
            "full_name": "Test User",
            "email": "attacker@example.com",
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "firebase_error",
    [
        pytest.param(
            __import__("firebase_admin").auth.InvalidIdTokenError(
                "Invalid token"
            ),
            id="invalid-token",
        ),
        pytest.param(
            __import__("firebase_admin").auth.ExpiredIdTokenError(
                "Token expired",
                Exception("expired"),
            ),
            id="expired-token",
        ),
        pytest.param(
            __import__("firebase_admin").auth.RevokedIdTokenError(
                "Token revoked"
            ),
            id="revoked-token",
        ),
        pytest.param(
            __import__("firebase_admin").auth.UserDisabledError(
                "User disabled"
            ),
            id="disabled-user",
        ),
    ],
)
def test_me_rejects_firebase_authentication_errors(
    auth_test_context,
    monkeypatch,
    firebase_error,
):
    client, _ = auth_test_context

    def raise_firebase_error(token):
        raise firebase_error

    monkeypatch.setattr(
        "backend.app.api.deps.verify_firebase_id_token",
        raise_firebase_error,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_returns_503_when_firebase_service_is_unavailable(
    auth_test_context,
    monkeypatch,
):
    from firebase_admin.exceptions import FirebaseError

    client, _ = auth_test_context

    def raise_firebase_error(token):
        raise FirebaseError(
            "internal",
            "Firebase authentication service unavailable",
        )

    monkeypatch.setattr(
        "backend.app.api.deps.verify_firebase_id_token",
        raise_firebase_error,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Authentication service temporarily unavailable."
    )


@pytest.mark.parametrize(
    "claims",
    [
        {},
        {"uid": ""},
        {"uid": "   "},
        {"uid": 123},
        {"uid": None},
    ],
)
def test_me_rejects_malformed_firebase_uid_claims(
    auth_test_context,
    monkeypatch,
    claims,
):
    client, _ = auth_test_context

    mock_firebase(monkeypatch, claims)

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 401

def test_firebase_verification_enforces_revocation_check(monkeypatch):
    from backend.app.core import firebase

    expected_app = object()
    captured = {}

    monkeypatch.setattr(
        firebase,
        "get_firebase_app",
        lambda: expected_app,
    )

    def fake_verify_id_token(token, app=None, check_revoked=False):
        captured["token"] = token
        captured["app"] = app
        captured["check_revoked"] = check_revoked
        return {"uid": "verified-test-user"}

    monkeypatch.setattr(
        firebase.auth,
        "verify_id_token",
        fake_verify_id_token,
    )

    result = firebase.verify_firebase_id_token("test-token")

    assert result == {"uid": "verified-test-user"}
    assert captured["token"] == "test-token"
    assert captured["app"] is expected_app
    assert captured["check_revoked"] is True
def test_me_never_returns_another_firebase_users_account(
    auth_test_context,
    monkeypatch,
):
    client, connection = auth_test_context

    uid_a = f"firebase-a-{uuid4().hex}"
    uid_b = f"firebase-b-{uuid4().hex}"

    email_a = f"user-a-{uuid4().hex}@example.com"
    email_b = f"user-b-{uuid4().hex}@example.com"

    user_a_id = create_test_user(
        connection,
        email_a,
        firebase_uid=uid_a,
    )

    user_b_id = create_test_user(
        connection,
        email_b,
        firebase_uid=uid_b,
    )

    mock_firebase(
        monkeypatch,
        firebase_claims(uid_a, email_a),
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-firebase-token"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == str(user_a_id)
    assert data["email"] == email_a
    assert data["id"] != str(user_b_id)
    assert data["email"] != email_b

@pytest.mark.parametrize(
    (
        "email_value",
        "verified_value",
        "email_present",
        "verified_present",
        "expected_status",
    ),
    [
        pytest.param(None, True, False, True, 403, id="missing-email"),
        pytest.param("", True, True, True, 401, id="empty-email"),
        pytest.param(
            "not-an-email", True, True, True, 401, id="invalid-email"
        ),
        pytest.param(123, True, True, True, 403, id="non-string-email"),
        pytest.param(
            "valid@example.com", None, True, False, 403,
            id="missing-email-verified",
        ),
        pytest.param(
            "valid@example.com", "true", True, True, 403,
            id="non-boolean-email-verified",
        ),
    ],
)
def test_firebase_sync_rejects_malformed_email_claims(
    auth_test_context,
    monkeypatch,
    email_value,
    verified_value,
    email_present,
    verified_present,
    expected_status,
):
    client, connection = auth_test_context

    uid = f"malformed-claims-{uuid4().hex}"

    claims = {
        "uid": uid,
        "sub": uid,
    }

    if email_present:
        claims["email"] = email_value

    if verified_present:
        claims["email_verified"] = verified_value

    mock_firebase(monkeypatch, claims)

    response = client.post(
        "/api/v1/auth/sync",
        headers={"Authorization": "Bearer test-firebase-token"},
        json={"full_name": "Malformed Claims User"},
    )

    assert response.status_code == expected_status

    account_count = connection.execute(
        text(
            "SELECT count(*) FROM users "
            "WHERE firebase_uid = :uid"
        ),
        {"uid": uid},
    ).scalar_one()

    assert account_count == 0
