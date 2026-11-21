from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.db.models.collector_security import (
    CollectorCredential,
    CollectorNetworkScope,
)
from backend.app.db.models.collectors import Collector
from backend.app.db.models.network_scopes import NetworkScope
from backend.app.db.models.organizations import Organization
from backend.app.db.session import engine


@pytest.fixture
def security_db():
    with engine.connect() as connection:
        database_name = connection.exec_driver_sql(
            "SELECT current_database()"
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


def create_organization(db, suffix):
    organization = Organization(
        name=f"Test Organization {suffix}",
        slug=f"test-org-{suffix}-{uuid4().hex[:8]}",
    )
    db.add(organization)
    db.flush()
    return organization


def create_collector(db, organization, suffix="collector"):
    collector = Collector(
        organization_id=organization.id,
        name=f"Test {suffix}",
        platform="macos",
        collector_version="1.0.0",
    )
    db.add(collector)
    db.flush()
    return collector


def create_scope(db, organization, suffix="scope"):
    scope = NetworkScope(
        organization_id=organization.id,
        name=f"Test {suffix}-{uuid4().hex[:8]}",
        description="Isolated database integrity test",
    )
    db.add(scope)
    db.flush()
    return scope


def create_credential(
    db,
    organization_id,
    collector_id,
    credential_hash=None,
    expires_at=None,
):
    credential = CollectorCredential(
        organization_id=organization_id,
        collector_id=collector_id,
        credential_hash=credential_hash or uuid4().hex * 2,
        label="Integrity test credential",
        expires_at=expires_at,
    )
    db.add(credential)
    return credential


def test_valid_credential_and_scope_assignment_are_created(security_db):
    organization = create_organization(security_db, "valid")
    collector = create_collector(security_db, organization)
    scope = create_scope(security_db, organization)

    credential = create_credential(
        security_db,
        organization.id,
        collector.id,
    )

    assignment = CollectorNetworkScope(
        organization_id=organization.id,
        collector_id=collector.id,
        network_scope_id=scope.id,
    )

    security_db.add_all([credential, assignment])
    security_db.flush()

    assert credential.id is not None
    assert assignment.assigned_at is not None
    assert len(credential.credential_hash) == 64


def test_credential_cannot_reference_another_organizations_collector(
    security_db,
):
    organization_a = create_organization(security_db, "credential-a")
    organization_b = create_organization(security_db, "credential-b")

    collector_a = create_collector(security_db, organization_a)

    credential = create_credential(
        security_db,
        organization_b.id,
        collector_a.id,
    )

    security_db.add(credential)

    with pytest.raises(IntegrityError):
        security_db.flush()


def test_collector_cannot_be_assigned_to_another_organizations_scope(
    security_db,
):
    organization_a = create_organization(security_db, "scope-a")
    organization_b = create_organization(security_db, "scope-b")

    collector_a = create_collector(security_db, organization_a)
    scope_b = create_scope(security_db, organization_b)

    assignment = CollectorNetworkScope(
        organization_id=organization_a.id,
        collector_id=collector_a.id,
        network_scope_id=scope_b.id,
    )

    security_db.add(assignment)

    with pytest.raises(IntegrityError):
        security_db.flush()


def test_duplicate_credential_hash_is_rejected(security_db):
    organization = create_organization(security_db, "duplicate-hash")
    collector = create_collector(security_db, organization)
    shared_hash = uuid4().hex * 2

    first = create_credential(
        security_db,
        organization.id,
        collector.id,
        credential_hash=shared_hash,
    )
    security_db.add(first)
    security_db.flush()

    second = create_credential(
        security_db,
        organization.id,
        collector.id,
        credential_hash=shared_hash,
    )
    security_db.add(second)

    with pytest.raises(IntegrityError):
        security_db.flush()


def test_duplicate_collector_scope_assignment_is_rejected(security_db):
    organization = create_organization(security_db, "duplicate-assignment")
    collector = create_collector(security_db, organization)
    scope = create_scope(security_db, organization)

    assignment = CollectorNetworkScope(
        organization_id=organization.id,
        collector_id=collector.id,
        network_scope_id=scope.id,
    )
    security_db.add(assignment)
    security_db.flush()

    with pytest.raises(IntegrityError):
        security_db.execute(
            insert(CollectorNetworkScope).values(
                organization_id=organization.id,
                collector_id=collector.id,
                network_scope_id=scope.id,
            )
        )


def test_invalid_credential_hash_length_is_rejected(security_db):
    organization = create_organization(security_db, "invalid-hash")
    collector = create_collector(security_db, organization)

    credential = create_credential(
        security_db,
        organization.id,
        collector.id,
        credential_hash="too-short",
    )
    security_db.add(credential)

    with pytest.raises(IntegrityError):
        security_db.flush()


def test_credential_expiring_before_creation_is_rejected(security_db):
    organization = create_organization(security_db, "invalid-expiry")
    collector = create_collector(security_db, organization)

    credential = create_credential(
        security_db,
        organization.id,
        collector.id,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    security_db.add(credential)

    with pytest.raises(IntegrityError):
        security_db.flush()
