# Kickoff — Phase 0 audit (first session)

Paste everything below the line into a new session opened at `~/Documents/Projects/CYBERGUARD-X`.

---

You are joining CYBERGUARD-X, an existing project with a working foundation. Do **not** rewrite it or start a new foundation.

1. Read `CLAUDE.md`, `PROGRESS.md` and `docs/phases/phase-0.md`. Skim `docs/design/` (all 10 files) so you know the target design.
2. Do the session-start ritual from `CLAUDE.md`.
3. Launch **six read-only subagents in parallel** to audit: (a) SQLAlchemy models, Alembic history and live DB state (`alembic current`, table list, row counts); (b) auth, org, membership and RBAC flow; (c) capture, parser, flow-tracker and scan services; (d) API routes and their auth dependencies; (e) frontend modules, API layer and any fake or mock data; (f) the test suites and what they actually cover. Each one reports a classification: *implemented / partial / missing / placeholder / fake-data violation*, with file paths.
4. Run the baseline: `./scripts/verify-all.sh` (fix the paths and commands in it and in `CLAUDE.md` first if they don't match the repo). Record the exact output.
5. Write `docs/AUDIT.md` with these sections: **Feature matrix**, **Gap analysis** (for each gap against `docs/design/`: keep / adapt / migrate, plus an incremental path), **Risk register** (map security gaps to `docs/design/06-threat-model.md` rows), **Baseline results**.
6. Update each ADR in `docs/DECISIONS.md` to Accepted or Revised based on what you found, with a reason.
7. Add `.pre-commit-config.yaml` and `.github/workflows/ci.yml` (skeletons that run verify-all and gitleaks).
8. Ask me for the semester deadlines and fill in `docs/TIMELINE.md`.
9. Propose the Phase 1 plan: the single highest-value first milestone and why. Then **stop and wait for my approval**. Don't write feature code or change the schema in this session.
10. Finish with the `session-close` skill.
