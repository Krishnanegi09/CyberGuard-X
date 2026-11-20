# Phase 0 — Audit & Operating System (no feature code)
**Lead:** M3 · **Gate:** `./scripts/check-phase.sh 0` · **Design refs:** all of `docs/design/` (skim)

## Goal
Get an accurate picture of the repo and set up the working infrastructure every later session depends on.

## Milestones
- **0.1 [MVP] Repository audit.** Run parallel read-only subagents over: (a) models and migrations; (b) auth, org and RBAC; (c) capture, parser, flow and scan services; (d) routes and API conventions; (e) frontend modules, API layer and fake-data hits; (f) tests. Classify each feature as *implemented / partial / missing / placeholder / fake-data violation*.
- **0.2 [MVP] Baseline verification.** Run every existing suite, lint, typecheck and build, and record the exact output.
- **0.3 [MVP] Gap analysis** against `docs/design/`. For each gap choose *keep / adapt / migrate* and give an incremental path. Never choose "rewrite". Turn each conclusion into an update to the matching ADR (Accepted or Revised).
- **0.4 [MVP] Risk register.** Technical debt, security gaps (map them to rows in `06-threat-model.md`), fake-data hits, migration risk.
- **0.5 [MVP] Operating system.** Install the kit. Fix the commands table in `CLAUDE.md` to match the real repo. Add `scripts/verify-all.sh`, pre-commit and a CI skeleton. Fill in the deadlines in `TIMELINE.md` with the user.

## Exit criteria (checked by the gate)
- `docs/AUDIT.md` exists with these sections: `Feature matrix`, `Gap analysis`, `Risk register`, `Baseline results`.
- `CLAUDE.md`, `PROGRESS.md`, `docs/DEFINITION_OF_DONE.md`, `docs/DECISIONS.md`, `docs/CONTRACTS.md` and `.claude/skills/*/SKILL.md` exist.
- `.pre-commit-config.yaml` and `.github/workflows/ci.yml` exist.
- `./scripts/verify-all.sh` runs. A failure is allowed **only if it's recorded** in `AUDIT.md` as a baseline result.
- The user approved the roadmap (noted in `PROGRESS.md`).

## Don't
Write feature code, change the schema, or "clean up" modules during the audit.
