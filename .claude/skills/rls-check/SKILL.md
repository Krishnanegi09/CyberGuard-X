---
name: rls-check
description: Use after any CYBERGUARD-X migration that adds a table or touches org isolation, and at every phase gate from Phase 1 onward. Verifies every tenant table has RLS enabled, forced and a policy, then runs the cross-org tests.
---

# rls-check

1. Run `.claude/skills/rls-check/check.sh` (uses `PGHOST`/`PGPORT`/`PGDATABASE`, defaulting to `localhost:5433/cyberguard_x`).
2. It lists every table that has an `org_id` column but is missing `relrowsecurity`, `relforcerowsecurity` or a policy. Fix them in a **new migration** (via `safe-migration`).
3. It then runs `pytest -m "cross_org"`. Every API test named `test_cross_org_*` should carry that marker.
4. Paste the output. Exit 0 is required to pass the gate.
