from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from scapy.layers.dns import DNS
from scapy.layers.inet import IP, TCP, UDP
from scapy.layers.inet6 import IPv6
from scapy.packet import Packet


TransportProtocol = Literal["tcp", "udp", "other"]


@dataclass(frozen=True, slots=True)
class PacketObservation:
    captured_at: datetime
    source_ip: str
    destination_ip: str
    ip_version: int
    transport_protocol: TransportProtocol
    source_port: int | None
    destination_port: int | None
    tcp_flags: int | None
    packet_length: int
    dns_present: bool


def parse_packet(packet: Packet) -> PacketObservation | None:
    """
    Extract metadata from an IPv4 or IPv6 packet.

    No packet payload, DNS query content, or application data is retained.
    Non-IP packets are ignored.
    """

    if IP in packet:
        network_layer = packet[IP]
        ip_version = 4
    elif IPv6 in packet:
        network_layer = packet[IPv6]
        ip_version = 6
    else:
        return None

    try:
        captured_at = datetime.fromtimestamp(
            float(packet.time),
            tz=timezone.utc,
        )
    except (AttributeError, TypeError, ValueError, OverflowError, OSError) as exc:
        raise ValueError("Packet timestamp is invalid") from exc

    source_port = None
    destination_port = None
    tcp_flags = None

    if TCP in packet:
        transport_protocol: TransportProtocol = "tcp"
        transport = packet[TCP]
        source_port = int(transport.sport)
        destination_port = int(transport.dport)
        tcp_flags = int(transport.flags)

    elif UDP in packet:
        transport_protocol = "udp"
        transport = packet[UDP]
        source_port = int(transport.sport)
        destination_port = int(transport.dport)

    else:
        transport_protocol = "other"

    # Scapy may rebuild an unresolved L2 packet when ``len(packet)`` is
    # requested. For IPv6/Ether packets that can trigger a live neighbor
    # lookup, which is unsafe and unnecessary for metadata-only inspection.
    # Prefer captured bytes and fall back to the packet's declared length.
    packet_length = len(getattr(packet, "original", b""))
    if packet_length == 0:
        try:
            packet_length = len(packet)
        except Exception:
            # A synthetic packet may not have captured bytes yet. Building
            # only the IP layer avoids the L2 neighbor-resolution path.
            packet_length = len(bytes(network_layer))

    return PacketObservation(
        captured_at=captured_at,
        source_ip=str(network_layer.src),
        destination_ip=str(network_layer.dst),
        ip_version=ip_version,
        transport_protocol=transport_protocol,
        source_port=source_port,
        destination_port=destination_port,
        tcp_flags=tcp_flags,
        packet_length=packet_length,
        dns_present=DNS in packet,
    )
