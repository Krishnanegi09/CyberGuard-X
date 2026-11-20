# 01 — Architecture

## The intelligence loop
```
OBSERVE → UNDERSTAND → SIMULATE → PREDICT & DECIDE → DEFEND & AUTOMATE → LEARN → (OBSERVE)
```
Stages communicate through **stored records and the job queue**, never through UI state. Each stage can be re-run on its own from stored data.

## Runtime components
```
┌──────────────┐  HTTPS/WS (Firebase ID token)   ┌─────────────────────────────┐
│  React SPA   │ ───────────────────────────────▶│  API server (FastAPI)       │
│  (Vite, TS)  │ ◀── WS: org-scoped event IDs ───│  unprivileged user          │
└──────────────┘                                  │  routes · authz · services  │
                                                  └──────┬───────────┬──────────┘
                                                         │ SQL (RLS) │ enqueue / LISTEN
                                                  ┌──────▼───────────▼──────────┐
┌──────────────────────┐  HTTPS batch ingest      │  PostgreSQL 17              │
│  Sensor agent        │  (Sensor token,          │  tenant tables + RLS        │
│  privileged (BPF)    │   Idempotency batch_id)  │  jobs (SKIP LOCKED)         │
│  capture → parse →   │ ────────────────────────▶│  NOTIFY on commit           │
│  flow aggregate      │                          └──────▲──────────────────────┘
└──────────────────────┘                                 │
                                                  ┌──────┴──────────────────────┐
                                                  │  Worker process(es)         │
                                                  │  scan · detect · twin ·     │
                                                  │  infer · act · retention    │
                                                  └─────────────────────────────┘
```

| Component | Runs as | Talks to | Notes |
|---|---|---|---|
| SPA | browser | API | Generated client; TanStack Query for server state |
| API | unprivileged user | Postgres | Thin routers; `OrgContext` + RLS on every request |
| Worker | unprivileged user | Postgres, nmap, executors | Claims jobs; per-job timeout; `NOTIFY` after commit |
| Sensor | BPF-capable user | API (HTTPS) | Bounded queues; reports drops; heartbeat every 10 s |
| Postgres | — | — | Source of truth; RLS; partitions for `flows` and `packet_samples` |

**Migration from the existing code:** if capture currently lives inside the API process, keep it working. Wrap it behind a `CaptureSource` interface, add the sensor entrypoint that uses the same parser and flow tracker, then switch over. Never rewrite it in one step.

## Job queue
- Columns: `id, org_id, type, payload jsonb, status, attempts, max_attempts, run_after, locked_by, locked_at, timeout_s, last_error, idempotency_key, created_at, finished_at`.
- Claim: `UPDATE jobs SET status='RUNNING', locked_by=…, locked_at=now() WHERE id = (SELECT id FROM jobs WHERE status='QUEUED' AND run_after<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`.
- Retry with exponential backoff; when `attempts = max_attempts`, mark it `DEAD` and surface it in the UI.
- A reaper resets `RUNNING` jobs whose lock is older than `timeout_s`.

## Backend layout
```
backend/app/
  api/v1/<group>.py   schemas/   models/   repositories/   services/
  workers/            # job handlers
  sensor/             # separate entrypoint + own requirements
  integrations/       # nmap runner, CVE mirror, executors
  core/               # settings (pydantic-settings), security, deps, logging
  db/                 # session, RLS helpers, alembic
ml/                   # datasets/ features/ train.py evaluate.py reports/ cards/
tests/                # unit/ integration/ api/ security/ acceptance/ fixtures/pcaps/
```
API groups: auth, organizations, scopes, assets, scans, sensors, monitoring, flows, findings, incidents, vulnerabilities, digital-twin, simulations, ai, defense, audit, reports.

## Frontend layout
`src/api/` (generated) · `src/features/<module>/` · `src/components/` · `src/hooks/` · `src/theme/`.
Every data view has **loading, empty and error** states. The WebSocket client re-authenticates on token refresh, reconnects with backoff, and re-fetches after a reconnect.

## Cross-cutting
- Structured JSON logs with `request_id` / `job_id`.
- `/healthz` reports the process; `/readyz` reports the DB, the queue lag and the sensor heartbeat age.
- Config comes only from `pydantic-settings` and `.env`. `.env.example` is committed; `.env` never is.
- CI (GitHub Actions): `verify-all`, `no-fake-data-audit`, `pip-audit`, `npm audit --omit=dev`, `gitleaks`, and migrations run on an empty Postgres 17 service.
- Pre-commit: `ruff`, `ruff format`, `eslint`, `prettier`, `gitleaks`.
