---
name: session-close
description: Use at the end of every CYBERGUARD-X work session. Verifies, updates PROGRESS.md and related docs, commits on a feature branch and prints the standard session report.
---

# session-close

0. Open `docs/DEFINITION_OF_DONE.md`. For each item you plan to report as finished, apply the matching checklist (§3 task, §4 milestone, §5 phase) and answer the §8 self-check questions in your reply. Anything with a missing evidence line is **not** `DONE`; report it as `IMPLEMENTED — not verified`, `VERIFYING` or `BLOCKED`.
1. Run the `verify-all` skill **after your last edit**. If any milestone was finished, also run `./scripts/check-phase.sh <N>`.
2. Update `PROGRESS.md`:
   - Current milestone and status.
   - Move finished items to **Done (with evidence)** using the DoD §7 evidence block. No block, no move.
   - Update **Active parallel sessions**, **Blockers** and **Next step** (one item).
   - Add a **Session log** line.
   - If a phase gate passed, fill in the **Phase gates** row.
3. Update `docs/DECISIONS.md` (new ADR), `docs/CONTRACTS.md` (any enum or API change) and `docs/PERF.md` (any NFR measured) if they're affected.
4. Commit on the current feature branch: `git add -A && git commit -m "<type>(<area>): <summary>"`. Never commit to `main`. Check `git diff --cached` for secrets first.
5. Print this report:

```markdown
## Session report — YYYY-MM-DD
**Phase / milestone:** N.M — <name> [MVP|STRETCH] — <NOT STARTED | IN PROGRESS | IMPLEMENTED — not verified | VERIFYING | BLOCKED | DONE | DONE WITH EXCEPTIONS>
**DoD self-check (§8):** 1 ✓/✗ · 2 ✓/✗ · 3 ✓/✗ · 4 ✓/✗ · 5 ✓/✗ · 6 ✓/✗
**What changed and why**
- ...
**Files changed**
- `path` — reason
**Verification (real output)**
- verify-all SUMMARY: ...
- check-phase N: PASS/FAIL (if run)
**Real vs placeholder**
- Real: ... / Placeholder or incomplete: ...
**Risks / limitations**
- ...
**Docs updated:** PROGRESS ✓ · DECISIONS ✓/– · CONTRACTS ✓/– · PERF ✓/–
**Commit(s):** <sha> on <branch>
**Next recommended step:** <one item + why>
```
