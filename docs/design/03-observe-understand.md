# 03 — Observe & Understand

## Scanning
| Profile | argv (built server-side) | Timeout |
|---|---|---|
| `DISCOVERY` | `nmap -sn -oX - <target>` | 5 min |
| `TOP_PORTS` | `nmap -sS --top-ports 1000 -T4 -oX - <target>` | 15 min |
| `SERVICE` | `nmap -sV --version-light -oX - <target>` | 30 min |
| `OS` | `nmap -O -oX - <target>` | 15 min |

- The target must be an IP or CIDR **inside an org scope** (checked with `ipaddress`); hostnames are rejected. Validation happens again in the worker, not only in the API.
- Run with `subprocess` using an argv list, `start_new_session=True`. Cancelling kills the process group.
- `-sS` and `-O` need root, so run them through the sensor or a privileged helper, or fall back to `-sT` and record the limitation. Never make the API root.
- Parse the XML into hosts, ports, services and OS. Store observations linked to `scan_run_id`.
- **Change detection:** compare with the last `COMPLETED` run of the same scope and profile → `asset_changes` (`HOST_NEW`, `HOST_GONE`, `PORT_OPENED`, `PORT_CLOSED`, `SERVICE_CHANGED`).

## Sensor capture
- Interface selection comes from the sensor config, not the browser.
- Pipeline: capture → bounded queue (drop and count when full) → parser → flow tracker (idle timeout 30 s, active timeout 120 s) → batcher (every 2 s or 500 flows) → `POST /sensors/ingest` with `batch_id`.
- If the API is unreachable, buffer up to N batches on disk and then drop the oldest, **always reporting the drops**.
- Heartbeat every 10 s with drop, queue and CPU stats. The UI shows the sensor as stale after 30 s.
- Parser and flow tests replay real lab pcaps from `tests/fixtures/pcaps/`.
- **Replay mode:** the sensor can read a recorded lab `.pcap` through the *same* pipeline (`CaptureSource` = `LIVE | REPLAY`). `capture_sessions.source` stores which one was used, and the UI shows a `REPLAY` tag. Replayed data is still `OBSERVED` (it's real captured traffic), but it's never shown as live. This is used for tests, ML datasets and the demo fallback.

## Detection layers (build in this order)
1. **Rules (`RULE`)**, each one a small class with `id, version, evaluate(window) -> [Detection]` and its own pcap or flow fixture test:
   | Rule | Logic (starting thresholds, tune on lab data) | ATT&CK |
   |---|---|---|
   | `PORT_SCAN_VERTICAL` | one source hits ≥ 50 distinct ports on one host within 60 s | T1046 |
   | `HOST_SWEEP` | one source hits ≥ 20 hosts within 60 s | T1046 |
   | `BRUTE_FORCE_AUTH` | ≥ 20 short flows to 22/3389/HTTP-login from one source within 60 s | T1110 |
   | `RISKY_EXPOSED_SERVICE` | telnet/ftp/smb/rdp/db port open on an asset | T1133 / T1190 |
   | `NONSTANDARD_PORT_PROTO` | a known protocol seen on an unexpected port | T1571 |
   | `NEW_EXTERNAL_DEST` | an asset talks to a destination never seen in its baseline | T1071 |
   | `BEACONING` | regular-interval flows to one destination (low jitter) | T1071 |
2. **Statistical (`STATISTICAL`, provenance `DERIVED`):** a per-asset rolling baseline (bytes, connections, distinct destinations). Alert when z > 3 for k consecutive windows.
3. **ML (`ML`):** see `04-twin-ml.md`. It adds to rules and never replaces them.

## Findings
- `level` describes confidence: `OBSERVATION → INDICATOR → SUSPECTED → CONFIRMED_INCIDENT`.
- `status` describes the workflow: `OPEN → INVESTIGATING → CONFIRMED | DISMISSED | FALSE_POSITIVE`.
- An exposed port alone is an `OBSERVATION`. A rule hit is an `INDICATOR`. Several correlated indicators make it `SUSPECTED`. Only a human makes it `CONFIRMED_INCIDENT`.
- Each finding links to its raw flows, observations and samples through `finding_evidence`. The UI drills down to them.

## Vulnerability correlation
- Turn Nmap service and version output into a CPE and match it against a **local CVE mirror** (an NVD JSON feed or the API 2.0, refreshed weekly by a job; record the source and date).
- Findings are labelled `potential`, with the match confidence (exact version vs. a range). Never call them confirmed vulnerabilities.
- The CVSS base score is stored and used for attack-path weights.

## ATT&CK
A versioned static table `attack_techniques(id, name, tactic)` plus a rule→technique mapping in code. Record the ATT&CK version used.
