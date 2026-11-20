# Phase 1 — Foundation Hardening
**Lead:** M3 (with M1 on 1.8) · **Gate:** `./scripts/check-phase.sh 1` · **Design refs:** `01-architecture`, `02-data-model`, `06-threat-model`, `08-lab`, `09-ethics-legal`

## Goal
A trustworthy base: auth, tenancy, data safety, the job queue and the contracts are solid before features pile on.

## Milestones
- **1.1 [MVP] Finish the pending migration** using the `safe-migration` skill. Prove the legacy assets, port observations and scan history survive (row counts and UUID spot-checks in the PR).
- **1.2 [MVP] Auth and tenancy.** Admin SDK verification with revocation checks on sensitive routes; Postgres `memberships` with roles; an `OrgContext` dependency on every route.
- **1.3 [MVP] Row-Level Security** on all tenant tables; `rls-check` passes.
- **1.4 [MVP] Job queue and worker** as in `01-architecture`: claim, retry, reaper, `DEAD` state.
- **1.5 [MVP] Audit log:** append-only, enforced by grants and a trigger.
- **1.6 [MVP] Contracts:** enums in the schemas, the error envelope, cursor pagination, `Idempotency-Key`, the generated TS client, and a CI check that the client isn't stale.
- **1.7 [MVP] Remove fake data:** `no-fake-data-audit` finds zero hits.
- **1.8 [MVP] Lab v1:** `lab/docker-compose.yml`, `docs/LAB.md`, and the scope allowlist set to the lab CIDR. Prove the lab is isolated.

## Acceptance tests (`tests/acceptance/`, marker `phase1`)
`test_invalid_token`, `test_revoked_token`, `test_cross_org_read_denied`, `test_cross_org_write_denied`, `test_role_escalation`, `test_audit_immutable`, `test_job_retry_and_dead`, `test_job_reaper`, `test_error_envelope`, `test_scope_violation`.

## Exit criteria
- The gate passes: verify-all, `pytest -m phase1`, `rls-check`, `no-fake-data-audit`, and the client-stale check.
- Migration evidence (backup path, row counts before and after) is recorded in `PROGRESS.md`.
- `make lab-up` works and the attacker container can't reach the internet.

## Parallelism
1.1 → 1.2 → 1.3 are sequential (one migration author). 1.4, 1.5 and 1.6 can run in parallel sessions once 1.3 is merged. 1.8 (M1) can run in parallel from the start because it touches only `lab/`.
