# Kickoff — Resume work (any later session)

---

Continue CYBERGUARD-X from where the last session stopped.

1. Read `CLAUDE.md`, `PROGRESS.md` and `docs/DEFINITION_OF_DONE.md`, then the phase brief for the current phase in `docs/phases/`.
   Treat any `DONE` in `PROGRESS.md` that has no DoD §7 evidence block as **unverified**. Re-check it before you build on it.
2. Do the session-start ritual: `git status`, `git log --oneline -10`, `git branch`, `alembic current`.
3. Check **Active parallel sessions** in `PROGRESS.md`. Don't touch files owned by another active session.
4. State the current milestone, your plan for this session and its exit criteria. If `PROGRESS.md` and the repo disagree, report the mismatch before doing anything.
5. Load only the `docs/design/` files that the phase brief lists as design refs.
6. Work on that one milestone. Use the skills: `new-api-endpoint` for endpoints, `safe-migration` for any schema change, `no-fake-data-audit` before closing UI work.
7. When the milestone is done, run `./scripts/check-phase.sh <N>` if it's the last one in the phase.
8. Finish with `session-close`.
