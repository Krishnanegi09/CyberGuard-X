# CYBERGUARD-X — Autonomous Cyber Defense Platform

> **Autonomous AI-Powered Cyber Defense & Digital Twin Security Platform**  
> *Predict. Protect. Respond. Before Threats Strike.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12+](https://img.shields.io/badge/Python-3.12%2B-brightgreen.svg)](https://www.python.org/)
[![React: 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript: 5+](https://img.shields.io/badge/TypeScript-5%2B-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL: 17](https://img.shields.io/badge/PostgreSQL-17-336791.svg)](https://www.postgresql.org/)
[![Tests: 217 Passed](https://img.shields.io/badge/Pytest-217%20Passed-success.svg)](backend/tests/)
[![E2E: 9/9 Passed](https://img.shields.io/badge/Playwright-9%2F9%20Passed-success.svg)](frontend/e2e/)

---

## Overview

**CYBERGUARD-X** is an enterprise-grade cyber defense and digital twin operations platform designed for automated threat detection, attack path modeling, blast-radius simulation, and deterministic countermeasure enforcement.

### Key Pillars
1. **Observe (Live Telemetry & NIDS):** Scope-bound wire-level network telemetry with passive link-layer inspection, dynamic host/port discovery scans, and signature threat detection.
2. **Understand (Rules & MITRE ATT&CK):** Real-time anomaly correlation, CVE enrichment, and MITRE Enterprise Matrix tactic alignment.
3. **Digital Twin (Topology & Attack Paths):** Graph-based network twin synthesized directly from observed link-layer telemetry with lateral movement reachability calculations.
4. **Simulate (What-If Interventions):** Blast-radius calculations, countermeasure impact modeling, and automated risk reduction scoring without operational regression.
5. **Defend (Deterministic Playbooks):** Reversible, time-bounded automated mitigation (packet-filtering shuns, subnet micro-segmentation) enforced with dual-operator Four-Eyes governance.

---

## Technology Stack

- **Backend:** FastAPI (Python 3.12+), SQLAlchemy 2.0 (async), Alembic, Scapy, Nmap, PostgreSQL 17 with Row-Level Security (RLS) and `SKIP LOCKED` job queues.
- **Frontend:** React 19, TypeScript, Vite, Lucide Icons, interactive split-pane layouts, and CSS variable design tokens.
- **Testing & Verification:** `pytest` (217 unit & integration tests), Playwright CLI (9 end-to-end browser tests).

---

## Quickstart

### Prerequisites
- macOS or Linux
- Python 3.12+
- Node.js 20+ & npm
- PostgreSQL 17 (running on port `5433` by default)

### 1. Launch All Systems (Unified Launcher)
From the project root directory, run:

```bash
./start.sh
```

*(Alternatively: `python dev.py` or `npm --prefix frontend run dev:all`)*

This single command will:
- Check and boot PostgreSQL 17 if not already active.
- Verify and migrate the database schema (`alembic upgrade head`).
- Start the FastAPI backend on `http://127.0.0.1:8000`.
- Start the Vite frontend dev server on `http://127.0.0.1:5173`.
- Automatically open the browser to the SOC Command Center.

### 2. Manual Commands

#### Backend
```bash
# Run backend tests
cd backend && pytest -q

# Run backend API server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
npm run build
npx playwright test
```

#### Full Stack Verification
```bash
./scripts/verify-all.sh
```

---

## Repository Structure

```text
.
├── backend/            # FastAPI app, database models, alembic migrations & tests
├── frontend/           # React 19 + TypeScript + Vite UI & Playwright E2E tests
├── docs/               # System architecture, threat model, API contracts & design
├── lab/                # Lab environment compose & capture files
├── ml/                 # Telemetry datasets & model evaluation reports
├── scripts/            # Unified launcher (start.sh) and phase gate verifiers
├── start.sh            # One-click launcher for Database + Backend + Frontend
├── dev.py              # Python development runner
├── PROGRESS.md         # Detailed milestone execution and status report
└── TICKETS.md          # Defect tracking and resolution ledger
```

---

## Zero Fake Data Policy

CYBERGUARD-X enforces strict data provenance on every operational record:
- `OBSERVED`: Raw telemetry from live host network interfaces or verified capture replays.
- `DERIVED`: Computed metrics, topology paths, and graph correlations.
- `PREDICTED`: Machine learning classifier and anomaly outputs.
- `SIMULATED`: Hypothetical blast-radius and what-if countermeasure mutations.

Synthetic test data is strictly isolated to test suites and explicitly tagged.

---

## License

This project is licensed under the MIT License.
