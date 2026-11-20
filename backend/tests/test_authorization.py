from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.api.deps import require_organization_permission
from backend.app.db.models.access_control import (
    Membership,
    MembershipRole,
    Permission,
    Role,
    RolePermission,
)
from backend.app.db.models.organizations import Organization
from backend.app.db.models.users import User
from backend.app.db.session import engine


@pytest.fixture
def authorization_db():
    with engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        connection.rollback()

        assert database_name == "cyberguard_x_restore_test", (
            f"Unsafe test database: {database_name}"
        )

        outer_transaction = connection.begin()
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

            if outer_transaction.is_active:
                outer_transaction.rollback()


def create_authorization_context(
    db,
    role_name="Analyst",
    membership_status="active",
    organization_active=True,
    grant_permission=True,
):
    user = User(
        full_name="Authorization Test User",
        email=f"authorization-{uuid4().hex}@example.com",
        firebase_uid=f"authorization-{uuid4().hex}",
        password_hash=None,
        is_active=True,
        is_verified=True,
    )

    organization = Organization(
        name="Authorization Test Organization",
        slug=f"authorization-{uuid4().hex}",
        is_active=organization_active,
    )

    db.add_all([user, organization])
    db.flush()

    membership = None

    if membership_status is not None:
        membership = Membership(
            organization_id=organization.id,
            user_id=user.id,
            status=membership_status,
        )
        db.add(membership)
        db.flush()

    role = Role(
        organization_id=organization.id,
        name=role_name,
        is_system=True,
    )

    permission = Permission(
        code="discovery.run",
        name="Run discovery",
        description="Execute discovery in approved scopes.",
    )

    db.add_all([role, permission])
    db.flush()

    if grant_permission:
        db.add(
            RolePermission(
                organization_id=organization.id,
                role_id=role.id,
                permission_id=permission.id,
            )
        )

    if membership is not None:
        db.add(
            MembershipRole(
                organization_id=organization.id,
                membership_id=membership.id,
                role_id=role.id,
            )
        )

    db.flush()

    return user, organization, membership


@pytest.mark.parametrize("role_name", ["Owner", "Analyst"])
def test_authorized_roles_can_run_discovery(
    authorization_db,
    role_name,
):
    db = authorization_db

    user, organization, membership = create_authorization_context(
        db,
        role_name=role_name,
    )

    dependency = require_organization_permission("discovery.run")

    result = dependency(
        organization_id=organization.id,
        current_user=user,
        db=db,
    )

    assert result.id == membership.id


def test_viewer_cannot_run_discovery(authorization_db):
    db = authorization_db

    user, organization, _ = create_authorization_context(
        db,
        role_name="Viewer",
        grant_permission=False,
    )

    dependency = require_organization_permission("discovery.run")

    with pytest.raises(HTTPException) as exc:
        dependency(
            organization_id=organization.id,
            current_user=user,
            db=db,
        )

    assert exc.value.status_code == 403


@pytest.mark.parametrize("membership_status", ["invited", "suspended"])
def test_inactive_membership_cannot_run_discovery(
    authorization_db,
    membership_status,
):
    db = authorization_db

    user, organization, _ = create_authorization_context(
        db,
        membership_status=membership_status,
    )

    dependency = require_organization_permission("discovery.run")

    with pytest.raises(HTTPException) as exc:
        dependency(
            organization_id=organization.id,
            current_user=user,
            db=db,
        )

    assert exc.value.status_code == 403


def test_user_without_membership_cannot_run_discovery(
    authorization_db,
):
    db = authorization_db

    user, organization, _ = create_authorization_context(
        db,
        membership_status=None,
    )

    dependency = require_organization_permission("discovery.run")

    with pytest.raises(HTTPException) as exc:
        dependency(
            organization_id=organization.id,
            current_user=user,
            db=db,
        )

    assert exc.value.status_code == 403


def test_inactive_organization_cannot_be_accessed(
    authorization_db,
):
    db = authorization_db

    user, organization, _ = create_authorization_context(
        db,
        organization_active=False,
    )

    dependency = require_organization_permission("discovery.run")

    with pytest.raises(HTTPException) as exc:
        dependency(
            organization_id=organization.id,
            current_user=user,
            db=db,
        )

    assert exc.value.status_code == 404


def test_cross_organization_access_is_denied(
    authorization_db,
):
    db = authorization_db

    user, _, _ = create_authorization_context(db)

    other_organization = Organization(
        name="Another Test Organization",
        slug=f"other-authorization-{uuid4().hex}",
        is_active=True,
    )
    db.add(other_organization)
    db.flush()

    dependency = require_organization_permission("discovery.run")

    with pytest.raises(HTTPException) as exc:
        dependency(
            organization_id=other_organization.id,
            current_user=user,
            db=db,
        )

    assert exc.value.status_code == 403


def test_unknown_permission_is_denied(authorization_db):
    db = authorization_db

    user, organization, _ = create_authorization_context(db)

    dependency = require_organization_permission(
        "discovery.unknown"
    )

    with pytest.raises(HTTPException) as exc:
        dependency(
            organization_id=organization.id,
            current_user=user,
            db=db,
        )

    assert exc.value.status_code == 403


def test_empty_permission_code_is_rejected():
    with pytest.raises(ValueError):
        require_organization_permission(" ")
