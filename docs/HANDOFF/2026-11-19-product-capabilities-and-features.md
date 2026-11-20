# CYBERGUARD-X — Product Capabilities, Architecture & Feature Blueprint

**Document:** `docs/HANDOFF/2026-11-19-product-capabilities-and-features.md`  
**Target:** Product Designers, System Architects, UI/UX Creators, and Prompt Engineers.  
**Focus:** Pure product domain, functional features, system architecture, telemetry data structures, workflows, and security guardrails. *(No UI styling, colors, or CSS specifications).*

---

## 1. Product Mission & Executive Overview

**CYBERGUARD-X** is an autonomous, evidence-driven cyber defense and digital twin security platform designed for modern Security Operations Centers (SOCs) and critical enterprise infrastructure.

### The Problem It Solves:
Traditional enterprise security tools operate in disconnected silos: active vulnerability scanners produce point-in-time reports, network intrusion detection systems (NIDS) fire noisy alerts without topology context, and incident response teams manually scramble to block attacker IPs without knowing what attack paths exist inside the network.

### The Solution:
CYBERGUARD-X unifies **live passive network packet capture**, **active scope-bound reconnaissance**, a **real-time topological digital twin**, **supervised machine learning anomaly detection**, and **automated guardrailed defensive response** into a single closed-loop defense lifecycle:

```
[OBSERVE] ➔ [UNDERSTAND] ➔ [SIMULATE] ➔ [PREDICT & DECIDE] ➔ [DEFEND & AUTOMATE] ➔ [LEARN]
```

---

## 2. Core Architectural Principles & System Design

1. **Evidence-Driven (Zero Fake Data):**
   - The platform strictly forbids synthetic, hallucinated, or placeholder operational data. Every host, port, packet, flow, vulnerability, and alert originates from genuine network observations or mathematical models.
   - Every single record carries mandatory data provenance:
     - `OBSERVED`: Raw wire packets, nmap scan outputs, active sensor telemetry.
     - `DERIVED`: Heuristic rule matches, statistical baseline deviations, calculated asset risk scores.
     - `PREDICTED`: Machine learning model inferences and anomaly scores.
     - `SIMULATED`: Digital twin attack graph paths and hypothetical what-if scenario results.

2. **Dual-Plane Isolation & Zero-Trust Multi-Tenancy:**
   - **Identity Layer:** Firebase Authentication handles identity tokens.
   - **Authorization Layer:** PostgreSQL 17 Row-Level Security (RLS) coupled with application-level `OrgContext` dependencies guarantees that multi-tenant data is completely isolated at the database engine level.
   - **Privilege Separation:** The web API server runs as an unprivileged service. Only the isolated sensor process or local helper holds BPF packet capture permissions.

3. **Asynchronous Job Queue Engine:**
   - Long-running tasks (network discovery, digital twin graph compilation, machine learning model training, and defensive action execution) run via a PostgreSQL-backed transactional job queue with `SELECT ... FOR UPDATE SKIP LOCKED`, exponential backoffs, and dead-letter queues.

---

## 3. The 6-Stage Defense Intelligence Loop & Detailed Features

### Stage 1: OBSERVE — Telemetry & Active Reconnaissance
The ingest plane continuously gathers network reality through two complementary mechanisms:

* **Passive Wire Sensor (`sensor`):**
  - Intercepts live Ethernet/IP frames via Berkeley Packet Filter (BPF) on designated network interfaces (e.g., `eth0`, `en0`).
  - Tracks network flows with active (120s) and idle (30s) stateful timeouts.
  - Computes flow metrics: duration, packet counts, byte counts, TCP flag distributions (SYN, ACK, FIN, RST, PSH, URG), inter-arrival times, and protocol types.
  - Heartbeat telemetry reports queue depth, CPU utilization, and packet drop counters every 10 seconds.
  - **Replay Mode:** Ability to ingest recorded lab `.pcap` files through the exact same flow tracker for offline model training, regression testing, and attack simulation.

* **Scope-Bound Active Reconnaissance:**
  - Automated network scanner orchestrating `nmap` via strictly parsed argument lists (no shell execution).
  - Enforces strict CIDR boundary allowlists per organization (e.g., `10.0.0.0/24`). Targets outside the authorized CIDR are rejected before execution.
  - Four standardized scan profiles:
    - `DISCOVERY`: Host discovery sweep (`nmap -sn`).
    - `TOP_PORTS`: Fast SYN stealth scan against the top 1000 ports (`nmap -sS --top-ports 1000 -T4`).
    - `SERVICE`: Service version and banner detection (`nmap -sV --version-light`).
    - `OS`: Operating system fingerprinting (`nmap -O`).
  - **Differential Change Detection:** Automatically diffs current scan results with the previous baseline run to flag state transitions: `HOST_NEW`, `HOST_GONE`, `PORT_OPENED`, `PORT_CLOSED`, and `SERVICE_CHANGED`.

---

### Stage 2: UNDERSTAND — Threat Detection & Vulnerability Correlation
Transforms raw telemetry into structured, contextualized security findings:

* **Layered Threat Detection Engine:**
  - **Heuristic Rule Engine:** Evaluates rolling time windows against deterministic threat patterns mapped directly to MITRE ATT&CK techniques:
    - `PORT_SCAN_VERTICAL (T1046)`: Single source scanning ≥ 50 ports on one host within 60s.
    - `HOST_SWEEP (T1046)`: Single source probing ≥ 20 unique hosts within 60s.
    - `BRUTE_FORCE_AUTH (T1110)`: ≥ 20 rapid connections to authentication ports (SSH 22, RDP 3389, HTTP Auth) within 60s.
    - `RISKY_EXPOSED_SERVICE (T1133/T1190)`: Detection of high-risk unencrypted protocols (Telnet 23, FTP 21, SMB 445, database ports) exposed to unauthorized subnets.
    - `NONSTANDARD_PORT_PROTO (T1571)`: Recognized protocols executing on anomalous ports.
    - `NEW_EXTERNAL_DEST (T1071)`: Asset initiating contact with an IP never seen during baseline profiling.
    - `BEACONING (T1071)`: Low-jitter, periodic traffic flows indicating Command & Control (C2) agent communication.
  - **Statistical Anomaly Detection:** Computes per-asset rolling z-scores across connection volume, byte volume, and unique destination counts, alerting when activity deviates beyond standard deviations.

* **Vulnerability Correlation Engine:**
  - Converts detected service strings and banners into Common Platform Enumeration (CPE) identifiers.
  - Automatically matches CPEs against a locally mirrored National Vulnerability Database (NVD) CVE catalog.
  - Stores CVSS base scores, vector strings, and exploitability metrics for downstream risk prioritization.

* **Finding Lifecycle & Provenance:**
  - Confidence graduation hierarchy: `OBSERVATION` ➔ `INDICATOR` ➔ `SUSPECTED` ➔ `CONFIRMED_INCIDENT`.
  - Workflow states: `OPEN` ➔ `INVESTIGATING` ➔ `CONFIRMED` | `DISMISSED` | `FALSE_POSITIVE`.
  - Every finding links directly to raw evidence: underlying flow IDs, packet counters, and scan observation records.

---

### Stage 3: SIMULATE — Topological Digital Twin & Attack Graph Modeling
Constructs an in-memory virtual replica of the protected infrastructure to model adversary movement:

* **Network Graph Representation (NetworkX):**
  - **Nodes:** Physical/virtual assets, services, software packages, and network trust zones (`DMZ`, `Internal`, `Database Core`, `Crown Jewels`).
  - **Edges:** Active communication pathways (`REACHES`), observed network flows, firewall reachability rules, and zone memberships (`IN_ZONE`).

* **Attack Path Analysis (MulVAL-Style Reachability):**
  - Simulates potential adversary traversal from an entry point (e.g., internet gateway or compromised host) toward designated crown jewel assets.
  - Calculates edge traversal costs based on:
    $$\text{Cost} = \frac{1}{\text{Exploitability} \times \text{Exposure}}$$
    where exploitability is derived from service CVSS scores and exposure reflects observed flow reachability.
  - Computes the $k$-shortest attack paths to identify critical pivot nodes and choke points.

* **What-If Simulation Engine:**
  - Enables security engineers to clone the digital twin snapshot and test hypothetical defensive mutations without touching production systems:
    - *What if port 445 (SMB) is blocked between DMZ and Internal?*
    - *What if vulnerability CVE-2024-XXXX on the web server is patched?*
    - *What if the database zone is isolated?*
  - Outputs differential impact reports showing severed attack paths, newly introduced paths, and overall organizational risk reduction.

---

### Stage 4: PREDICT & DECIDE — Machine Learning & Dynamic Risk Scoring
Augments deterministic rules with predictive intelligence:

* **Supervised Flow Classifier (Model A):**
  - Multi-class classification model (Logistic Regression baseline ➔ Random Forest ➔ XGBoost) trained to classify traffic into: `BENIGN`, `PORT_SCAN`, `BRUTE_FORCE`, or `C2_BEACON`.
  - Features: Flow duration, forward/backward packets, forward/backward bytes, TCP flag counts, destination port entropy, and inter-arrival time standard deviation.
  - Enforces temporal and session-based data splits to prevent data leakage.
  - Evaluated on precision, recall, macro-F1, false positive rate (FPR), and inference latency.

* **Unsupervised Anomaly Detection (Model B):**
  - Per-asset Isolation Forest models trained on known benign traffic baselines to detect novel attack techniques that evade signature rules.

* **Dynamic Asset & Organization Risk Scoring:**
  - Calculates explainable composite risk scores (0–100) per asset:
    $$\text{Risk} = \text{Criticality Weight} \times \max(\text{Finding Severity}) \times (1 + 0.1 \times \text{Open Findings}) \times \text{Exposure}$$
  - Transparent formula where every risk factor is decomposed into plain numbers and actionable recommendations.

---

### Stage 5: DEFEND & AUTOMATE — Guardrailed Active Countermeasures
Executes safe, reversible defensive actions to neutralize confirmed threats:

* **Defensive Action Lifecycle:**
  ```
  RECOMMENDED ➔ [Human Approval] ➔ APPROVED ➔ EXECUTING ➔ SUCCEEDED ➔ [TTL Expire / Revert] ➔ ROLLED_BACK
       │                                            │
       └── [Reject] ➔ REJECTED                      └── [Error] ➔ FAILED ➔ ROLLED_BACK
  ```

* **Executor Implementations:**
  - `notify`: In-app analyst notification and priority dispatch.
  - `fw_block`: Active firewall shunning. Deploys dynamic block rules on Linux lab gateways (`nftables`) or macOS anchors (`pf`). Rules include an automatic Time-To-Live (TTL, default 15 minutes, max 24 hours).
  - `isolate_lab_container`: Automatic network boundary disconnection for compromised test containers via Docker container networking.

* **Strict Safety Guardrails:**
  - **Four-Eyes Principle:** Actions recommended by one operator must be reviewed and approved by an `ADMIN` or `OWNER` before execution. Operators cannot approve their own requests.
  - **Automatic Rollback & Verification:** Every execution captures pre-state, runs the change, verifies that the block is actively filtering packets, and automatically rolls back if verification fails or when the TTL expires.
  - **Emergency Stop (Kill Switch):** A globally available one-click kill switch that instantly aborts any executing actions and immediately flushes all active firewall shuns back to the pristine baseline.
  - **Host Protection:** The production developer/host machine is strictly blacklisted; defensive blocks only execute within the authorized lab target scope.

---

### Stage 6: LEARN & ADAPT — Continuous Feedback & Retraining
Closes the loop between human analysts and automated models:

* **Analyst Feedback Integration:**
  - Analysts review findings and tag outcomes as `CONFIRMED_TRUE_POSITIVE` or `FALSE_POSITIVE`.
  - False positive labels adjust heuristic rule thresholds and feed directly into the retraining queue for supervised ML models.

* **Audit Logging & Compliance Reporting:**
  - Append-only `audit_logs` table protected with database-level `INSERT, SELECT` grants.
  - Logs all authentication attempts, scan triggers, scope expansions, rule approvals, and firewall changes with timestamps and cryptographic user IDs.
  - Exportable executive summary reports covering threat trends, mean time to detect (MTTD), mean time to respond (MTTR), and attack surface reduction metrics.

---

## 4. Key Entities & Data Models

| Entity | Primary Attributes | Role in System |
|---|---|---|
| **Organization** | `id, name, slug, plan` | Multi-tenant root container. |
| **User & Membership** | `id, email, role (OWNER, ADMIN, ANALYST, VIEWER)` | RBAC access control. |
| **Scope** | `id, cidr_network, label, is_active` | Strict network scanning and capture boundary. |
| **Asset** | `id, ip_address, mac_address, hostname, criticality, os` | Inventory of discovered physical/virtual nodes. |
| **Service** | `id, asset_id, port, protocol, service_name, version, cpe` | Open ports and running software banners. |
| **Vulnerability** | `id, cve_id, cvss_score, description, severity, status` | Identified CVE exposure per service. |
| **Flow** | `id, src_ip, dst_ip, src_port, dst_port, proto, packets, bytes` | Aggregated network traffic stream records. |
| **Finding** | `id, title, rule_id, level, status, confidence, provenance` | Identified security event or policy violation. |
| **Attack Path** | `id, snapshot_id, path_nodes, score, bottleneck_asset` | Simulated adversary attack trajectories. |
| **Defense Action** | `id, finding_id, executor_type, target, status, ttl_seconds` | Recommended or executing mitigation action. |
| **Audit Log** | `id, actor_id, action, target_type, target_id, payload, created_at` | Immutable ledger of all system operations. |

---

## 5. Primary User Personas & Core Journeys

1. **SOC Tier-2/3 Analyst:**
   - Monitors live wire telemetry and incoming findings.
   - Drills down from a high-severity alert into raw packet flows and affected assets.
   - Evaluates attack paths in the digital twin to determine lateral movement risk.
   - Requests a firewall shun or host isolation.

2. **Incident Response Lead / SOC Manager (Admin/Owner):**
   - Reviews and approves or rejects pending defensive action recommendations (Four-Eyes principle).
   - Manages authorized network scopes and sensor deployments.
   - Runs what-if simulations to justify security patch prioritization.
   - Hits the Emergency Stop switch during drills or false positive anomalies.

3. **Academic / Technical Reviewer (BTech Major Project Evaluator):**
   - Evaluates the mathematical rigor of the ML models and attack graph algorithms.
   - Verifies the evidence chain: ensures every finding links to real packets and genuine scan outputs with zero synthetic inflation.
   - Audits the separation of privilege between unprivileged API services and privileged sensor agents.
