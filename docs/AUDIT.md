# CYBERGUARD-X — Phase 0 Repository Audit

**Date:** 2026-11-19  
**Auditor:** System Architect & Lead Auditor  
**Scope:** Complete repository audit covering data models, migrations, services, auth/tenancy, tests, API layer, and frontend architecture against `docs/design/01-architecture.md` through `docs/design/10-ui.md`.

---

## 1. Feature Matrix

This matrix classifies the implementation status of every architectural module and subsystem in CYBERGUARD-X:
- **Implemented:** Fully functional in code with tests passing.
- **Partial:** Core logic or data models exist, but integrations, endpoints, or contracts are incomplete.
- **Missing:** Planned in design docs but not yet implemented.
- **Placeholder:** Empty scaffold directory or stub.
- **Fake-Data Violation:** Static analysis hit for mock, placeholder, or fabricated operational data.

| Subsystem / Feature | Classification | Source Files | Notes |
|---|---|---|---|
| **Multi-Tenancy & Workspaces** | Implemented | `backend/app/db/models/organizations.py`, `backend/app/api/v1/organizations.py` | Organizations, slugs, active flag, membership associations. Verified by 13 tests. |
| **Identity & Authentication** | Implemented | `backend/app/core/firebase.py`, `backend/app/api/deps.py`, `backend/app/api/v1/auth.py` | Firebase Admin SDK sync, token revocation checks, email verification requirement, local User model. Verified by 33 tests. |
| **Role-Based Access Control (RBAC)** | Implemented | `backend/app/db/models/access_control.py`, `backend/app/api/deps.py` | Granular permissions (`discovery.run`, `observations.read`, `monitoring.manage`, etc.) resolved in DB across `roles`, `permissions`, `membership_roles`, `role_permissions`. |
| **Row-Level Security (RLS)** | Implemented | `backend/migrations/versions/0add97dd658d_...` | PostgreSQL RLS enabled and forced on all tables containing `org_id`. Verified by `rls-check`. |
| **Network Scope Management** | Implemented | `backend/app/db/models/network_scopes.py`, `backend/app/api/v1/network_scopes.py` | Scope registration, IPv4/IPv6 canonical CIDR parsing, status transitions, containment checks. Verified by 9 tests. |
| **Network Discovery Scanning** | Implemented | `backend/app/services/discovery/nmap_runner.py`, `target_validation.py`, `execution.py` | Bounded Nmap runner, fixed argument builders (`-sn`, `-sS`), non-shell `subprocess`, XML streaming parser. Verified by 29 tests. |
| **Scan History & Metadata** | Implemented | `backend/app/db/models/observations.py` (`ScanRun`), `backend/app/api/v1/discovery.py` | `scan_runs` table tracking targets, scan type, timings, scanner version, config hash, output errors. |
| **Asset & Observation Inventory** | Implemented | `backend/app/db/models/observations.py` (`Asset`, `PortObservation`) | Asset tracking (IP, hostname, OS, first/last seen) and port observations (port, proto, service, version, method). Note: uses integer PKs. |
| **Asset Change Detection** | Missing | Target: `asset_changes` | Comparison of successive scan runs (`HOST_NEW`, `HOST_GONE`, `PORT_OPENED`, `PORT_CLOSED`) designed in Design 03, not yet implemented. |
| **Packet Capture Engine** | Implemented (In-Process) | `backend/app/services/monitoring/capture_service.py` | Scapy `AsyncSniffer`, allowed interface restrictions, scope BPF filter, bounded queue (2048), drop counters. Verified by 16 tests. |
| **Flow Tracking & Aggregation** | Implemented | `backend/app/services/monitoring/flow_tracker.py` | 5-tuple flow aggregation, active (120s) and idle (30s) timeouts, TCP flag counters, max flow capacity. Verified by 18 tests. |
| **Rule-Based NIDS Engine** | Implemented | `backend/app/services/monitoring/nids_engine.py` | Metadata-only detection for TCP SYN scans (rule `NIDS-001`), UDP scans (`NIDS-002`), port sweeps (`NIDS-003`). No payload access. Verified by 6 tests. |
| **NIDS Alert Persistence & Triage** | Implemented | `backend/app/db/models/nids_alerts.py`, `backend/app/api/v1/nids.py` | `nids_alerts` table, alert persistence worker, triage status updates (`open` -> `acknowledged` -> `resolved`). |
| **Collector / Sensor Agent Schema** | Partial | `backend/app/db/models/collectors.py`, `collector_security.py` | Database tables exist for `collectors`, `collector_credentials` (SHA256 hashes), `collector_network_scopes`, and `collector_telemetry`. Missing standalone sensor daemon and HTTP ingest endpoint (`POST /api/v1/sensors/ingest`). |
| **Postgres-Backed Job Queue** | Missing | Target: `jobs` table, worker process | Currently discovery scans execute via FastAPI `BackgroundTasks`. `jobs` table with `SKIP LOCKED` (ADR-002) not yet implemented. |
| **Real-Time WebSocket Push** | Missing | Target: `/api/v1/ws` | Currently frontend polls every 5s/10s. PostgreSQL `LISTEN/NOTIFY` -> WebSocket fan-out (ADR-003) not yet implemented. |
| **Unified Findings & Evidence Schema** | Partial / Missing | Target: `findings`, `finding_evidence` | `nids_alerts` exists as a specialized table, but the unified `findings` schema with lifecycle stages (`OBSERVATION -> INDICATOR -> SUSPECTED -> CONFIRMED_INCIDENT`) is not yet built. |
| **Vulnerability Correlation & CVE Mirror** | Missing | Target: `backend/app/services/vulnerabilities/` | CPE generation from Nmap version output and matching against local CVE mirror/NVD JSON feed not yet built. |
| **MITRE ATT&CK Mapping** | Partial | `nids_engine.py` | Textual technique mentions in alert descriptions (`T1046`), but relational `attack_techniques` table and formal rule mapping do not exist. |
| **Digital Twin Topology Graph** | Placeholder / Missing | `backend/app/digital_twin/` | Scaffold folder empty. NetworkX graph builder, reachability edges, `twin_snapshots`, `twin_nodes`, `twin_edges` not yet built. |
| **Attack Path Simulation** | Missing | Target: `attack_paths`, `simulation_runs` | k-shortest path analysis, CVSS/exposure edge weights, what-if graph mutations not yet built. |
| **ML Intrusion & Anomaly Models** | Placeholder / Missing | `backend/app/ml/`, `ml/` | Empty directory structure (`ml/datasets/`, `ml/reports/`, etc.). Model A (flow classifier) and Model B (anomaly detection) not yet built. |
| **Explainable Risk Scoring Engine** | Missing | Target: `risk_scores` | Formula v1 (`DERIVED`) based on asset criticality, finding severity, and exposure not yet built. |
| **Defensive Actions & Automation** | Missing | Target: `backend/app/services/defense/` | Recommendation engine, four-eyes approval, emergency stop switch, action execution lifecycle not yet built. |
| **Host/Network Executors** | Missing | Target: `executors/` (nftables, pf) | Privileged helper and firewall block executors with TTL rollback not yet built. |
| **Immutable Audit Logging** | Missing | Target: `audit_logs` | `audit_logs` table with DB-level `INSERT, SELECT` grants and append-only trigger not yet built. |
| **Frontend Command Center Deck** | Implemented | `frontend/src/App.tsx`, `NetworkDiscovery.tsx`, `NIDSMonitor.tsx`, `AuthScreen.tsx` | React 19 SPA, dark security operations aesthetic, workspace switcher, health monitors, scope config, scan launcher, live NIDS monitor. |
| **OpenAPI TypeScript Client** | Partial / Missing | `frontend/src/services/backendAuth.ts` | Frontend uses handwritten fetch clients (`backendAuth.ts`, `backend.ts`). `openapi-typescript` generator (ADR-008) not yet integrated. |
| **Truthful UI / Provenance Badges** | Partial | `frontend/src/` | UI displays honest empty/loading/error states with no mock data, but systematic provenance badges (`OBSERVED`, `DERIVED`, `PREDICTED`, `SIMULATED`) are not yet styled. |
| **Fake-Data Violations** | Fake-Data Violation (1 hit) | `frontend/src/NetworkDiscovery.tsx:471` | Textarea placeholder `placeholder={'192.168.1.0/24\n10.10.0.0/24'}` flagged by static regex in `no-fake-data-audit/audit.sh`. Requires annotation or copy adjustment. |

---

## 2. Gap Analysis

Comparing the current codebase against `docs/design/01-architecture.md` through `docs/design/10-ui.md`, the following architectural gaps have been identified. In accordance with platform governance, all gaps specify **keep / adapt / migrate** with an incremental path. **No component will be rewritten.**

### Gap 1: In-Process Packet Sniffing vs. Dedicated Privileged Sensor Daemon
- **Design Reference:** `01-architecture.md` (§Runtime components), `03-observe-understand.md` (§Sensor capture), `ADR-001`.
- **Current State:** `PacketCaptureService` runs directly inside the FastAPI web process via `MonitoringManager`.
- **Decision:** **ADAPT & MIGRATE**.
- **Incremental Path:**
  1. *Keep* the existing `PacketCaptureService` in-process for local development, testing, and pcap replay.
  2. Define a clean `CaptureSource` protocol abstraction.
  3. In Phase 1/2, extract a standalone `sensor` CLI entrypoint in `backend/app/sensor/` that instantiates `PacketCaptureService` with `FlowTracker`.
  4. Implement `POST /api/v1/sensors/ingest` accepting authenticated batches of flows and packet samples with `Idempotency-Key` and sensor token.
  5. The API process drops BPF/root requirements entirely, achieving true unprivileged execution.

### Gap 2: In-Memory BackgroundTasks vs. Postgres-Backed Job Queue
- **Design Reference:** `01-architecture.md` (§Job queue), `ADR-002`, `CONTRACTS.md` (§Queue payloads).
- **Current State:** `POST .../scans` schedules Nmap execution using FastAPI `BackgroundTasks`. Tasks are lost if the server restarts and have no retry semantics or worker queue visibility.
- **Decision:** **MIGRATE**.
- **Incremental Path:**
  1. *Keep* the scan execution logic in `execution.py` intact.
  2. In Phase 2, add the `jobs` migration (`id, org_id, type, payload jsonb, status, attempts, locked_by, locked_at, timeout_s, idempotency_key`).
  3. Create a background worker loop claiming jobs via `SELECT ... FOR UPDATE SKIP LOCKED`.
  4. Migrate `POST .../scans` to write a `scan.run` job rather than enqueueing a `BackgroundTask`.
  5. Add job reaper to release expired locks.

### Gap 3: Client Polling vs. Real-Time WebSocket Push
- **Design Reference:** `01-architecture.md` (§Runtime components), `ADR-003`, `CONTRACTS.md` (§WebSocket events).
- **Current State:** Frontend uses `setInterval` polling (every 5s for NIDS telemetry, 10s for health).
- **Decision:** **ADAPT**.
- **Incremental Path:**
  1. *Keep* HTTP GET endpoints as authoritative state fetchers.
  2. In Phase 3, implement PostgreSQL `LISTEN/NOTIFY` triggers or worker commit hooks.
  3. Expose an authenticated `/api/v1/ws` endpoint filtering events by `org_id`.
  4. Update frontend to listen to lightweight invalidation events (`flow.batch`, `finding.created`) and trigger TanStack Query refetches, retaining polling as a reconnection fallback.

### Gap 4: Asset Data Model Primary Keys and Ownership
- **Design Reference:** `02-data-model.md` (§Rules, §Observe).
- **Current State:** `assets`, `scan_runs`, and `port_observations` use auto-incrementing integer IDs (`Integer, primary_key=True`). In `assets`, `organization_id` is nullable (from early pre-tenancy migration).
- **Decision:** **ADAPT**.
- **Incremental Path:**
  1. *Do not rewrite or drop tables*. Retain integer IDs for existing observation tables.
  2. Enforce `organization_id NOT NULL` at the API and service layers.
  3. Ensure RLS policies on `assets` and `scan_runs` are active and enforced.
  4. Future entity tables (`findings`, `twin_snapshots`, `jobs`) must use UUID primary keys as required by `02-data-model.md`.

### Gap 5: Specialized NIDS Alerts vs. Unified Findings Schema
- **Design Reference:** `02-data-model.md` (§Entities by stage, §Required fields), `03-observe-understand.md` (§Findings).
- **Current State:** `nids_alerts` table exists specifically for intrusion detection rule hits, but lacks unified finding correlation, evidence links, and multi-stage confidence levels.
- **Decision:** **ADAPT**.
- **Incremental Path:**
  1. *Keep* `nids_alerts` functional to avoid breaking the existing live monitor.
  2. In Phase 3, create `findings` and `finding_evidence` tables conforming to `02-data-model.md`.
  3. Map rule alerts into `findings` with `level = INDICATOR` and `method = RULE`.
  4. Link raw packet/flow metadata IDs in `finding_evidence`. Provide a backwards-compatible view or migration for `nids_alerts`.

### Gap 6: Rule-Based NIDS vs. Statistical & ML Defense Loop
- **Design Reference:** `03-observe-understand.md` (§Detection layers), `04-twin-ml.md`, `05-defense.md`.
- **Current State:** The detection engine only runs 3 deterministic threshold rules (`NIDS-001`, `NIDS-002`, `NIDS-003`). Statistical baselines, ML classification, and Digital Twin are not implemented.
- **Decision:** **KEEP & EXTEND**.
- **Incremental Path:**
  1. *Keep* the deterministic rule engine as the authoritative baseline for known attack signatures.
  2. Phase 3: Add rolling per-asset statistical baselines (`STATISTICAL`, z-score > 3).
  3. Phase 4: Build Digital Twin graph using NetworkX and asset/port observations.
  4. Phase 5: Build defense approval and firewall executor workflow.
  5. Phase 6: Introduce Model A (supervised flow classifier) and Model B (Isolation Forest) as additive inputs (`ML`), never replacing deterministic rules.

### Gap 7: Manual Fetch Client vs. OpenAPI-Generated TypeScript Client
- **Design Reference:** `01-architecture.md` (§SPA), `ADR-008`.
- **Current State:** Frontend uses hand-written API client in `frontend/src/services/backendAuth.ts`.
- **Decision:** **MIGRATE**.
- **Incremental Path:**
  1. *Keep* `backendAuth.ts` functioning during Phase 0 and 1.
  2. Add `openapi-typescript` script to generate types from backend OpenAPI JSON (`/openapi.json`).
  3. Incrementally migrate service functions to use generated schema types, eliminating type drift.

---

## 3. Risk Register

The following register maps technical debt, architectural gaps, and vulnerabilities discovered during the audit directly to the STRIDE threat model rows defined in `docs/design/06-threat-model.md`.

| STRIDE ID | Threat Description | Boundary / Component | Current Gap / Technical Debt | Severity | Mitigation & Incremental Remediation Path |
|---|---|---|---|---|---|
| **S1** | Spoofed user (forged or expired token) | Browser ↔ API (`auth.py`, `deps.py`) | **Minimal debt:** Strict Firebase Admin SDK token verification with revocation checks (`check_revoked=True`) is implemented and tested. | Low | Maintain existing verification dependency; ensure token refresh handling in frontend. |
| **S2** | Spoofed sensor injecting fake flows | Sensor ↔ API (`collectors.py`) | **High debt:** Collector credential model exists (`CollectorCredential` with 64-char SHA-256 hash), but the sensor ingest endpoint (`POST /sensors/ingest`) is not yet implemented. In-process sniffing bypasses token validation. | High | **Phase 2:** Build authenticated `/api/v1/sensors/ingest` with per-sensor hashed bearer token validation, organization binding, and TLS requirement. |
| **S3** | WebSocket hijack or cross-org subscription | WebSocket ↔ Client | **Medium debt:** WebSocket endpoint does not exist yet; polling is currently used. | Medium | **Phase 3:** Require token handshake on connection, re-validate token upon refresh, and strictly filter event IDs by authenticated `org_id` before broadcasting. |
| **T1** | Tampering with audit logs | Database (`audit_logs`) | **High debt:** `audit_logs` table does not exist. Operational actions (scans, scope changes, alert status updates) are not recorded in an immutable ledger. | High | **Phase 1:** Create `audit_logs` migration. Configure DB user permissions to `INSERT, SELECT` only, and add a trigger blocking `UPDATE` and `DELETE`. |
| **T2** | Ingest replay or duplication | Sensor ↔ API | **Medium debt:** No batch de-duplication or replay defense implemented. | Medium | **Phase 2:** Enforce `batch_id` uniqueness index in ingest table and reject payloads outside a ±60s clock skew window. |
| **T3** | Poisoning ML training data | Learn pipeline (`ml/`) | **Medium debt:** Scaffolding directories in `ml/` are empty. No data provenance or validation pipeline exists. | Medium | **Phase 6:** Enforce strict manifest joins against lab ground-truth attacker scripts. Disallow ingestion of unverified analyst data into training sets. |
| **R1** | Admin denies approving a defensive action | Defend (`approvals`) | **Medium debt:** Defensive actions and approvals not yet built. | Medium | **Phase 5:** Log all action requests, approvals, and dry-run outputs into `audit_logs` with actor ID, timestamp, and signature. Implement two-person rule. |
| **I1** | Cross-tenant data leak | API / Database | **Low-to-Medium debt:** PostgreSQL RLS is enabled and forced on all tables with `org_id`. However, `assets` table has nullable `organization_id` column. Cross-org pytest tests exist but lack `@pytest.mark.cross_org` marker. | Medium | **Phase 1:** Backfill and set `organization_id NOT NULL` on `assets`. Add `@pytest.mark.cross_org` marker to tests so `rls-check` script verifies isolation automatically. |
| **I2** | Secret leakage in repository | Repo / CI | **Low debt:** `.env` is gitignored; `.env.example` committed. CI/pre-commit secret scanning was previously missing. | Low | **Phase 0:** Committed `.pre-commit-config.yaml` and `.github/workflows/ci.yml` integrating `gitleaks` secret detection. |
| **I3** | Stack traces or internal details leaked in errors | API exception handlers | **Medium debt:** `main.py` has a handler for `RequestValidationError`, but generic SQLAlchemy and runtime exceptions return unstandardized error structures without request IDs. | Medium | **Phase 1:** Add platform-wide error envelope handler conforming to `CONTRACTS.md` (`{ "error": { "code", "message", "request_id" } }`). |
| **I4** | Sensitive payloads in packet samples | Packet Sniffer / Storage | **Minimal debt:** `PacketCaptureService` and `NIDSEngine` only capture and process protocol headers (IP, port, proto, TCP flags). Full packet payloads and DNS query strings are discarded immediately. | Low | Maintain strict metadata-only extraction invariant and automated test assertions. |
| **D1** | Scan or job flood | API / Workers | **High debt:** Scans run via unbounded FastAPI `BackgroundTasks`. While single targets are capped at 256 IPs, an authenticated user can launch multiple concurrent scans, risking host resource exhaustion. | High | **Phase 2:** Migrate to `jobs` table with per-organization concurrency cap (max 2 concurrent scans) and rate limiting. |
| **D2** | Sensor overwhelms API | Sensor ↔ API | **Medium debt:** In-process sniffer queue has fixed bound (2048 packets). Remote ingest endpoint will need strict payload limits. | Medium | **Phase 2:** Impose 413 Payload Too Large on batches > 500 flows or > 1 MB, returning backpressure retry headers. |
| **E1** | Command injection through scan targets | Scanner (`nmap_runner.py`) | **Minimal debt:** Implemented securely. `parse_network` strictly parses CIDRs with `ipaddress`, `validate_target` enforces containment, and `subprocess.run` executes with `shell=False` and a fixed argv list. | Low | Maintain strict argv construction without shell invocation. |
| **E2** | Scope bypass (scanning unauthorized networks) | Scanner / Scope service | **Minimal debt:** Target containment validated in API router and re-validated in execution layer. Host discovery filters XML output to ensure only in-scope IPs are stored. | Low | Maintain dual validation pattern at API and worker layers. |
| **E3** | Privilege escalation through roles | RBAC (`deps.py`) | **Minimal debt:** Authorization is resolved server-side from database tables on every request using `require_organization_permission`. Client-side claims are not trusted for roles. | Low | Maintain DB-driven authorization checks. |
| **E4** | Abuse of defensive executor | Defend executors | **High debt:** Defensive action executors not yet built. Unrestricted firewall blocking could cause self-inflicted denial of service. | High | **Phase 5:** Enforce strict allowlists, maximum 15-minute default TTL, signed commands to privileged helper, and database-level Emergency Stop switch. |
| **E5** | API process compromise leads to root | Host environment | **High debt:** Because packet capture currently runs inside the FastAPI process, the web application process requires elevated network capabilities (BPF device access). | High | **Phase 2:** Decouple sensor into separate unprivileged/privileged isolated process (ADR-001). The FastAPI process must run completely unprivileged. |

---

## 4. Baseline Results

The following verified baseline results were recorded from a full repository verification on 2026-11-19 using `./scripts/verify-all.sh`:

### 4.1 Backend Test Suite (Pytest)
- **Command:** `env DATABASE_URL="postgresql+psycopg://krishnanegi@localhost:5433/cyberguard_x_restore_test" PYTHONPATH=. .venv/bin/python -m pytest -q`
- **Result:** **PASS** — **169 passed in 12.95s**
- **Database Engine:** PostgreSQL 17 (verified with active schema at revision `e9e0ccd8f860`)
- **Breakdown by test module:**
  - `test_auth.py`: 33 passed (Firebase sync, token validation, user linkage, email verification, error handling)
  - `test_authorization.py`: 11 passed (RBAC permissions, role hierarchies, cross-org isolation, inactive membership rejection)
  - `test_capture_service.py`: 16 passed (Interface validation, scope enforcement, BPF filters, queue drop counting, shutdown drainage)
  - `test_collector_security_models.py`: 7 passed (Credential hashing, expiration, scope assignment constraints)
  - `test_discovery_api.py`: 13 passed (Discovery scan endpoints, scope containment validation, asset and observation retrieval)
  - `test_discovery_persistence.py`: 10 passed (Scan run history, asset upsert, port observation records)
  - `test_discovery_target_validation.py`: 6 passed (CIDR parsing, subnet containment, address cap enforcement)
  - `test_flow_tracker.py`: 18 passed (5-tuple aggregation, bidirectional flow metrics, active/idle expirations, capacity limits)
  - `test_health.py`: 4 passed (Application and PostgreSQL database health checks)
  - `test_network_scopes.py`: 9 passed (IPv4/IPv6 scope creation, duplicate rejection, cross-tenant isolation)
  - `test_nids_capture_integration.py`: 1 passed (End-to-end packet capture to NIDS alert generation)
  - `test_nids_engine.py`: 5 passed (TCP SYN scan, UDP scan, and port sweep detection logic)
  - `test_nmap_runner.py`: 13 passed (Bounded execution, XML parsing, timeout termination, stderr limits)
  - `test_organizations.py`: 13 passed (Organization creation, slug validation, owner role provisioning, membership listing)
  - `test_packet_parser.py`: 7 passed (IPv4/IPv6 TCP/UDP header parsing, payload exclusion)
  - `test_security.py`: 3 passed (Argon2 password hashing, JWT token encoding/decoding)

### 4.2 Frontend Static Analysis & Build
- **TypeScript Typecheck (`tsc`):**
  - **Command:** `npx --no-install tsc --noEmit` (in `frontend/`)
  - **Result:** **PASS** (Zero type errors)
- **ESLint Linter (`eslint`):**
  - **Command:** `npx --no-install eslint .` (in `frontend/`)
  - **Result:** **PASS** (Zero lint errors or warnings)
- **Production Build (`vite build`):**
  - **Command:** `npx --no-install vite build` (in `frontend/`)
  - **Result:** **PASS**
  - **Output:**
    ```
    vite v8.3.8 building client environment for production...
    ✓ 41 modules transformed.
    dist/index.html                   0.66 kB │ gzip:   0.41 kB
    dist/assets/index-DYFtYO6H.css   46.28 kB │ gzip:   9.65 kB
    dist/assets/index-BLJyWbUk.js   372.45 kB │ gzip: 111.23 kB
    ✓ built in 163ms
    ```

### 4.3 Static Security & Policy Scans
- **Fake-Data Audit (`no-fake-data-audit/audit.sh`):**
  - **Status:** 1 hit recorded.
  - **Finding:** `frontend/src/NetworkDiscovery.tsx:471: placeholder={'192.168.1.0/24\n10.10.0.0/24'}` matches private IP regex pattern.
  - **Disposition:** Input placeholder example, not operational data. Scheduled for annotation `/* cgx-allow: input placeholder example CIDR */` in Phase 1.
- **Row-Level Security Audit (`rls-check/check.sh`):**
  - **Status:** **PASS** for schema protection.
  - **Finding:** `RLS: all org_id tables protected`. Every table containing `org_id` has row security enabled and forced with active policies.
  - **Test Suite Note:** Test marker `@pytest.mark.cross_org` to be applied to cross-org test cases in Phase 1.

### 4.4 Summary Verification Table
```
=== SUMMARY ===
backend: pytest        PASS (169 passed in 12.95s)
frontend: tsc          PASS (0 type errors)
frontend: eslint       PASS (0 lint errors)
frontend: build        PASS (Production bundle generated)
```
