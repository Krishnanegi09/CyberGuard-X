import ipaddress
import os
import selectors
import shutil
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET

from dataclasses import dataclass
from pathlib import Path

from backend.app.services.discovery.target_validation import (
    DiscoveryValidationError,
    ValidatedTarget,
    build_nmap_arguments,
)


NMAP_BINARY = Path(
    "/Applications/nmap.app/Contents/Resources/bin/nmap"
)
SCAN_TIMEOUT_SECONDS = 180
VERSION_TIMEOUT_SECONDS = 30
MAX_XML_OUTPUT_BYTES = 5 * 1024 * 1024
MAX_STDERR_BYTES = 16 * 1024
READ_CHUNK_BYTES = 64 * 1024

_VERSION_CACHE: dict[Path, str] = {}


class NmapExecutionError(RuntimeError):
    """Raised when Nmap cannot complete a discovery scan."""


@dataclass(frozen=True)
class DiscoveredPort:
    port: int
    protocol: str
    service: str | None
    product: str | None
    version: str | None


@dataclass(frozen=True)
class DiscoveredHost:
    ip_address: str
    hostname: str | None
    operating_system: str | None
    ports: tuple[DiscoveredPort, ...]


@dataclass(frozen=True)
class NmapScanResult:
    scanner_name: str
    scanner_version: str
    hosts: tuple[DiscoveredHost, ...]


def resolve_nmap_binary() -> Path:
    """Resolve the configured Nmap binary without invoking a shell."""
    if NMAP_BINARY.is_file() and NMAP_BINARY.stat().st_mode & 0o111:
        return NMAP_BINARY

    discovered = shutil.which("nmap")
    if discovered:
        return Path(discovered)

    raise NmapExecutionError(
        "Nmap executable was not found. Install Nmap or configure "
        "the scanner executable."
    )


def get_nmap_version(binary: Path) -> str:
    if binary in _VERSION_CACHE:
        return _VERSION_CACHE[binary]

    try:
        completed = subprocess.run(
            [str(binary), "--version"],
            capture_output=True,
            text=True,
            timeout=VERSION_TIMEOUT_SECONDS,
            check=False,
            shell=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise NmapExecutionError(
            "Unable to determine the Nmap version."
        ) from exc

    if completed.returncode != 0:
        raise NmapExecutionError("Nmap version check failed.")

    first_line = completed.stdout.splitlines()
    if not first_line:
        raise NmapExecutionError("Nmap returned an empty version response.")

    ver = first_line[0][:50]
    _VERSION_CACHE[binary] = ver
    return ver


def _parse_xml(
    xml_path: Path,
    target_network: ipaddress.IPv4Network | ipaddress.IPv6Network | None = None,
) -> tuple[DiscoveredHost, ...]:
    try:
        tree = ET.parse(xml_path)
    except (ET.ParseError, OSError) as exc:
        raise NmapExecutionError(
            "Nmap returned invalid or unreadable XML output."
        ) from exc

    root = tree.getroot()

    if root.tag != "nmaprun":
        raise NmapExecutionError("Unexpected Nmap XML document.")

    hosts = []

    for host in root.findall("host"):
        status = host.find("status")
        if status is None or status.get("state") != "up":
            continue

        ip_address = None

        for address in host.findall("address"):
            address_type = address.get("addrtype")
            address_value = address.get("addr")

            if address_type not in ("ipv4", "ipv6") or not address_value:
                continue

            try:
                parsed_address = ipaddress.ip_address(address_value)
            except ValueError:
                continue

            if (
                (address_type == "ipv4" and parsed_address.version == 4)
                or (address_type == "ipv6" and parsed_address.version == 6)
            ):
                if target_network is not None:
                    if parsed_address.version != target_network.version:
                        continue

                    if parsed_address not in target_network:
                        raise NmapExecutionError(
                            "Nmap returned a host outside the authorized target."
                        )

                ip_address = str(parsed_address)
                break

        if ip_address is None:
            continue

        hostname = None
        hostnames = host.find("hostnames")
        if hostnames is not None:
            for item in hostnames.findall("hostname"):
                name = item.get("name")
                if name:
                    hostname = name[:255]
                    break

        operating_system = None
        os_element = host.find("os")
        if os_element is not None:
            os_match = os_element.find("osmatch")
            if os_match is not None:
                operating_system = os_match.get("name", "")[:255] or None

        discovered_ports = []
        ports_element = host.find("ports")

        if ports_element is not None:
            for port_element in ports_element.findall("port"):
                state = port_element.find("state")
                if state is None or state.get("state") != "open":
                    continue

                try:
                    port_number = int(port_element.get("portid", ""))
                except ValueError:
                    continue

                protocol = port_element.get("protocol")
                if (
                    not 1 <= port_number <= 65535
                    or protocol not in ("tcp", "udp")
                ):
                    continue

                service_element = port_element.find("service")

                service = None
                product = None
                version = None

                if service_element is not None:
                    service = service_element.get("name")
                    product = service_element.get("product")
                    version = service_element.get("version")

                discovered_ports.append(
                    DiscoveredPort(
                        port=port_number,
                        protocol=protocol,
                        service=service[:100] if service else None,
                        product=product[:255] if product else None,
                        version=version[:100] if version else None,
                    )
                )

        hosts.append(
            DiscoveredHost(
                ip_address=ip_address,
                hostname=hostname,
                operating_system=operating_system,
                ports=tuple(discovered_ports),
            )
        )

    return tuple(hosts)


def _execute_bounded_scan(
    command: list[str],
    xml_output,
) -> tuple[int, int, bytes]:
    """
    Execute Nmap while continuously draining both pipes.

    XML output is written to a temporary file and stopped immediately
    when its configured limit is exceeded. Stderr is drained completely
    but only a bounded excerpt is retained.
    """
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=False,
        )
    except OSError as exc:
        raise NmapExecutionError("Unable to execute Nmap.") from exc

    assert process.stdout is not None
    assert process.stderr is not None

    stderr_excerpt = bytearray()
    stderr_total = 0
    xml_total = 0
    deadline = time.monotonic() + SCAN_TIMEOUT_SECONDS

    try:
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ, "xml")
            selector.register(process.stderr, selectors.EVENT_READ, "stderr")

            while selector.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise NmapExecutionError(
                        f"Nmap scan exceeded the {SCAN_TIMEOUT_SECONDS}-second timeout."
                    )

                events = selector.select(timeout=min(remaining, 1.0))

                for key, _ in events:
                    chunk = os.read(key.fileobj.fileno(), READ_CHUNK_BYTES)

                    if not chunk:
                        selector.unregister(key.fileobj)
                        key.fileobj.close()
                        continue

                    if key.data == "xml":
                        xml_total += len(chunk)

                        if xml_total > MAX_XML_OUTPUT_BYTES:
                            raise NmapExecutionError(
                                "Nmap XML output exceeded the permitted size."
                            )

                        xml_output.write(chunk)

                    else:
                        stderr_total += len(chunk)
                        available = MAX_STDERR_BYTES - len(stderr_excerpt)

                        if available > 0:
                            stderr_excerpt.extend(chunk[:available])

            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise NmapExecutionError(
                    f"Nmap scan exceeded the {SCAN_TIMEOUT_SECONDS}-second timeout."
                )

            return_code = process.wait(timeout=remaining)

    except (OSError, subprocess.TimeoutExpired) as exc:
        raise NmapExecutionError(
            "Nmap process could not complete safely."
        ) from exc

    except BaseException:
        if process.poll() is None:
            process.kill()

        process.wait()
        raise

    finally:
        if process.poll() is None:
            process.kill()
            process.wait()

        process.stdout.close()
        process.stderr.close()

    return return_code, stderr_total, bytes(stderr_excerpt)


def run_nmap_scan(target: ValidatedTarget) -> NmapScanResult:
    """
    Execute a previously validated Nmap scan.

    The caller is responsible for authenticating the user, checking
    organization permissions, verifying active scope ownership, and
    recording the ScanRun lifecycle.
    """
    if not isinstance(target, ValidatedTarget):
        raise DiscoveryValidationError(
            "Nmap requires a validated discovery target."
        )

    binary = resolve_nmap_binary()
    version = get_nmap_version(binary)
    arguments = build_nmap_arguments(target)
    command = [str(binary), *arguments]

    try:
        with tempfile.TemporaryFile(mode="w+b") as xml_output:
            return_code, stderr_size, stderr_excerpt = (
                _execute_bounded_scan(command, xml_output)
            )

            if return_code != 0:
                raise NmapExecutionError(
                    "Nmap scan failed "
                    f"(exit code {return_code}; "
                    f"stderr bytes {stderr_size}; "
                    f"diagnostic captured {len(stderr_excerpt)} bytes)."
                )

            xml_output.seek(0)

            with tempfile.NamedTemporaryFile(mode="w+b") as parsed_file:
                shutil.copyfileobj(xml_output, parsed_file)
                parsed_file.flush()
                parsed_file.seek(0)

                hosts = _parse_xml(Path(parsed_file.name), target.network)

    except OSError as exc:
        raise NmapExecutionError(
            "Unable to read or store Nmap scan output."
        ) from exc

    return NmapScanResult(
        scanner_name="Nmap",
        scanner_version=version,
        hosts=hosts,
    )
