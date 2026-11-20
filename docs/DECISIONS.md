# DECISIONS (ADR log)

Format: **ADR-NNN — Title** · Date · Status (Proposed / Accepted / Superseded / Revised) · Context · Decision · Alternatives · Consequences.  
ADR-001 to ADR-012 originated as design proposals from the kit. Phase 0 has audited the repository and confirmed each ADR against the existing codebase.

---

**ADR-001 — Separate privileged sensor agent** · 2026-11-19 · **Accepted (Confirmed in Phase 0 Audit)**  
- **Context:** Packet capture requires BPF/raw socket privileges. Docker Desktop on macOS hides container traffic from host interfaces. In the current codebase, `PacketCaptureService` runs in-process inside the FastAPI application using Scapy's `AsyncSniffer`.
- **Decision:** Capture, parsing, and flow aggregation will run in a separate `sensor` daemon process that transmits batches over authenticated HTTPS (`POST /api/v1/sensors/ingest`). The web API process will run unprivileged. Existing in-process capture is preserved behind a `CaptureSource` protocol abstraction for local testing and pcap replay.
- **Alternatives:** Keeping capture permanently inside FastAPI (forces root on web process); Zeek-only sensor (heavier operational burden).
- **Consequences:** One additional process to supervise; sensors can be deployed inside isolated lab segments; existing capture and flow tracker code is wrapped and adapted, never rewritten.

**ADR-002 — Postgres-backed job queue** · 2026-11-19 · **Accepted (Confirmed in Phase 0 Audit)**  
- **Context:** Network discovery scans currently execute asynchronously using FastAPI `BackgroundTasks`. Tasks are lost if the server process restarts, have no durability, and lack status visibility in SQL.
- **Decision:** A `jobs` table claimed with `SELECT … FOR UPDATE SKIP LOCKED` by a dedicated background worker process.
- **Alternatives:** Celery or RQ with Redis (requires new infrastructure and broker dependencies); in-process BackgroundTasks (no retries, lost on restart).
- **Consequences:** Zero external service dependencies; retries, timeouts, and execution history are visible directly in Postgres.

**ADR-003 — LISTEN/NOTIFY → WebSocket fan-out** · 2026-11-19 · **Accepted (Confirmed in Phase 0 Audit)**  
- **Context:** The frontend currently polls the backend every 5–10 seconds for monitoring status and health telemetry.
- **Decision:** Background workers emit PostgreSQL `NOTIFY` events after committing state changes. The FastAPI process listens and pushes lightweight, organization-filtered event IDs over `/api/v1/ws`.
- **Alternatives:** Direct client polling (higher latency and unnecessary database load); external message bus like Redis Pub/Sub.
- **Consequences:** Zero shared memory between backend processes; clients receive instant invalidation notifications and re-fetch canonical data by entity ID.

**ADR-004 — Postgres RLS as a second isolation layer** · 2026-11-19 · **Accepted (Verified in Phase 0 Audit)**  
- **Context:** Multi-tenant security requires defense-in-depth against accidental data leakage between organizations.
- **Decision:** PostgreSQL Row-Level Security (`ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`) is applied to every tenant table containing `org_id`, driven by session context `SET LOCAL app.org_id`.
- **Alternatives:** Application-level WHERE filtering alone (vulnerable to developer oversight or join bypasses).
- **Consequences:** Verified in Phase 0 audit: all tables with `org_id` are protected by forced RLS policies in the active database schema.

**ADR-005 — Postgres owns authorization; Firebase owns identity** · 2026-11-19 · **Accepted (Verified in Phase 0 Audit)**  
- **Context:** Identity authentication is provided by Firebase Admin SDK, while multi-tenant roles and fine-grained permissions must be instantly revocable.
- **Decision:** Firebase validates user identity and email verification tokens; Postgres database tables (`memberships`, `roles`, `permissions`, `membership_roles`, `role_permissions`) exclusively govern all authorization decisions server-side.
- **Alternatives:** Firebase custom claims for RBAC (suffers from token caching, latency on permission revocation, and 1000-byte claim limits).
- **Consequences:** Role and permission modifications take effect immediately upon next API request; zero stale permission windows.

**ADR-006 — Flows are the main traffic record** · 2026-11-19 · **Accepted (Verified in Phase 0 Audit)**  
- **Context:** Storing full packet pcaps exhausts local disk storage rapidly and introduces privacy/compliance risks.
- **Decision:** Store aggregated 5-tuple bidirectional flows (`FlowTracker`), discarding raw payloads. Packet samples are captured only for flagged intrusion detections, capped at ≤ 128 bytes of headers, and retained for 7 days.
- **Alternatives:** Full pcap retention (storage exhaustion on developer laptops); header-less statistical counts (insufficient forensic depth).
- **Consequences:** Bounded, deterministic storage growth; metadata-only compliance.

**ADR-007 — Fixed Nmap scan profiles** · 2026-11-19 · **Accepted (Verified in Phase 0 Audit)**  
- **Context:** Running Nmap from a web platform presents severe command-injection and out-of-scope scanning risks.
- **Decision:** Users select pre-configured scan profiles (`host_discovery`, `tcp_service_discovery`, `TOP_PORTS`, `OS`) and authorized CIDR targets. Argument lists are strictly constructed server-side, executed via `subprocess.run(shell=False)`, and targets are validated against approved scope ranges.
- **Alternatives:** Free-form flag input (arbitrary flag injection, `--script` execution vulnerabilities).
- **Consequences:** Total prevention of command injection and scope abuse; controlled scan profiles by design.

**ADR-008 — OpenAPI-generated TypeScript client** · 2026-11-19 · **Accepted (Confirmed in Phase 0 Audit)**  
- **Context:** Hand-crafted frontend API calls (`backendAuth.ts`) drift from backend Pydantic schemas over time.
- **Decision:** Generate TypeScript interfaces and client stubs directly from FastAPI's `/openapi.json` using `openapi-typescript`.
- **Alternatives:** Hand-maintained types (constant maintenance burden and silent runtime mismatches).
- **Consequences:** Type safety guaranteed end-to-end; CI fails if generated client is stale.

**ADR-009 — Lab ground truth for ML; public data as a supplement** · 2026-11-19 · **Accepted (Confirmed in Phase 0 Audit)**  
- **Context:** Public intrusion datasets (e.g. CIC-IDS2017) suffer from known label corruption, obsolete protocols, and distribution shift compared to local lab environments.
- **Decision:** Scripted, recorded lab attacks provide primary ground-truth labels joined with flow telemetry via manifests. Public datasets serve exclusively as a supplementary benchmark using matching feature sets.
- **Alternatives:** Training exclusively on public datasets (guarantees poor real-world lab generalization).
- **Consequences:** ML models reflect genuine lab attack behaviors; model cards explicitly document evaluation across public, lab, and cross-domain test splits.

**ADR-010 — Vertical slice before depth** · 2026-11-19 · **Accepted (Confirmed in Phase 0 Audit)**  
- **Context:** Building complex subsystems (Digital Twin, ML, Automated Defense) in isolation risks integration failure at project conclusion.
- **Decision:** Phase 2 establishes a thin, fully functional end-to-end slice (Observe → Alert → Recommendation → Approval → Execution). Later phases expand the depth of each individual stage.
- **Alternatives:** Horizontal layer-by-layer development (delays integration testing until end of project).
- **Consequences:** Core platform loop is testable and demonstrable early.

**ADR-011 — No automatic action execution in the MVP** · 2026-11-19 · **Accepted (Confirmed in Phase 0 Audit)**  
- **Context:** Autonomous host and firewall blocking carries extreme risk of self-inflicted denial of service.
- **Decision:** The platform recommends defensive actions; execution strictly requires explicit administrator approval, four-eyes authorization, bounded TTLs (default 15 minutes), and database-level Emergency Stop enforcement.
- **Alternatives:** Fully autonomous response in initial release (unacceptable operational risk).
- **Consequences:** Defense capabilities are transparent, auditable, and safe; automated execution reserved as a stretch goal under strict scope constraints.

**ADR-012 — Rule-based risk score first** · 2026-11-19 · **Accepted (Confirmed in Phase 0 Audit)**  
- **Context:** Black-box ML risk scores are unverifiable and confusing to security analysts.
- **Decision:** Risk v1 is a deterministic, explainable mathematical formula (`risk = criticality × max_severity × ...`) labeled with `DERIVED` provenance and an interactive breakdown tooltip in the UI. ML anomaly inputs are incorporated in Phase 6 as additive components.
- **Alternatives:** Immediate ML anomaly-based risk scoring (unexplainable scores, zero baseline interpretability).
- **Consequences:** Security analysts can trace every point of an asset's risk score directly to observed findings.
