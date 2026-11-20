import ipaddress
import subprocess
import sys

from pathlib import Path
from unittest.mock import patch

import pytest

from backend.app.services.discovery import nmap_runner
from backend.app.services.discovery.nmap_runner import (
    DiscoveredHost,
    NmapExecutionError,
    _execute_bounded_scan,
    _parse_xml,
    run_nmap_scan,
)
from backend.app.services.discovery.target_validation import (
    ScanProfile,
    validate_target,
)


@pytest.fixture
def valid_target():
    return validate_target(
        "192.168.10.0/28",
        ["192.168.10.0/24"],
        ScanProfile.TCP_SERVICE_DISCOVERY,
    )


@pytest.fixture
def nmap_xml(tmp_path):
    xml = """<?xml version="1.0"?>
<nmaprun scanner="nmap" version="7.97">
  <host>
    <status state="up" reason="syn-ack"/>
    <address addr="192.168.10.10" addrtype="ipv4"/>
    <hostnames>
      <hostname name="test-server.local" type="PTR"/>
    </hostnames>
    <os>
      <osmatch name="Linux 5.x" accuracy="95"/>
    </os>
    <ports>
      <port protocol="tcp" portid="22">
        <state state="open" reason="syn-ack"/>
        <service name="ssh" product="OpenSSH" version="9.0"/>
      </port>
      <port protocol="tcp" portid="80">
        <state state="closed" reason="reset"/>
        <service name="http"/>
      </port>
    </ports>
  </host>
  <host>
    <status state="down" reason="no-response"/>
    <address addr="192.168.10.11" addrtype="ipv4"/>
  </host>
</nmaprun>
"""
    path = tmp_path / "fixture.xml"
    path.write_text(xml)
    return path


def test_parses_only_up_hosts_and_open_ports(nmap_xml):
    hosts = _parse_xml(nmap_xml)

    assert len(hosts) == 1
    assert isinstance(hosts[0], DiscoveredHost)
    assert hosts[0].ip_address == "192.168.10.10"
    assert hosts[0].hostname == "test-server.local"
    assert hosts[0].operating_system == "Linux 5.x"

    assert len(hosts[0].ports) == 1
    assert hosts[0].ports[0].port == 22
    assert hosts[0].ports[0].protocol == "tcp"
    assert hosts[0].ports[0].service == "ssh"
    assert hosts[0].ports[0].product == "OpenSSH"
    assert hosts[0].ports[0].version == "9.0"


def test_rejects_malformed_xml(tmp_path):
    path = tmp_path / "invalid.xml"
    path.write_text("<nmaprun><host>")

    with pytest.raises(NmapExecutionError, match="invalid"):
        _parse_xml(path)


def test_rejects_unexpected_xml_root(tmp_path):
    path = tmp_path / "unexpected.xml"
    path.write_text("<not-nmap/>")

    with pytest.raises(NmapExecutionError, match="Unexpected"):
        _parse_xml(path)


def test_run_uses_shell_false_and_fixed_arguments(valid_target):
    xml = b"""<?xml version="1.0"?>
<nmaprun>
  <host>
    <status state="up"/>
    <address addr="192.168.10.10" addrtype="ipv4"/>
  </host>
</nmaprun>"""

    with (
        patch.object(
            nmap_runner,
            "resolve_nmap_binary",
            return_value=Path("/usr/bin/nmap"),
        ),
        patch.object(
            nmap_runner,
            "get_nmap_version",
            return_value="Nmap version 7.97",
        ),
        patch.object(
            nmap_runner,
            "_execute_bounded_scan",
        ) as mocked_execute,
    ):
        def fake_execute(command, xml_output):
            xml_output.write(xml)
            return 0, 0, b""

        mocked_execute.side_effect = fake_execute

        result = run_nmap_scan(valid_target)

    assert result.scanner_name == "Nmap"
    assert result.scanner_version == "Nmap version 7.97"
    assert len(result.hosts) == 1

    command = mocked_execute.call_args.args[0]

    assert command[0] == "/usr/bin/nmap"
    assert command[1:5] == ["-n", "-T3", "-oX", "-"]
    assert command[-1] == "192.168.10.0/28"


def test_rejects_unvalidated_target():
    with pytest.raises(Exception, match="validated"):
        run_nmap_scan("192.168.10.0/24")


def test_handles_scan_timeout(valid_target):
    with (
        patch.object(
            nmap_runner,
            "resolve_nmap_binary",
            return_value=Path("/usr/bin/nmap"),
        ),
        patch.object(
            nmap_runner,
            "get_nmap_version",
            return_value="Nmap version 7.97",
        ),
        patch.object(
            nmap_runner,
            "_execute_bounded_scan",
            side_effect=NmapExecutionError(
                "Nmap scan exceeded the configured timeout."
            ),
        ),
    ):
        with pytest.raises(NmapExecutionError, match="timeout"):
            run_nmap_scan(valid_target)


def test_rejects_nonzero_nmap_exit_code(valid_target):
    with (
        patch.object(
            nmap_runner,
            "resolve_nmap_binary",
            return_value=Path("/usr/bin/nmap"),
        ),
        patch.object(
            nmap_runner,
            "get_nmap_version",
            return_value="Nmap version 7.97",
        ),
        patch.object(
            nmap_runner,
            "_execute_bounded_scan",
            return_value=(1, 0, b""),
        ),
    ):
        with pytest.raises(NmapExecutionError, match="failed"):
            run_nmap_scan(valid_target)


def test_bounded_scan_executes_without_shell_and_captures_xml(tmp_path):
    real_popen = subprocess.Popen
    observed_shell_values = []

    def tracked_popen(*args, **kwargs):
        observed_shell_values.append(kwargs.get("shell"))
        return real_popen(*args, **kwargs)

    script = (
        "import sys; "
        "sys.stdout.buffer.write(b'<nmaprun></nmaprun>')"
    )

    with (
        patch.object(
            nmap_runner.subprocess,
            "Popen",
            side_effect=tracked_popen,
        ),
        (tmp_path / "output.xml").open("w+b") as output,
    ):
        return_code, stderr_size, stderr_excerpt = _execute_bounded_scan(
            [sys.executable, "-c", script],
            output,
        )

        output.seek(0)
        captured = output.read()

    assert return_code == 0
    assert stderr_size == 0
    assert stderr_excerpt == b""
    assert captured == b"<nmaprun></nmaprun>"
    assert observed_shell_values == [False]


def test_rejects_oversized_xml_during_execution(tmp_path, monkeypatch):
    monkeypatch.setattr(
        nmap_runner,
        "MAX_XML_OUTPUT_BYTES",
        32,
    )

    script = (
        "import sys; "
        "sys.stdout.buffer.write(b'X' * 4096); "
        "sys.stdout.flush()"
    )

    with (tmp_path / "output.xml").open("w+b") as output:
        with pytest.raises(
            NmapExecutionError,
            match="exceeded the permitted size",
        ):
            _execute_bounded_scan(
                [sys.executable, "-c", script],
                output,
            )

        assert output.tell() <= 32


def test_stderr_capture_is_bounded(tmp_path, monkeypatch):
    monkeypatch.setattr(nmap_runner, "MAX_STDERR_BYTES", 16)

    script = (
        "import sys; "
        "sys.stderr.buffer.write(b'E' * 100); "
        "sys.stderr.flush(); "
        "sys.stdout.buffer.write(b'<nmaprun/>')"
    )

    with (tmp_path / "output.xml").open("w+b") as output:
        return_code, stderr_total, stderr_excerpt = _execute_bounded_scan(
            [sys.executable, "-c", script],
            output,
        )

    assert return_code == 0
    assert stderr_total == 100
    assert len(stderr_excerpt) == 16


def test_bounded_scan_terminates_process_on_timeout(tmp_path, monkeypatch):
    monkeypatch.setattr(nmap_runner, "SCAN_TIMEOUT_SECONDS", 0.2)

    script = "import time; time.sleep(5)"

    with (tmp_path / "output.xml").open("w+b") as output:
        with pytest.raises(
            NmapExecutionError,
            match="timeout",
        ):
            _execute_bounded_scan(
                [sys.executable, "-c", script],
                output,
            )


def test_rejects_host_outside_authorized_target(tmp_path):
    path = tmp_path / "out_of_scope.xml"
    path.write_text("""<?xml version="1.0"?>
<nmaprun>
  <host>
    <status state="up"/>
    <address addr="192.168.20.10" addrtype="ipv4"/>
  </host>
</nmaprun>
""")

    with pytest.raises(NmapExecutionError, match="outside"):
        _parse_xml(
            path,
            ipaddress.ip_network("192.168.10.0/24"),
        )


def test_ignores_other_address_family_for_authorized_target(tmp_path):
    path = tmp_path / "wrong_family.xml"
    path.write_text("""<?xml version="1.0"?>
<nmaprun>
  <host>
    <status state="up"/>
    <address addr="2001:db8::10" addrtype="ipv6"/>
  </host>
</nmaprun>
""")

    hosts = _parse_xml(
        path,
        ipaddress.ip_network("192.168.10.0/24"),
    )

    assert hosts == ()
