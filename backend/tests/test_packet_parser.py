from datetime import datetime, timezone

import pytest
from scapy.layers.dns import DNS, DNSQR
from scapy.layers.inet import ICMP, IP, TCP, UDP
from scapy.layers.inet6 import IPv6
from scapy.layers.l2 import ARP, Ether

from backend.app.services.monitoring.packet_parser import parse_packet


CAPTURE_TIMESTAMP = 1_700_000_000


def make_packet(packet):
    packet.time = CAPTURE_TIMESTAMP
    return packet


def test_parse_ipv4_tcp_packet():
    packet = make_packet(
        Ether()
        / IP(src="192.0.2.10", dst="198.51.100.20")
        / TCP(sport=51515, dport=443, flags="S")
    )

    observation = parse_packet(packet)

    assert observation is not None
    assert observation.source_ip == "192.0.2.10"
    assert observation.destination_ip == "198.51.100.20"
    assert observation.ip_version == 4
    assert observation.transport_protocol == "tcp"
    assert observation.source_port == 51515
    assert observation.destination_port == 443
    assert observation.tcp_flags == 2
    assert observation.packet_length == len(packet)
    assert observation.dns_present is False
    assert observation.captured_at == datetime.fromtimestamp(
        CAPTURE_TIMESTAMP,
        tz=timezone.utc,
    )


def test_parse_ipv4_udp_dns_packet_without_retaining_query():
    packet = make_packet(
        Ether()
        / IP(src="192.0.2.10", dst="192.0.2.53")
        / UDP(sport=53000, dport=53)
        / DNS(
            rd=1,
            qd=DNSQR(qname="example.com"),
        )
    )

    observation = parse_packet(packet)

    assert observation is not None
    assert observation.transport_protocol == "udp"
    assert observation.source_port == 53000
    assert observation.destination_port == 53
    assert observation.tcp_flags is None
    assert observation.dns_present is True

    # DNS query contents are deliberately not part of the observation.
    assert not hasattr(observation, "dns_query")


def test_parse_ipv6_udp_packet():
    packet = make_packet(
        Ether()
        / IPv6(
            src="2001:db8::10",
            dst="2001:db8::20",
        )
        / UDP(sport=40000, dport=3478)
    )

    observation = parse_packet(packet)

    assert observation is not None
    assert observation.source_ip == "2001:db8::10"
    assert observation.destination_ip == "2001:db8::20"
    assert observation.ip_version == 6
    assert observation.transport_protocol == "udp"
    assert observation.source_port == 40000
    assert observation.destination_port == 3478
    assert observation.tcp_flags is None


def test_parse_other_ipv4_protocol():
    packet = make_packet(
        Ether()
        / IP(src="192.0.2.10", dst="192.0.2.20")
        / ICMP()
    )

    observation = parse_packet(packet)

    assert observation is not None
    assert observation.transport_protocol == "other"
    assert observation.source_port is None
    assert observation.destination_port is None
    assert observation.tcp_flags is None


def test_ignore_non_ip_packet():
    packet = make_packet(
        Ether()
        / ARP(
            psrc="192.0.2.10",
            pdst="192.0.2.20",
        )
    )

    assert parse_packet(packet) is None


def test_reject_invalid_packet_timestamp():
    packet = Ether() / IP(
        src="192.0.2.10",
        dst="192.0.2.20",
    ) / TCP()

    packet.time = "invalid"

    with pytest.raises(ValueError, match="Packet timestamp is invalid"):
        parse_packet(packet)
