from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, require_organization_permission
from backend.app.db.models.observations import Asset, PortObservation
from backend.app.schemas.twin import TwinEdge, TwinGraphResponse, TwinNode

router = APIRouter(
    prefix="/organizations/{organization_id}/twin",
    tags=["Digital Twin"],
)


def _classify_zone(ip: str, open_ports: list[int]) -> str:
    # Databases or critical persistence services -> CROWN_JEWELS
    critical_ports = {5432, 3306, 27017, 1433, 1521, 6379, 9200}
    if any(port in critical_ports for port in open_ports):
        return "CROWN_JEWELS"

    # Edge exposure or web services -> DMZ
    dmz_ports = {80, 443, 8080, 8443, 53}
    if any(port in dmz_ports for port in open_ports) or ip.endswith(".1") or ip.endswith(".254"):
        return "DMZ"

    return "INTERNAL"


@router.get("/graph", response_model=TwinGraphResponse)
def get_digital_twin_graph(
    organization_id: UUID,
    membership=Depends(require_organization_permission("observations.read")),
    db: Session = Depends(get_db),
):
    """Synthesize live Digital Twin topology graph from verified database asset observations."""
    assets = db.scalars(
        select(Asset).where(Asset.organization_id == organization_id)
    ).all()

    if not assets:
        return TwinGraphResponse(
            nodes=[],
            edges=[],
            total_nodes=0,
            provenance="DERIVED",
        )

    nodes: list[TwinNode] = []
    node_ids: list[str] = []

    for asset in assets:
        ports = db.scalars(
            select(PortObservation).where(PortObservation.asset_id == asset.id)
        ).all()

        open_ports = sorted([p.port for p in ports])
        services = [
            f"{p.service or 'service'} ({p.port}/{p.protocol})"
            + (f" {p.version}" if p.version else "")
            for p in ports
        ]

        zone = _classify_zone(asset.ip_address, open_ports)
        node_id = f"node-{asset.id}"
        node_ids.append(node_id)

        name = asset.hostname or f"Host {asset.ip_address}"
        os_info = asset.operating_system or "Linux / Unknown OS"

        nodes.append(
            TwinNode(
                id=node_id,
                name=name,
                ip=asset.ip_address,
                os=os_info,
                zone=zone,  # type: ignore[arg-type]
                status="normal",
                services=services,
                open_ports=open_ports,
                connected_to=[],
                provenance="OBSERVED",
            )
        )

    # Synthesize reachability edges between nodes
    edges: list[TwinEdge] = []
    dmz_nodes = [n for n in nodes if n.zone == "DMZ"]
    internal_nodes = [n for n in nodes if n.zone == "INTERNAL"]
    crown_nodes = [n for n in nodes if n.zone == "CROWN_JEWELS"]

    # Connect DMZ to Internal
    for dmz in dmz_nodes:
        for internal in internal_nodes:
            edges.append(
                TwinEdge(
                    source=dmz.id,
                    target=internal.id,
                    protocol="TCP",
                    is_attack_path=False,
                    provenance="DERIVED",
                )
            )
            dmz.connected_to.append(internal.name)

    # Connect Internal to Crown Jewels
    for internal in internal_nodes:
        for crown in crown_nodes:
            edges.append(
                TwinEdge(
                    source=internal.id,
                    target=crown.id,
                    protocol="TCP",
                    is_attack_path=False,
                    provenance="DERIVED",
                )
            )
            internal.connected_to.append(crown.name)

    # If only one zone exists, connect nodes in chain to show network relationship
    if not edges and len(nodes) > 1:
        for i in range(len(nodes) - 1):
            edges.append(
                TwinEdge(
                    source=nodes[i].id,
                    target=nodes[i + 1].id,
                    protocol="IP",
                    is_attack_path=False,
                    provenance="DERIVED",
                )
            )
            nodes[i].connected_to.append(nodes[i + 1].name)

    return TwinGraphResponse(
        nodes=nodes,
        edges=edges,
        total_nodes=len(nodes),
        provenance="DERIVED",
    )
