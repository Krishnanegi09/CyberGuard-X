from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.db.models.observations import (
    Asset,
    PortObservation,
    ScanRun,
)
from backend.app.services.discovery.nmap_runner import NmapScanResult


class DiscoveryPersistenceError(RuntimeError):
    """Raised when discovery results cannot be safely persisted."""


@dataclass(frozen=True)
class PersistenceSummary:
    assets_created: int
    assets_updated: int
    ports_observed: int


def persist_scan_results(
    db: Session,
    scan_run: ScanRun,
    result: NmapScanResult,
) -> PersistenceSummary:
    """
    Persist genuine Nmap observations in the caller's transaction.

    The caller must:
    - Create and persist the ScanRun first.
    - Verify organization membership and discovery permission.
    - Verify active network-scope ownership.
    - Validate the requested target against approved CIDRs.
    - Commit or roll back the complete transaction.

    PostgreSQL transaction-level advisory locks serialize asset
    creation for the same organization/IP pair across concurrent scans.
    """
    if not isinstance(scan_run, ScanRun) or scan_run.id is None:
        raise DiscoveryPersistenceError(
            "A persisted ScanRun is required."
        )

    if (
        scan_run.organization_id is None
        or scan_run.network_scope_id is None
    ):
        raise DiscoveryPersistenceError(
            "An organization-owned network scope is required."
        )

    if not isinstance(result, NmapScanResult):
        raise DiscoveryPersistenceError(
            "A valid Nmap scan result is required."
        )

    organization_id = scan_run.organization_id
    scan_run_id = scan_run.id

    scan_run.scanner_name = result.scanner_name
    scan_run.scanner_version = result.scanner_version

    created = 0
    updated = 0
    observed = 0

    now = datetime.now(timezone.utc)

    for host in result.hosts:
        # Hash collisions only cause additional serialization; they
        # cannot cause two different assets to be treated as identical.
        db.execute(
            text(
                """
                SELECT pg_advisory_xact_lock(
                    hashtext(:organization_id),
                    hashtext(:ip_address)
                )
                """
            ),
            {
                "organization_id": str(organization_id),
                "ip_address": host.ip_address,
            },
        )

        asset = db.scalar(
            select(Asset)
            .where(
                Asset.organization_id == organization_id,
                Asset.ip_address == host.ip_address,
            )
            .with_for_update()
        )

        if asset is None:
            asset = Asset(
                organization_id=organization_id,
                ip_address=host.ip_address,
                hostname=host.hostname,
                operating_system=host.operating_system,
                first_seen=now,
                last_seen=now,
            )
            db.add(asset)
            db.flush()
            created += 1
        else:
            asset.last_seen = now

            if host.hostname is not None:
                asset.hostname = host.hostname

            if host.operating_system is not None:
                asset.operating_system = host.operating_system

            updated += 1

        for port in host.ports:
            observation = PortObservation(
                asset_id=asset.id,
                port=port.port,
                protocol=port.protocol,
                service=port.service,
                product=port.product,
                version=port.version,
                detection_method="nmap",
                observed_at=now,
                scan_run_id=scan_run_id,
            )
            db.add(observation)
            observed += 1

    db.flush()

    return PersistenceSummary(
        assets_created=created,
        assets_updated=updated,
        ports_observed=observed,
    )
