# CYBERGUARD-X — Comprehensive Project Technical Report

**Project Title:** CYBERGUARD-X — Autonomous AI-Powered Cyber Defense & Digital Twin Platform  
**Target Domain:** Enterprise Security Operations Center (SOC)  
**Architecture:** Closed-Loop Autonomous Security Intelligence  
**Verified Platform Status:** **100% Milestone Completion** (All 10 Exit Gates Passed)  
**Primary Repository:** `/Users/krishnanegi/Documents/cyber gard` (Branch `main`, commit `14e1cf1`)  
**Secondary Reference:** `/Users/krishnanegi/Documents/Projects/CYBERGUARD-X`  

---

## 1. Executive Summary & Vision

CYBERGUARD-X was developed to replace static, superficial security dashboards with an **active, evidence-driven cyber defense platform**. Traditional security tools either display fragmented telemetry or present mock data without verifiability. CYBERGUARD-X implements a continuous, closed-loop operational pipeline:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          THE INTELLIGENCE LOOP                         │
│                                                                        │
│   OBSERVE  ──▶  UNDERSTAND  ──▶  SIMULATE  ──▶  PREDICT  ──▶  DEFEND   │
│      ▲                                                           │     │
│      └──────────────────────────  LEARN  ◀───────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Engineering Principles
1. **Zero Fake Data Policy:** Operational screens never fabricate hosts, IP addresses, ports, or alerts. When database tables are unpopulated, components display actionable empty states with scan triggers rather than hardcoded mock fixtures.
2. **Explicit Data Provenance:** Every record returned by the API carries one of four mandatory provenance tags:
   - `OBSERVED`: Raw data captured directly from the wire or Nmap probes.
   - `DERIVED`: Synthesized via deterministic correlation (e.g., service banner to NVD CVE lookup).
   - `PREDICTED`: Inferred by the trained Random Forest ML model or statistical risk scoring.
   - `SIMULATED`: Generated inside the Digital Twin what-if graph without touching production tables.
3. **Defense-in-Depth Multi-Tenancy:** Isolation enforced via both application-level `OrgContext` dependencies and PostgreSQL Row-Level Security (RLS) policies.
4. **Guarded Automation:** High-impact containment actions require **Four-Eyes Approval** (requester cannot self-approve) and execute with auto-reversing Time-To-Live (TTL) timers.
5. **Tamper-Proof Audit Logging:** Audit records are immutable at the database engine level via PostgreSQL triggers.

---

## 2. System Architecture & Components

```
┌────────────────────────────────┐                 ┌─────────────────────────────────┐
│     React 19 Frontend Deck     │  HTTPS / WSS    │      FastAPI Backend Engine     │
│  (TypeScript, Vite, Playwright) │ ──────────────▶ │       (Python 3.12, Uvicorn)    │
│  • Resizable SOC Workspace     │ ◀────────────── │  • Unprivileged process         │
│  • Live Digital Twin Topology  │                 │  • Scopes, Findings, NIDS, ML   │
│  • Dynamic NIDS Interface Pick │                 │  • Real-time inference engine   │
└────────────────────────────────┘                 └──────────────┬──────────────────┘
                                                                  │
                                            ┌─────────────────────┴──────────────────┐
                                            ▼                                        ▼
                             ┌─────────────────────────────┐         ┌─────────────────────────────┐
                             │        PostgreSQL 17        │         │   Background Worker Queue   │
                             │  • cyberguard_x DB (:5433)  │         │  • SELECT FOR UPDATE        │
                             │  • Row-Level Security (RLS) │ ◀─────▶ │    SKIP LOCKED              │
                             │  • Immutable Audit Triggers │         │  • Exponential backoff      │
                             │  • 22 Versioned Tables      │         │  • Stale lock reaper        │
                             └─────────────────────────────┘         └─────────────────────────────┘
                                            ▲                                        ▲
                                            │ HTTPS Ingestion                        │ Model Artifacts
                             ┌──────────────┴──────────────┐         ┌───────────────┴─────────────┐
                             │   Privileged Wire Sensor    │         │  Machine Learning Pipeline  │
                             │  • BPF Packet Capture       │         │  • rf_nids_classifier_v1    │
                             │  • Scapy Flow Tracker       │         │  • scaler_v1 (.joblib)      │
                             │  • Dynamic IF Discovery     │         │  • 1,250 ground-truth flows │
                             └─────────────────────────────┘         └─────────────────────────────┘
```

---

## 3. Completed Engineering Phases & Latest Updates

### Phase 0: Audit & Operating System
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 0`
- Pre-flight checks, repository baseline, strict Definition of Done (`docs/DEFINITION_OF_DONE.md`), pre-commit hooks, and risk registers (`docs/AUDIT.md`).

### Phase 1: Foundation Hardening
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 1`
- PostgreSQL 17 schema with Alembic migrations, database-level immutability trigger `trg_audit_logs_immutable`, atomic `SKIP LOCKED` job queue, and 10 acceptance tests verifying tenant isolation and permission boundaries.

### Phase 2: Vertical Slice (Thin Loop)
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 2`
- Full closed-loop demonstration: Nmap scan → Scapy packet capture (`lab/captures/vertical_scan_demo.pcap`) → NIDS rule detection (`RULE_PORT_SCAN_VERTICAL`) → REST API retrieval → Risk scoring (>0) → Host shun execution → Audit logging.

### Phase 3: OBSERVE Depth (Scans & Sensors)
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 3`
- 4 Nmap profiles (`host_discovery`, `top_ports`, `service_banner`, `os_fingerprint`), strict CIDR target validation, port diff change detection, sensor outage ring-buffer, and partition retention pruning.

### Phase 4: UNDERSTAND Depth (Rules, CVE & ATT&CK)
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 4`
- Stateful threat detection library (SYN scans `NIDS-001`, UDP floods `NIDS-002`, horizontal sweeps `NIDS-003`), burst deduplication cooldown, local CVE correlation with confidence scoring, and MITRE ATT&CK mapping (`T1046`, `T1110`, `T1133`).

### Phase 5: Digital Twin & Simulation (SIMULATE)
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 5`
- **Dynamic Backend Synthesis (Latest Update):** Backend endpoint `GET /api/v1/organizations/{org_id}/twin/graph` dynamically constructs topology nodes and edges directly from PostgreSQL `assets` and `port_observations` tables.
- **Attack Graph & What-If Workbench:** Shortest-path reachability calculation determining exploit vectors; simulated port closure and host isolation proving attack trajectory neutralization with `SIMULATED` provenance.

### Phase 6: Machine Learning Engine (PREDICT)
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 6`
- **Trained Model Artifacts (Latest Update):**
  - Dataset: `ml/datasets/lab-v1/flows.csv` containing 1,250 verified ground-truth flow records.
  - Training Pipeline: `ml/training/train_classifier.py` implementing 5-fold stratified cross-validation and feature scaling.
  - Serialized Weights: Generated `ml/artifacts/rf_nids_classifier_v1.joblib` (Random Forest, F1: 1.000) and `ml/artifacts/scaler_v1.joblib`.
  - Live Inference API: Endpoint `POST /api/v1/organizations/{org_id}/ml/predict` validating input flows and returning threat classifications with confidence scores and `PREDICTED` provenance.
  - Model Documentation: `DATASET_CARD.md`, `MANIFEST.json` (SHA-256 integrity hash), and `ml/reports/evaluation_report.md`.

### Phase 7: DEFEND & Automate
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 7`
- Guarded defense execution: Mandatory four-eyes approval workflow (requesters cannot self-approve), dynamic firewall shuns (`fw_block`) with auto-reversing TTLs (15m expiration), and an emergency Kill Switch halting active jobs and initiating rollback.

### Phase 8: LEARN & Feedback Loop
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 8`
- Analyst verdict capture API (`CONFIRMED` / `FALSE_POSITIVE`). Training pipelines automatically exclude unreviewed or false-positive records. Dataset export manifests versioned with cryptographic hashes.

### Phase 9: Polish, Reports & Delivery
- **Status:** **DONE (100%)** — Gate: `./scripts/check-phase.sh 9`
- Automated smoke runbook test `test_demo_runbook_smoke` verifying all 13 story phases in `DEMO_RUNBOOK.md`. Production discovery scan and incident forensics reports. Clean `pip-audit` verifying 0 known CVEs across Python dependencies.

---

## 4. Frontend & Operational Remediation (Latest Updates)

The frontend and API communication layers were recently audited and upgraded against production standards:

1. **Wire NIDS Dynamic Device Discovery & HTTP 422 Resolution**:
   - Backend now scans live host interfaces (`en0`, `lo0`, `bridge0`, `utun0`, etc.) dynamically via Scapy and exposes `GET /api/v1/organizations/{org_id}/monitoring/interfaces`.
   - Replaced static text input in `NIDSMonitor.tsx` with a dynamic interface dropdown selector and added an explicit **Refresh** button.
   - Resolved the invalid `"default-scope"` UUID parameter bug, eliminating HTTP 422 Unprocessable Entity errors during capture initialization.

2. **Overview Card Spacing & Layout Harmony**:
   - Removed negative horizontal margin (`margin: 0 -18px;`) on `.split-gutter-col` in `App.css`.
   - Established a clean, calibrated 20px gap between the **Threat Activity** chart and the **Network Digital Twin** panels.

3. **Zero Fake Data & Empty States**:
   - Removed all mock fallback constants (`SAMPLE_FINDINGS`, `SAMPLE_ASSETS`, `DEFAULT_POINTS`, `DEFAULT_DATA`) across `OverviewView.tsx`, `ThreatActivityChart.tsx`, `AssetRiskDonut.tsx`, and `DigitalTwinPreview.tsx`.
   - When database tables are empty, views render informative, actionable empty states guiding the operator to launch active discovery scans or ingest sensor telemetry.

4. **Dedicated Full-Page Asset Workbench**:
   - Replaced awkward inline text expansion in `AssetsView.tsx` with a dedicated full-page master-detail workbench featuring breadcrumb navigation, formatted hardware profile cards, listening services tables, and CVSS badges.

5. **TopBar & Controls Uniformity**:
   - Locked all interactive controls (`.search-wrap`, `.action-btn-danger`, `.theme-toggle-btn`, `.icon-btn`, `.avatar-btn`) to exact **36px** baselines with right-aligned telemetry badges.

---

## 5. Verification Scorecard & Metrics Baseline

| Subsystem / Test Item | Gate / Command | Outcome | Evidence |
|---|---|---|---|
| **Backend Test Suite** | `pytest -q backend/tests/` | **219 / 219 PASS** | 100% pass across all 9 phases, ML endpoints, and Twin synthesis in 14.70s. |
| **Cumulative Acceptance Tests** | `pytest -q -m "phase1 or ... or phase9"` | **48 / 48 PASS** | All cumulative milestone acceptance tests pass. |
| **Frontend TypeScript** | `npx tsc -b` | **PASS (0 errors)** | Strict types enforced across all views, zero type leaks. |
| **Frontend ESLint** | `npx eslint .` | **PASS (0 errors)** | Zero `any` types, zero hook ordering or dependency violations. |
| **Frontend Production Build** | `npx vite build` | **PASS** | Dist bundle built cleanly with minified assets in ~330ms. |
| **Browser E2E Automation** | `npx playwright test` | **7 / 7 PASS** | Verified topbar, sidebar, layout resizing, zone filtering, and drawer workflows. |
| **Dependency Security Audit** | `pip-audit --progress-spinner off` | **0 known CVEs** | All Python virtualenv dependencies verified clean. |
| **Zero Fake Data Audit** | `.claude/skills/no-fake-data-audit/audit.sh` | **CLEAN (0 hits)** | No unauthorized synthetic fixtures present in production paths. |
| **Phase 9 Exit Gate** | `./scripts/check-phase.sh 9` | **PHASE 9 GATE: PASS** | All DoD evidence blocks and phase criteria satisfied. |

---

## 6. Current Production State vs. Roadmap

| Capability | Current Production State | Next Planned Step |
|---|---|---|
| **Active Reconnaissance** | Real Nmap runner with 4 profiles bounded to authorized CIDRs | Automated scheduled recurring network boundary scans |
| **Passive Intrusion Detection** | Real BPF/Scapy wire sensor, flow tracker, dynamic interface discovery, SYN/UDP/sweep rules | Multi-sensor aggregation across remote distributed collector agents |
| **Digital Twin** | Graph topology synthesized live from PostgreSQL `assets` & `port_observations`, what-if attack paths | Multi-hop probabilistic Bayesian exploit graphs |
| **Machine Learning** | Trained Random Forest classifier (`rf_nids_classifier_v1.joblib`, F1: 1.000) with live prediction endpoint (`/ml/predict`) | Continuous online retraining on verified analyst feedback (`CONFIRMED` alerts) |
| **Defense Containment** | Guarded host shun, four-eyes approval workflow, auto-reversing TTLs, Kill Switch | Direct API integration with commercial firewalls (pfSense, Palo Alto, AWS WAF) |
| **Audit Trails** | Tamper-proof append-only PostgreSQL table enforced via database trigger | Export audit ledger to external SIEM (Splunk, Elastic, Syslog) |
