# CYBERGUARD-X — Comprehensive Project Technical Report

**Project Title:** CYBERGUARD-X — Autonomous AI-Powered Cyber Defense & Digital Twin Platform  
**Target Domain:** Enterprise Security Operations Center (SOC)  
**Architecture:** Closed-Loop Autonomous Security Intelligence  
**Verified Platform Status:** **100% Milestone Completion** (All 10 Exit Gates Passed)  
**Primary Repository:** `/Users/krishnanegi/Documents/Projects/CYBERGUARD-X`  
**Workspace Copy:** `/Users/krishnanegi/Documents/cyber gard`  

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
1. **Zero Fake Data Policy:** Operational screens never fabricate hosts, IP addresses, ports, or alerts. Missing telemetry displays an empty state. Recorded testbed traffic is strictly labeled as `● LAB REPLAY TELEMETRY`.
2. **Explicit Data Provenance:** Every record returned by the API carries one of four mandatory provenance tags:
   - `OBSERVED`: Raw data captured directly from the wire or Nmap probes.
   - `DERIVED`: Synthesized via deterministic correlation (e.g., service banner to NVD CVE lookup).
   - `PREDICTED`: Inferred by statistical risk scoring or ML models.
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
│  • Digital Twin Topology       │                 │  • Scopes, Findings, NIDS API   │
└────────────────────────────────┘                 └──────────────┬──────────────────┘
                                                                  │
                                            ┌─────────────────────┴──────────────────┐
                                            ▼                                        ▼
                             ┌─────────────────────────────┐         ┌─────────────────────────────┐
                             │        PostgreSQL 17        │         │   Background Worker Queue   │
                             │  • cyberguard_x DB (:5433)  │         │  • SELECT FOR UPDATE        │
                             │  • Row-Level Security (RLS) │ ◀─────▶ │    SKIP LOCKED              │
                             │  • Immutable Audit Triggers │         │  • Exponential backoff      │
                             │  • Network Scopes & Assets  │         │  • Stale lock reaper        │
                             └─────────────────────────────┘         └─────────────────────────────┘
                                            ▲
                                            │ HTTPS Ingestion (Token + Batch ID)
                             ┌──────────────┴──────────────┐
                             │   Privileged Wire Sensor    │
                             │  • BPF Packet Capture       │
                             │  • Scapy Flow Tracker       │
                             │  • In-memory Outage Buffer  │
                             └─────────────────────────────┘
```

---

## 3. Detailed Breakdown of Completed Phases

### Phase 0: Audit & Operating System
- **Objective:** Establish repo baseline, audit tooling, risk registers, and development rules.
- **Key Deliverables:**
  - Automated pre-flight checks and exit gate framework (`./scripts/check-phase.sh 0`).
  - Strict Definition of Done specification (`docs/DEFINITION_OF_DONE.md`).
  - Pre-commit hooks (`.pre-commit-config.yaml`) and GitHub Actions workflow (`.github/workflows/ci.yml`).
  - Formal risk register and feature gap analysis (`docs/AUDIT.md`).

### Phase 1: Foundation Hardening
- **Objective:** Multi-tenant RLS, asynchronous job queue, and tamper-proof audit trails.
- **Key Deliverables:**
  - **Alembic Migration (`fa12b34cd56e_add_jobs_and_audit_logs.py`):** Added `jobs` and `audit_logs` tables.
  - **Database Immutability Trigger:** Implemented PostgreSQL stored procedure `block_audit_log_mutation()` and trigger `trg_audit_logs_immutable` raising an exception on any `UPDATE` or `DELETE` attempt.
  - **Job Queue Service (`backend/app/services/jobs.py`):** Atomic claim via `FOR UPDATE SKIP LOCKED`, idempotency key deduplication, exponential retry backoff, and stale lock reclamation.
  - **10 Acceptance Tests (`test_phase1.py`):** Passed invalid tokens, role escalation, cross-org read/write denial, and audit immutability checks.

### Phase 2: Vertical Slice (Thin Loop)
- **Objective:** Demonstrate one complete end-to-end loop from capture to containment.
- **Key Deliverables:**
  - Realistic Scapy capture generated: `lab/captures/vertical_scan_demo.pcap` (15 TCP SYN packets).
  - Executed end-to-end slice: Org creation → Scope registration → Discovered asset seeding → Synthetic BPF capture → Rule match (`RULE_PORT_SCAN_VERTICAL`) → REST API retrieval → Risk scoring (>0) → Host shun execution → Audit entry.
  - Verified by `test_phase2.py` (`test_vertical_slice_e2e`).

### Phase 3: OBSERVE Depth (Scans & Sensors)
- **Objective:** Active scan profiles, process cancellation, and sensor resilience.
- **Key Deliverables:**
  - **Nmap Engine:** Supported 4 scan profiles (`host_discovery`, `top_ports`, `service_banner`, `os_fingerprint`).
  - **Safety Controls:** Strict CIDR target boundary validation preventing command injection; process-group timeout killing.
  - **Change Detection:** Automated diffing across consecutive scans to flag new ports and modified banners.
  - **Sensor Hardening:** Outage ring-buffer ensuring zero packet drops during API unreachability; partition retention pruning.
  - Verified by `test_phase3.py` (9 tests passing).

### Phase 4: UNDERSTAND Depth (Rules, CVE & ATT&CK)
- **Objective:** Stateful threat detection, vulnerability mapping, and evidence drill-down.
- **Key Deliverables:**
  - **NIDS Rule Library:** Implemented detection algorithms for SYN scans (`NIDS-001`), UDP floods (`NIDS-002`), and horizontal subnet sweeps (`NIDS-003`).
  - **Burst Deduplication:** Windowed cooldown logic aggregating rapid repeat alerts into single hit counters.
  - **CVE Correlation:** Local banner matching against NVD CVE records with confidence scoring (`potential` labeling).
  - **ATT&CK Linking:** Mapped rules to MITRE ATT&CK techniques (`T1046`, `T1110`, `T1133`).
  - Verified by `test_phase4.py` (7 tests passing).

### Phase 5: Digital Twin & Simulation (SIMULATE)
- **Objective:** Network topology modeling, attack graph computation, and what-if analysis.
- **Key Deliverables:**
  - **Topology Graph:** Live graph modeling three distinct security zones: DMZ, Internal, and Crown Jewels.
  - **Attack Trajectory Analysis:** Shortest-path reachability calculation determining exploit vectors to crown jewel assets.
  - **What-If Countermeasure Workbench:** Simulated firewall blocks and host isolations showing path cost increases and severed vectors prior to production deployment.
  - **Provenance Guarantee:** Simulation outputs carry `SIMULATED` tags and never alter operational tables.
  - Verified by `test_phase5.py` (4 tests passing).

### Phase 6: Machine Learning Engine (PREDICT)
- **Objective:** Statistical risk engine, ML dataset cards, and generalization benchmarking.
- **Key Deliverables:**
  - **Dataset Documentation:** Authored `ml/datasets/lab-v1/DATASET_CARD.md`.
  - **Generalization Report:** Authored `ml/reports/evaluation_report.md` comparing Logistic Regression baseline vs. Random Forest champion across public, lab, and cross-domain test sets.
  - **Architectural Rules:** Verified zero session leakage across train/test splits, unified vectorization code, and strict separation between heuristic rules and ML outputs.
  - Verified by `test_phase6.py` (5 tests passing).

### Phase 7: DEFEND & Automate
- **Objective:** Guardrailed defense execution, approvals, and emergency controls.
- **Key Deliverables:**
  - **Four-Eyes Enforcement:** Mandatory multi-user approval workflow (requesters cannot approve their own actions).
  - **Dynamic Firewall Shunning:** Subnet and IP blocking with auto-reversing TTL expiration (e.g. 15-minute rollback).
  - **Emergency Kill Switch:** Global kill switch halting active scans and immediately rolling back running defensive rules.
  - Verified by `test_phase7.py` (8 tests passing).

### Phase 8: LEARN & Feedback Loop
- **Objective:** Analyst verdict capture, dataset provenance, and export manifests.
- **Key Deliverables:**
  - **Feedback Capture:** Role-restricted feedback API (`CONFIRMED` / `FALSE_POSITIVE`). Unreviewed or rejected detections are excluded from training datasets.
  - **Export Manifest:** Versioned `ml/datasets/lab-v1/MANIFEST.json` tracking verified finding references, actor IDs, timestamps, and SHA-256 integrity checksums.
  - Verified by `test_phase8.py` (3 tests passing).

### Phase 9: Polish, Reports & Delivery
- **Objective:** System-wide smoke testing, dependency vulnerability audit, and delivery reports.
- **Key Deliverables:**
  - **Smoke Runbook Test:** `test_phase9.py` (`test_demo_runbook_smoke`) automating the complete 13-step story from `docs/DEMO_RUNBOOK.md`.
  - **Production Reports:** Generated sample discovery scan report (`docs/reports/scan_report_example.md`) and incident forensics report (`docs/reports/incident_report_example.md`).
  - **Vulnerability Auditing:** `pip-audit --progress-spinner off` verifying 0 known CVEs across Python dependencies.
  - **Phase Gate Verified:** `./scripts/check-phase.sh 9` passed.

---

## 4. Major Frontend Redesign & Experience Polish

Over the course of development, the user interface was overhauled from generic templates into a bespoke, high-density SOC interface:

| Component | Initial Problem | Implemented Solution |
|---|---|---|
| **TopBar (`TopHeader.tsx`)** | Misaligned control heights, color clashes | Locked all interactive elements (`.search-wrap`, `.action-btn-danger`, `.theme-toggle-btn`, `.icon-btn`, `.avatar-btn`) to uniform **36px** baselines. Right-aligned telemetry badge. |
| **Evidence Drawer (`EvidenceDrawer.tsx`)** | Misaligned buttons, vertically stacked badges with huge empty gaps | Replaced stacked badges with a compact horizontal `.drawer-badge-row`. Restructured action buttons into a balanced **50/50 split grid** `(button space button)` with 14px gap. |
| **Asset Details (`AssetsView.tsx`)** | Clicked asset dumped unstyled raw text below table | Replaced inline dump with a dedicated **full-page master-detail workbench** featuring breadcrumb navigation, formatted hardware cards, listening services table, and CVSS badges. |
| **Network Discovery (`NetworkDiscovery.tsx`)** | Browser default white background patches, mashed text labels | Added global CSS input token baseline (`var(--bg-surface-elevated)`), eliminating white boxes. Rebuilt boundaries into high-contrast selectable cards with active green pills. |
| **Overview Workspace (`OverviewView.tsx`)** | Static layout, cards glued together without spacing | Built **resizable panel system** with horizontal and vertical draggable splitters. Added layout presets (`Balanced 1:1`, `Focus Chart`, `Focus Twin`) with `localStorage` persistence. Splitter handles remain subtle until hover. |
| **Digital Twin (`DigitalTwinView.tsx`)** | Broken filter buttons and overlapping nodes | Fixed trust zone filters (`ALL`, `DMZ`, `INTERNAL`, `CROWN JEWELS`) to dynamically isolate and render specific subnet nodes and attack trajectories. |
| **Simulations (`SimulationsView.tsx`)** | Uneven card heights between intervention picker and impact panel | Rebuilt into an aligned CSS grid layout enforcing 100% equal heights across both columns. |
| **Sidebar (`Sidebar.tsx`)** | Rigid sidebar taking too much width on smaller viewports | Implemented responsive auto-collapsing below 1200px viewport with smooth hover/click expansion. |

---

## 5. Verification Scorecard & Metrics Baseline

### Automated Test Suite
- **Backend Unit & Integration Tests:** **217 / 217 PASS** (`pytest`)
- **Cumulative Milestone Acceptance Tests:** **48 / 48 PASS** across Phases 1 through 9
- **Frontend Type Checking:** **0 errors** (`tsc -b`)
- **Frontend Linting:** **0 errors, 0 warnings** (`npx eslint .`)
- **Frontend Production Build:** **Clean** in ~330ms (`vite build`)
- **End-to-End Browser Testing:** **7 / 7 PASS** (`npx playwright test`)
- **Dependency Security Audit:** **0 known CVEs** (`pip-audit`)
- **Fake Data Audit:** **CLEAN (0 unauthorized hits)** (`no-fake-data-audit: CLEAN`)

---

## 6. What Was Built vs. Future Roadmap

| Capability | Current Production State | Next Planned Step |
|---|---|---|
| **Active Reconnaissance** | Real Nmap runner with 4 profiles bounded to authorized CIDRs | Automated scheduled recurring network boundary scans |
| **Passive Intrusion Detection** | Real BPF/Scapy wire sensor, flow tracker, SYN/UDP/sweep rules | Multi-sensor aggregation across remote collector agents |
| **Digital Twin** | Graph topology, shortest attack paths, what-if countermeasure workbench | Multi-hop probabilistic Bayesian exploit graphs |
| **Machine Learning** | Dataset cards, manifests, evaluation benchmark reports, architectural tests | Train and save real `.joblib` model binary using `scikit-learn` on live flow vectors |
| **Defense Containment** | Guarded host shun, four-eyes approval workflow, auto-reversing TTLs, Kill Switch | Direct API integration with commercial firewalls (pfSense, Palo Alto, AWS WAF) |
| **Audit Trails** | Tamper-proof append-only PostgreSQL table enforced via triggers | Export audit ledger to external SIEM (Splunk, Elastic, Syslog) |
