# Phase 2 — Vertical Slice: the thin loop end to end
**Lead:** all three in parallel · **Gate:** `./scripts/check-phase.sh 2` · **Design refs:** `01`, `03`, `04` (risk v1, twin basics), `05` (notify only)

## Goal
The thinnest real implementation of every stage, wired together, so a working demo exists early.

## Milestones and owners
| # | Owner | Slice |
|---|---|---|
| 2.1 [MVP] | M1 | `DISCOVERY` + `TOP_PORTS` scans through the queue; assets persisted; `scan.updated` events |
| 2.2 [MVP] | M1 | Sensor agent v1 wrapping the existing capture, parser and flow code; authenticated, idempotent batch ingest |
| 2.3 [MVP] | M2 | Rule `PORT_SCAN_VERTICAL` → a finding with evidence links |
| 2.4 [MVP] | M2 | Twin snapshot from assets and flows; one shortest path to a `CROWN_JEWEL`; shown with the `SIMULATED` badge |
| 2.5 [MVP] | M2 | Risk score v1 (`DERIVED`) with a formula tooltip |
| 2.6 [MVP] | M3 | Recommendation → approval → `notify` executor → audit trail |
| 2.7 [MVP] | M3 | Dashboard from real aggregates + LISTEN/NOTIFY → WebSocket updates |

## Acceptance test (marker `phase2`)
`test_vertical_slice_e2e`, run against the lab:
1. Create an org with the lab scope.
2. Run a discovery scan; assets exist.
3. Start the sensor and run `lab/scenarios/scan_vertical.sh`.
4. A finding appears within the P3 latency target.
5. A twin rebuild produces a path.
6. The risk score is > 0 for the target.
7. Approve the recommendation; the notification is delivered.
8. The audit log contains every step.

## Exit criteria
- The gate passes, including `test_vertical_slice_e2e`.
- `docs/DEMO_RUNBOOK.md` steps 1–8 run by hand with no DB edits.
- The demo pcap for this scenario is saved to `lab/captures/` (fallback).

## Parallelism
Contracts for flows, findings and twin endpoints **must be merged first** (main session). After that, M1, M2 and M3 each work in their own worktree. Merge order: M1 (data) → M2 → M3.
