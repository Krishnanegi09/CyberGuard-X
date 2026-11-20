# Phase 7 — DEFEND & AUTOMATE
**Lead:** M3 · **Gate:** `./scripts/check-phase.sh 7` · **Design refs:** `05-defense`, `06-threat-model` (E4, R1), `07-nfr` R4

## Milestones
- **7.1 [MVP]** The full action state machine, the executor interface, approvals (four-eyes) and the emergency stop.
- **7.2 [MVP]** The `fw_block` executor (nftables backend on the lab gateway via the signed helper), with TTL, dry-run, verify and rollback.
- **7.3 [MVP]** An incident and response timeline UI.
- **7.4 [STRETCH]** Container isolation, email or webhook notifications, autonomous mode (lab-only, TTL ≤ 15 min).

## Acceptance tests (marker `phase7`)
`test_action_requires_approval`, `test_requester_cannot_self_approve`, `test_executor_out_of_scope`, `test_fw_block_verify_and_rollback` (lab), `test_ttl_auto_rollback`, `test_emergency_stop_blocks_execute`, `test_emergency_stop_rolls_back_active`, `test_action_audit_trail`.

## Exit criteria
- The gate passes.
- The lab demo of recommend → approve → execute → verify (the attacker can't connect) → rollback (the attacker can connect again) is recorded.
- R4 is measured.
