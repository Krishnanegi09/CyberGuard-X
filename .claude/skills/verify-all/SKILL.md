---
name: verify-all
description: Use after any CYBERGUARD-X code change and before claiming work is done. Runs backend lint/types/tests and frontend typecheck/lint/build and reports a pass/fail summary.
---

# verify-all

1. Run `./scripts/verify-all.sh` from the repo root.
2. Paste the **SUMMARY** block exactly as printed.
3. For each FAIL, read the log above it, find the root cause, and fix it. Don't skip, disable or weaken tests or lint rules.
4. If a failure was there before your change (check `docs/AUDIT.md` → Baseline results, or `git stash` and re-run), say so explicitly instead of hiding it.
5. If the backend API changed, also run `cd frontend && npm run gen:api && git diff --exit-code src/api`. A diff means the client was stale, so commit the regenerated client.

This skill passing is **necessary but not sufficient** for done. See `docs/DEFINITION_OF_DONE.md` §3–§6.
The skill passes when every row is PASS, or each FAIL is a documented pre-existing baseline failure.
