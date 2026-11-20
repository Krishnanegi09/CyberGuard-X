# Phase 5 — SIMULATE depth (Digital Twin)
**Lead:** M2 · **Gate:** `./scripts/check-phase.sh 5` · **Design refs:** `04-twin-ml` (twin, attack paths, what-if), `10-ui` (simulation mode), `07-nfr` P9, P10

## Milestones
- **5.1 [MVP]** Versioned twin snapshots with trust zones and manual asset criticality.
- **5.2 [MVP]** Weighted k-shortest attack paths to `HIGH`/`CROWN_JEWEL` assets, with scores.
- **5.3 [MVP]** What-if scenarios (`close_port`, `remove_edge`, `segment_zone`, `patch_cve`) with a before/after diff.
- **5.4 [STRETCH]** A timeline diff between snapshots.

## Acceptance tests (marker `phase5`)
`test_paths_on_fixture_graph` (known answer), `test_whatif_close_port_removes_path`, `test_simulation_never_writes_observed_tables`, `test_simulated_provenance_on_all_outputs`.

## Exit criteria
- The gate passes.
- Every simulate route renders the SIMULATION banner (a UI test).
- P9 and P10 are measured.
