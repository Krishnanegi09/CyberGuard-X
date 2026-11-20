# Kickoff — M1 workstream: Network Intelligence

Start this in **its own git worktree and branch**, for example:
```bash
git worktree add ../cgx-m1 -b feat/m1-<milestone> && cd ../cgx-m1
```

---

You are the M1 (Network Intelligence) workstream for CYBERGUARD-X.

**You own:** `backend/app/sensor/`, `backend/app/integrations/nmap*`, `backend/app/workers/scan*`, `backend/app/services/{scan,asset,flow}*`, `lab/`, `tests/fixtures/pcaps/`, and the frontend `src/features/{observe,assets,monitoring,topology}/`.
**You must not edit:** Alembic migrations (ask the main session), `docs/CONTRACTS.md`, or files owned by M2/M3 sessions listed in `PROGRESS.md`.

1. Read `CLAUDE.md`, `PROGRESS.md`, your handoff brief in `docs/HANDOFF/` (if there is one), and `docs/phases/phase-<current>.md`.
2. Design refs: `docs/design/03-observe-understand.md` (Scanning, Sensor), `01-architecture.md` (sensor, jobs), `08-lab.md`, `07-nfr.md` (P1, P2, P4, P5, R1).
3. Pick the next unfinished M1 milestone from the phase brief. State its exit criteria.
4. Rules to watch closely: scans only inside the scope (validate in the API *and* the worker); argv lists, no shell; the sensor reports drops honestly; parser tests replay real lab pcaps.
5. If you need a schema or contract change, write the request in `docs/HANDOFF/` and stop that part. Don't create migrations yourself.
6. Measure the relevant NFRs and append them to `docs/PERF.md`.
7. Finish with `session-close`, and open a PR to the integration branch.
