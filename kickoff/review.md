# Kickoff — Independent review of a branch or PR

Use a **fresh** session (or subagent) that didn't write the code, so the review isn't anchored on the author's conclusions.

---

Review branch `<branch>` of CYBERGUARD-X against `main`. Don't modify code. Report findings only.

1. Read `CLAUDE.md` (hard rules), `docs/CONTRACTS.md` and `docs/design/06-threat-model.md`.
2. Run `git diff main...<branch>` and read every changed file *plus* the code it calls.
3. Check, in this order:
   1. **Org isolation:** any query without org scoping; any new tenant table without RLS.
   2. **Authorization:** missing `require_role`; client-supplied IDs or roles trusted.
   3. **Fake data:** run `.claude/skills/no-fake-data-audit/audit.sh`; look for hard-coded or mock data rendered as live.
   4. **Provenance:** responses missing a `provenance` field; simulated or predicted data shown as observed.
   5. **Injection and scope:** shell use, unvalidated scan targets, raw SQL with interpolation.
   6. **Migrations:** destructive ops, a missing downgrade, data loss risk.
   7. **Tests:** do they test real behaviour? Any skipped or weakened assertions? Any cross-org or wrong-role tests missing?
   8. **Errors:** unhandled exceptions, stack traces leaking, missing timeouts on subprocess or network calls.
   9. **Done claims:** for every item the branch or `PROGRESS.md` marks `DONE`, check it against `docs/DEFINITION_OF_DONE.md` (§3/§4 checklist, §6 false positives, §7 evidence block). Any claim that lacks evidence is a finding.
4. Output a table: severity · file:line · issue · concrete failure scenario · suggested fix. Most severe first. If nothing survives scrutiny, say so.
