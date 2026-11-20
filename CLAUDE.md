# CYBERGUARD-X — Agent Rules

Autonomous AI-powered cyber defense and digital twin platform. BTech CSE major project with 3 members.
Goal: a **working, evidence-driven** security product, not a dashboard that only looks like one.
The user is a student. Explain your decisions as well as your code.

## Every session
1. **Start:** read `PROGRESS.md`, then the current `docs/phases/phase-N.md`. Run `git status`, `git log --oneline -10` and `alembic current`. State the milestone, your plan and its exit criteria in one paragraph.
2. **Load only what the task needs** from `docs/design/` (see the map below).
3. **Work one milestone at a time.** Build `[MVP]` before `[STRETCH]`.
4. **End:** answer the 6 self-check questions in `docs/DEFINITION_OF_DONE.md` §8, then run the `session-close` skill. That means `./scripts/verify-all.sh`, updating `PROGRESS.md` (and `DECISIONS.md` / `CONTRACTS.md` if they changed), committing on a feature branch, and printing the report.

## Hard rules (never break; if a task conflicts with one, stop and ask)
1. **No fake operational data.** Never invent hosts, IPs, ports, packets, alerts, vulnerabilities, predictions, metrics or health stats. If there's no data, show an empty state. Synthetic data belongs only in `tests/`, and must be labelled.
2. **Provenance on every record:** `OBSERVED | DERIVED | PREDICTED | SIMULATED`. Enforce it in the Pydantic response schemas.
3. **Authorized scope only.** Scans and capture run only inside the org's CIDR allowlist. Simulations never exploit anything.
4. **The API never runs as root.** Only the sensor process holds capture (BPF) rights.
5. **Org isolation in two layers:** an app-level `OrgContext` dependency *and* Postgres RLS. Never trust user, org or role IDs sent by the client. Firebase answers who the user is; Postgres decides what they may do.
6. **External tools take argument lists, never a shell.** Nmap runs only from fixed scan profiles.
7. **DB safety:** use the `safe-migration` skill for every schema change: backup, then the restore-test DB, then a row-count diff, then a downgrade check. Use expand, then migrate, then contract. Never drop the DB, delete or squash migrations, `stamp` an unknown revision, or change existing UUIDs.
8. **Honest verification.** Claim nothing without real command output. Never weaken, skip or delete tests. **"Done" is defined only by `docs/DEFINITION_OF_DONE.md`.** Use its status words, and fill in its evidence block for every `DONE`. If evidence is missing, the status is `IMPLEMENTED — not verified`.
9. **Honest ML.** Rules are not ML. An LLM explanation is not a prediction. Report no metric without a held-out evaluation. Report public-dataset and lab results separately.
10. **No defensive action executes without approval** in the MVP. Every state transition is audit-logged.

## Ask the user first
Schema change on the dev DB · new major dependency or service · new or wider scan scope · any non-alert defensive action · deleting files, branches or data · renaming or restructuring existing modules or routes.

## Commands
| Task | Command |
|---|---|
| Verify everything | `./scripts/verify-all.sh` |
| Phase exit gate | `./scripts/check-phase.sh <N>` |
| Backend tests | `cd backend && pytest -q` |
| Frontend checks | `cd frontend && npx tsc --noEmit && npx eslint . && npx vite build` |
| Migration state | `cd backend && alembic current && alembic history | head` |
| Regenerate API client | `cd frontend && npm run gen:api` |

> If a command doesn't match the real repo layout, fix this table first and record why in `docs/DECISIONS.md`.

## Environment
macOS, MacBook Air M4 (ARM64) · PostgreSQL 17 on `localhost:5433`, DB `cyberguard_x`, restore-test DB `cyberguard_x_restore_test` · backups in `~/Backups/CYBERGUARD-X/` · repo `~/Documents/Projects/CYBERGUARD-X`.

## Docs map: read only when needed
| Topic | File |
|---|---|
| Components, sensor, job queue, WebSocket fan-out, code layout | `docs/design/01-architecture.md` |
| Entities, states, required fields, retention, RLS | `docs/design/02-data-model.md` |
| Scan profiles, sensor capture, detection rules, CVE, ATT&CK | `docs/design/03-observe-understand.md` |
| Digital twin, attack paths, ML plan | `docs/design/04-twin-ml.md` |
| Executors, approvals, emergency stop | `docs/design/05-defense.md` |
| Threat model of this platform (STRIDE) | `docs/design/06-threat-model.md` |
| Performance and reliability targets | `docs/design/07-nfr.md` |
| Lab network setup | `docs/design/08-lab.md` |
| Ethics, legal, data minimisation | `docs/design/09-ethics-legal.md` |
| UI direction | `docs/design/10-ui.md` |
| What counts as done (always applies) | `docs/DEFINITION_OF_DONE.md` |
| Enums and API conventions | `docs/CONTRACTS.md` |
| Week plan and cut line | `docs/TIMELINE.md` |

## Working style
- **Subagents** handle wide read-only audits and independent diff reviews. Do small lookups yourself.
- **Parallel sessions** each get their own worktree and branch, own files no other session touches, and need contracts merged first. Only one session at a time may create migrations. Brief each one in `docs/HANDOFF/`.
- Use macOS commands and exact paths. Hand over complete files when practical, in small batches.
- Fix root causes and explain them. Say clearly what is real and what is a placeholder.
- When this design and the real code disagree, explain the tradeoff and write an ADR.
