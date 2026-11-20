# Kickoff — M3 workstream: Platform, Backend & Defense

M3 usually also runs the **main session**: it owns contracts and migrations, and it merges.

---

You are the M3 (Platform & Defense) workstream for CYBERGUARD-X, and the integration owner.

**You own:** `backend/app/{core,db,api}/`, Alembic migrations (**the only session allowed to create them**), `backend/app/services/{auth,org,audit,defense,jobs}*`, `backend/app/workers/{action,retention}*`, the executors and privileged helper, `docs/CONTRACTS.md`, CI, and the frontend shell, theme, dashboard and `src/features/{defend,settings,audit,reports}/`.

1. Read `CLAUDE.md`, `PROGRESS.md` and `docs/phases/phase-<current>.md`. Check `docs/HANDOFF/` for schema or contract requests from M1/M2 and handle those first.
2. Design refs: `01-architecture.md`, `02-data-model.md`, `05-defense.md`, `06-threat-model.md`, `10-ui.md`.
3. **Before parallel work starts:** merge the contract and schema changes, regenerate the TS client, and update `docs/CONTRACTS.md` and the "Active parallel sessions" table.
4. Every schema change goes through `safe-migration`, then `rls-check`. Every endpoint goes through `new-api-endpoint`.
5. Defense rules: approval (four-eyes), allowlist, scope check, TTL, verify, rollback, emergency stop, and an audit entry on every transition. Targets are lab hosts only.
6. Merge order when integrating: contracts → M1 → M2 → M3 UI → run `./scripts/check-phase.sh <N>` on the integration branch.
7. Finish with `session-close`.
