# Phase 3 — OBSERVE depth
**Lead:** M1 · **Gate:** `./scripts/check-phase.sh 3` · **Design refs:** `03-observe-understand` (Scanning, Sensor), `02-data-model` (retention), `07-nfr` P1, P2, P4, P5, R1

## Milestones
- **3.1 [MVP]** All four scan profiles, cancellation (kills the process group), timeouts, and a scan history UI.
- **3.2 [MVP]** Change detection → `asset_changes` and an asset timeline UI.
- **3.3 [MVP]** Sensor hardening: drop counters, heartbeat, on-disk buffer during an API outage, time-partitioned `flows`/`packet_samples`, retention sweep.
- **3.4 [MVP]** Topology view (React Flow) built only from observed assets and flows.
- **3.5 [STRETCH]** Zeek log ingestion as a second `CaptureSource`.

## Acceptance tests (marker `phase3`)
`test_scan_cancel_kills_process`, `test_scan_timeout`, `test_scan_target_injection`, `test_change_detection_new_port`, `test_pcap_replay_flow_counts`, `test_ingest_replay`, `test_ingest_oversize`, `test_sensor_outage_buffer`, `test_retention_drops_partition`.

## Exit criteria
- The gate passes.
- P1, P2, P4, P5 and R1 are measured and recorded in `docs/PERF.md` (record the real numbers even if they miss).
