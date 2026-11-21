import ipaddress
from dataclasses import dataclass
from enum import Enum
from typing import Iterable

MAX_TARGET_ADDRESSES = 256


class DiscoveryValidationError(ValueError):
    """Raised when a discovery request violates scan policy."""


class ScanProfile(str, Enum):
    HOST_DISCOVERY = "host_discovery"
    TCP_SERVICE_DISCOVERY = "tcp_service_discovery"


@dataclass(frozen=True)
class ValidatedTarget:
    network: ipaddress.IPv4Network | ipaddress.IPv6Network
    profile: ScanProfile

    @property
    def address_count(self) -> int:
        return self.network.num_addresses


def parse_network(value: str):
    if not isinstance(value, str) or not value.strip():
        raise DiscoveryValidationError("A CIDR target is required.")

    try:
        return ipaddress.ip_network(value.strip(), strict=True)
    except ValueError as exc:
        raise DiscoveryValidationError(
            f"Invalid or noncanonical CIDR target: {value!r}."
        ) from exc


def validate_target(
    target_cidr: str,
    approved_cidrs: Iterable[str],
    profile: ScanProfile,
) -> ValidatedTarget:
    """
    Validate that a requested target is completely contained in an
    organization-approved network scope.

    This function does not execute a scan or send network traffic.
    """
    if not isinstance(profile, ScanProfile):
        raise DiscoveryValidationError("Unsupported discovery profile.")

    target = parse_network(target_cidr)

    approved_networks = []

    for value in approved_cidrs:
        approved = parse_network(value)

        if approved.version == target.version:
            approved_networks.append(approved)

    if not any(target.subnet_of(approved) for approved in approved_networks):
        raise DiscoveryValidationError(
            "Requested target is not completely contained in an "
            "approved network scope."
        )

    if target.num_addresses > MAX_TARGET_ADDRESSES:
        raise DiscoveryValidationError(
            f"Target exceeds the maximum of "
            f"{MAX_TARGET_ADDRESSES} IP addresses per scan."
        )

    return ValidatedTarget(
        network=target,
        profile=profile,
    )


def build_nmap_arguments(target: ValidatedTarget) -> list[str]:
    """
    Build a fixed Nmap argument list.

    Never accepts arbitrary user-supplied command-line arguments.
    The caller must execute this list with shell=False.
    """
    if not isinstance(target, ValidatedTarget):
        raise DiscoveryValidationError("A validated target is required.")

    arguments = ["-n", "-T3", "-oX", "-"]

    if target.network.version == 6:
        arguments.append("-6")

    if target.profile == ScanProfile.HOST_DISCOVERY:
        arguments.append("-sn")

    elif target.profile == ScanProfile.TCP_SERVICE_DISCOVERY:
        arguments.extend([
            "-sT",
            "-sV",
            "--version-light",
            "--top-ports",
            "100",
        ])

    else:
        raise DiscoveryValidationError("Unsupported discovery profile.")

    arguments.append(str(target.network))

    return arguments
