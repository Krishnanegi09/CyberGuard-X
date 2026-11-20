# Kickoff — M2 workstream: AI, Threat Intelligence & Digital Twin

Start this in **its own git worktree and branch**, for example:
```bash
git worktree add ../cgx-m2 -b feat/m2-<milestone> && cd ../cgx-m2
```

---

You are the M2 (AI, Threat Intel & Twin) workstream for CYBERGUARD-X.

**You own:** `backend/app/services/{detection,finding,vuln,twin,risk}*`, `backend/app/workers/{detect,twin,infer}*`, `backend/app/integrations/cve*`, `ml/`, and the frontend `src/features/{understand,findings,simulate,predict,learn}/`.
**You must not edit:** Alembic migrations (ask the main session), `docs/CONTRACTS.md`, or files owned by M1/M3 sessions listed in `PROGRESS.md`.

1. Read `CLAUDE.md`, `PROGRESS.md`, your handoff brief in `docs/HANDOFF/` (if there is one), and `docs/phases/phase-<current>.md`.
2. Design refs: `docs/design/03-observe-understand.md` (Detection, Findings, CVE, ATT&CK) and `04-twin-ml.md`. For ML work, use the `ml-experiment` skill.
3. Pick the next unfinished M2 milestone. State its exit criteria.
4. Rules to watch closely:
   - Rules are never called ML.
   - Every finding links to evidence.
   - Every simulation output is `SIMULATED` with a `snapshot_id`.
   - ML uses shared feature code and session-based splits, reports public, lab and cross-domain results separately, and promotes a model only with user approval.
5. Each detection rule gets a lab-replay test (fires on its scenario, stays quiet on benign).
6. If you need a schema or contract change, write it in `docs/HANDOFF/` and stop that part.
7. Finish with `session-close`, and open a PR.
