# DEMO RUNBOOK

Target length: **12 minutes**. Rehearse twice from a reset lab before every review.

## T-30 min: preflight
```bash
make lab-reset && make lab-up            # fresh lab containers
./scripts/check-phase.sh <latest>        # gate passes on the demo build
cd backend && alembic current            # at head
```
- [ ] API, worker and sensor are running; the sensor chip shows **live**.
- [ ] Demo org exists with scope = the lab CIDR; one asset tagged `CROWN_JEWEL`.
- [ ] Browser zoom at 110%, dark theme, notifications muted.
- [ ] **Fallback pcaps** present: `lab/captures/demo-scan.pcap`, `demo-bruteforce.pcap`, `demo-benign.pcap`.
- [ ] A screen recording of the last successful full run is on the desktop (last resort).

## The story (§6 of the design: one loop, end to end)
| # | Show | Say (one line) | Proof on screen |
|---|---|---|---|
| 1 | Log in, pick the org | "Identity from Firebase, permissions from our DB" | role badge |
| 2 | Observe → run a `DISCOVERY` + `TOP_PORTS` scan | "Scans only inside the authorized lab scope" | live status, assets appear (`OBSERVED`) |
| 3 | Try a scan on `8.8.8.8` | "Out-of-scope is rejected and audited" | error envelope + audit row |
| 4 | Monitoring → flows streaming | "A separate privileged sensor; the API never runs as root" | flow table, drop counter = 0 |
| 5 | Run `lab/scenarios/scan_vertical.sh` | "Attacker activity in our lab" | `PORT_SCAN_VERTICAL` finding within ~10 s |
| 6 | Open the finding → evidence | "Every alert traces back to raw flows" | evidence drill-down, ATT&CK T1046 |
| 7 | Simulate → twin + attack path to the crown jewel | "Simulated, never presented as live" | SIMULATION banner, path score |
| 8 | What-if: close the port → path disappears | "Test a fix before applying it" | before/after diff |
| 9 | Predict → risk score and model prediction | "Rule-based score plus a versioned ML model" | `PREDICTED` badge, model version, formula tooltip |
| 10 | Defend → approve `fw_block` (second user approves) | "Four-eyes, dry-run, TTL" | dry-run preview, status flow |
| 11 | Attacker retries → blocked; then roll back | "Verified, and reversible" | verification result, ROLLED_BACK |
| 12 | Audit log, filtered to the last 10 min | "Every step is accountable" | full trail |
| 13 | ML report page | "Measured, with honest cross-domain results" | three metric tables |

## Fallback plan (decide within 30 s, and say it out loud)
| Failure | Fallback | Honest framing |
|---|---|---|
| Live sensor or lab capture fails | `make replay PCAP=lab/captures/demo-scan.pcap`. The sensor reads the file through the same pipeline | "This is a **replay of a real capture** recorded in our lab on <date>." The UI shows a `REPLAY` source tag |
| Scan hangs | Show the previous completed scan run from history | "Here is the completed run from this morning" |
| `fw_block` helper fails | Show the dry-run plus the recorded action from rehearsal in the audit log | State the failure, then show the rollback path |
| Whole stack down | Play the screen recording | "Recorded on <date> from this exact build <git sha>" |

Replays are **real captured data**, not fabricated, but they must be labelled as replays in the UI and said out loud. Never present a replay as live.

## After the demo
Note what went wrong in `PROGRESS.md` and fix it before the next review.
