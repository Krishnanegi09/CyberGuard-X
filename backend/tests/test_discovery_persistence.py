from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.db.models.network_scopes import (
    NetworkScope,
    NetworkScopeRange,
)
from backend.app.db.models.observations import (
    Asset,
    PortObservation,
    ScanRun,
)
from backend.app.db.models.organizations import Organization
from backend.app.db.session import engine
from backend.app.services.discovery.nmap_runner import (
    DiscoveredHost,
    DiscoveredPort,
    NmapScanResult,
)
from backend.app.services.discovery.persistence import (
    DiscoveryPersistenceError,
    persist_scan_results,
)


@pytest.fixture
def persistence_db():
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


def create_scan_run(db, organization, scope, target="192.168.10.0/28"):
    run = ScanRun(
        organization_id=organization.id,
        network_scope_id=scope.id,
        target=target,
        scan_type="TCP_SERVICE_DISCOVERY",
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.flush()
    return run


def create_scope(db, label):
    organization = Organization(
        name=f"Persistence Test {label}",
        slug=f"persistence-{label}-{uuid4().hex[:12]}",
    )
    db.add(organization)
    db.flush()

    scope = NetworkScope(
        organization_id=organization.id,
        name="Approved Test Scope",
        status="active",
    )
    db.add(scope)
    db.flush()

    db.add(
        NetworkScopeRange(
            organization_id=organization.id,
            network_scope_id=scope.id,
            cidr="192.168.10.0/24",
        )
    )
    db.flush()

    return organization, scope


def sample_result(
    ip="192.168.10.10",
    hostname="server.local",
    operating_system="Linux",
    ports=None,
):
    return NmapScanResult(
        scanner_name="Nmap",
        scanner_version="Nmap version 7.97",
        hosts=(
            DiscoveredHost(
                ip_address=ip,
                hostname=hostname,
                operating_system=operating_system,
                ports=tuple(
                    ports
                    if ports is not None
                    else [
                        DiscoveredPort(
                            port=22,
                            protocol="tcp",
                            service="ssh",
                            product="OpenSSH",
                            version="9.0",
                        )
                    ]
                ),
            ),
        ),
    )


def test_persists_new_asset_and_open_port_observations(persistence_db):
    db = persistence_db
    organization, scope = create_scope(db, "create")
    run = create_scan_run(db, organization, scope)

    summary = persist_scan_results(db, run, sample_result())
    db.flush()

    asset = db.scalar(
        select(Asset).where(
            Asset.organization_id == organization.id,
            Asset.ip_address == "192.168.10.10",
        )
    )
    observations = db.scalars(
        select(PortObservation).where(
            PortObservation.scan_run_id == run.id
        )
    ).all()

    assert summary.assets_created == 1
    assert summary.assets_updated == 0
    assert summary.ports_observed == 1
    assert asset is not None
    assert asset.hostname == "server.local"
    assert asset.operating_system == "Linux"
    assert len(observations) == 1
    assert observations[0].port == 22
    assert observations[0].protocol == "tcp"
    assert observations[0].detection_method == "nmap"
    assert run.scanner_name == "Nmap"
    assert run.scanner_version == "Nmap version 7.97"


def test_repeat_discovery_updates_asset_and_preserves_port_history(
    persistence_db,
):
    db = persistence_db
    organization, scope = create_scope(db, "repeat")

    first_run = create_scan_run(db, organization, scope)
    first = persist_scan_results(db, first_run, sample_result())
    db.flush()

    original_asset = db.scalar(
        select(Asset).where(
            Asset.organization_id == organization.id,
            Asset.ip_address == "192.168.10.10",
        )
    )
    original_first_seen = original_asset.first_seen
    original_asset_id = original_asset.id

    second_run = create_scan_run(db, organization, scope)
    second = persist_scan_results(
        db,
        second_run,
        sample_result(
            hostname=None,
            operating_system=None,
            ports=[
                DiscoveredPort(
                    port=443,
                    protocol="tcp",
                    service="https",
                    product=None,
                    version=None,
                )
            ],
        ),
    )
    db.flush()

    assets = db.scalars(
        select(Asset).where(
            Asset.organization_id == organization.id,
            Asset.ip_address == "192.168.10.10",
        )
    ).all()

    history = db.scalars(
        select(PortObservation)
        .join(Asset, PortObservation.asset_id == Asset.id)
        .where(Asset.id == original_asset_id)
        .order_by(PortObservation.id)
    ).all()

    assert first.assets_created == 1
    assert second.assets_created == 0
    assert second.assets_updated == 1
    assert len(assets) == 1
    assert assets[0].id == original_asset_id
    assert assets[0].first_seen == original_first_seen
    assert assets[0].hostname == "server.local"
    assert assets[0].operating_system == "Linux"
    assert len(history) == 2
    assert {item.port for item in history} == {22, 443}
    assert {item.scan_run_id for item in history} == {
        first_run.id,
        second_run.id,
    }


def test_assets_are_isolated_between_organizations(persistence_db):
    db = persistence_db
    organization_a, scope_a = create_scope(db, "org-a")
    organization_b, scope_b = create_scope(db, "org-b")

    run_a = create_scan_run(db, organization_a, scope_a)
    run_b = create_scan_run(db, organization_b, scope_b)

    persist_scan_results(db, run_a, sample_result())
    persist_scan_results(db, run_b, sample_result())
    db.flush()

    assets = db.scalars(
        select(Asset).where(
            Asset.ip_address == "192.168.10.10"
        )
    ).all()

    assert len(assets) == 2
    assert {asset.organization_id for asset in assets} == {
        organization_a.id,
        organization_b.id,
    }


def test_rejects_legacy_unscoped_scan_run(persistence_db):
    db = persistence_db
    run = ScanRun(
        organization_id=None,
        network_scope_id=None,
        target="192.168.10.0/24",
        scan_type="TCP_SERVICE_DISCOVERY",
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.flush()

    with pytest.raises(
        DiscoveryPersistenceError,
        match="organization-owned",
    ):
        persist_scan_results(db, run, sample_result())


def test_rejects_invalid_result_without_persisting(persistence_db):
    db = persistence_db
    organization, scope = create_scope(db, "invalid-result")
    run = create_scan_run(db, organization, scope)

    with pytest.raises(
        DiscoveryPersistenceError,
        match="valid Nmap scan result",
    ):
        persist_scan_results(db, run, object())

    assert db.scalar(
        select(Asset.id).where(
            Asset.organization_id == organization.id,
        )
    ) is None
