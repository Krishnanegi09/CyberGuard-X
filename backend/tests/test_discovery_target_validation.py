import pytest

from backend.app.services.discovery.target_validation import (
    DiscoveryValidationError,
    ScanProfile,
    build_nmap_arguments,
    validate_target,
)


def test_accepts_target_inside_approved_ipv4_scope():
    result = validate_target(
        "192.168.10.0/28",
        ["192.168.10.0/24"],
        ScanProfile.HOST_DISCOVERY,
    )

    assert str(result.network) == "192.168.10.0/28"
    assert result.address_count == 16


def test_accepts_target_inside_approved_ipv6_scope():
    result = validate_target(
        "2001:db8:abcd:1::/120",
        ["2001:db8:abcd::/48"],
        ScanProfile.HOST_DISCOVERY,
    )

    assert result.network.version == 6
    assert result.address_count == 256


def test_rejects_target_outside_approved_scope():
    with pytest.raises(DiscoveryValidationError, match="not completely"):
        validate_target(
            "192.168.20.0/24",
            ["192.168.10.0/24"],
            ScanProfile.HOST_DISCOVERY,
        )


def test_rejects_target_partially_outside_approved_scope():
    with pytest.raises(DiscoveryValidationError, match="not completely"):
        validate_target(
            "192.168.10.0/23",
            ["192.168.10.0/24"],
            ScanProfile.HOST_DISCOVERY,
        )


@pytest.mark.parametrize(
    "target",
    [
        "192.168.10.5/24",
        "not-a-cidr",
        "",
    ],
)
def test_rejects_invalid_or_noncanonical_targets(target):
    with pytest.raises(DiscoveryValidationError):
        validate_target(
            target,
            ["192.168.10.0/24"],
            ScanProfile.HOST_DISCOVERY,
        )


def test_rejects_target_larger_than_address_limit():
    with pytest.raises(DiscoveryValidationError, match="maximum"):
        validate_target(
            "10.0.0.0/23",
            ["10.0.0.0/16"],
            ScanProfile.HOST_DISCOVERY,
        )


def test_rejects_scope_with_wrong_ip_version():
    with pytest.raises(DiscoveryValidationError, match="not completely"):
        validate_target(
            "2001:db8::/64",
            ["192.168.10.0/24"],
            ScanProfile.HOST_DISCOVERY,
        )


def test_builds_fixed_host_discovery_arguments():
    target = validate_target(
        "192.168.10.0/28",
        ["192.168.10.0/24"],
        ScanProfile.HOST_DISCOVERY,
    )

    arguments = build_nmap_arguments(target)

    assert arguments == [
        "-n",
        "-T3",
        "-oX",
        "-",
        "-sn",
        "192.168.10.0/28",
    ]


def test_builds_fixed_tcp_service_discovery_arguments():
    target = validate_target(
        "192.168.10.0/28",
        ["192.168.10.0/24"],
        ScanProfile.TCP_SERVICE_DISCOVERY,
    )

    arguments = build_nmap_arguments(target)

    assert "-sT" in arguments
    assert "-sV" in arguments
    assert "--version-light" in arguments
    assert "--top-ports" in arguments
    assert "100" in arguments
    assert arguments[-1] == "192.168.10.0/28"


def test_builds_ipv6_arguments():
    target = validate_target(
        "2001:db8::/120",
        ["2001:db8::/64"],
        ScanProfile.HOST_DISCOVERY,
    )

    arguments = build_nmap_arguments(target)

    assert "-6" in arguments
    assert arguments[-1] == "2001:db8::/120"


def test_rejects_untrusted_profile():
    with pytest.raises(DiscoveryValidationError):
        validate_target(
            "192.168.10.0/28",
            ["192.168.10.0/24"],
            "arbitrary_nmap_command",
        )
