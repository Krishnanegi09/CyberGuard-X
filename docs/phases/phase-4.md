# Phase 4 — UNDERSTAND depth
**Lead:** M2 · **Gate:** `./scripts/check-phase.sh 4` · **Design refs:** `03-observe-understand` (Detection, Findings, CVE, ATT&CK), `07-nfr` P3

## Milestones
- **4.1 [MVP]** The rule library (all 7 rules in `03`), each with a lab-replay test; deduplication with `first_seen`/`last_seen`/`hit_count`.
- **4.2 [MVP]** The finding workflow (`level` + `status`) and an investigation UI with an evidence drill-down to raw flows.
- **4.3 [MVP]** CVE correlation from a local mirror, labelled `potential`, with match confidence.
- **4.4 [MVP]** The ATT&CK mapping table (ATT&CK version recorded).
- **4.5 [MVP]** Per-asset statistical baselines (`DERIVED`).
- **4.6 [STRETCH]** Correlating several findings into incidents.

## Acceptance tests (marker `phase4`)
- One test per rule, using a scenario pcap: `test_rule_<id>_fires` and `test_rule_<id>_quiet_on_benign`.
- `test_dedup_increments_hit_count`, `test_cve_match_potential_label`, `test_evidence_links_resolve`.

## Exit criteria
- The gate passes.
- Every `lab/scenarios/*` script triggers its expected finding.
- The false-positive rate on `benign_baseline` replay is measured and recorded (target: ≤ 1 false finding per hour of baseline).
- P3 is measured.
