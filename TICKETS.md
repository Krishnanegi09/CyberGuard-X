# TICKETS — CYBERGUARD-X Defect & Task Tracker
_Last updated: 2026-11-19 | Maintained by Staff Frontend & Systems Architecture_

This document maintains the authoritative tracking log of all UI/UX bugs, alignment inconsistencies, broken workflows, and functional tickets logged across CYBERGUARD-X design audits.

---

## Ticket Summary Matrix

| Ticket ID | Priority | Module / Area | Description | Status | Verified In |
|---|---|---|---|---|---|
| **CGX-UI-001** | P0 | Global Shell / TopBar | Inconsistent control heights (34–38px), floating theme toggle, misaligned telemetry pill | **RESOLVED** | `TopHeader.tsx`, `App.css` |
| **CGX-UI-002** | P0 | Evidence Drawer | Top badges vertical stacking; footer action buttons broken/squished alignment | **RESOLVED** | `EvidenceDrawer.tsx`, `App.css` |
| **CGX-UI-003** | P0 | Assets Module | Broken inline detail text dump below table instead of dedicated full-page workbench | **RESOLVED** | `AssetsView.tsx` |
| **CGX-UI-004** | P1 | Overview / Analytics | "Critical" red segment on Assets Donut chart invisible / under-allocated arc | **RESOLVED** | `AssetRiskDonut.tsx` |
| **CGX-UI-005** | P0 | Digital Twin Engine | Amateur "AI-slop" diagram, line crosses zone titles, text overflows, bad topology | **RESOLVED** | `DigitalTwinView.tsx`, `App.css` |
| **CGX-UI-006** | P0 | Simulations Module | Simulations view broken layout, text clipping, improper margin/button clashes | **RESOLVED** | `SimulationsView.tsx`, `App.css` |
| **CGX-UI-007** | P1 | Scopes / Scan & NIDS | Inconsistent slate-blue theme (`#0d121f`) conflicting with CYBERGUARD-X tokens | **RESOLVED** | `NetworkDiscovery.css`, `NIDSMonitor.css` |
| **CGX-UI-008** | P0 | Overview Dashboard | Overview components non-resizable; lacked user-controlled layout density/splitters | **RESOLVED** | `OverviewView.tsx`, `App.css` |
| **CGX-UI-009** | P2 | Tables & Badges | Multi-line text wrapping on table badges ("3 Open" wrapped onto two lines) | **RESOLVED** | `App.css`, `AssetsView.tsx` |
| **CGX-UI-010** | P0 | Scopes & Scans Form | White patches, unstyled form inputs, unstyled metric cards in Network Discovery | **RESOLVED** | `NetworkDiscovery.css`, `NetworkDiscovery.tsx` |
| **CGX-UI-011** | P0 | Simulations Module | Uneven card heights between left intervention catalog and right impact analysis | **RESOLVED** | `SimulationsView.tsx`, `App.css` |
| **CGX-UI-012** | P0 | Digital Twin Engine | Trust zone filter buttons (ALL, DMZ, INTERNAL, CROWN) not functioning | **RESOLVED** | `DigitalTwinView.tsx` |
| **CGX-UI-013** | P1 | Global Shell / TopBar | Color clashing, spacing irregularities, telemetry badge height & kill switch harmony | **RESOLVED** | `TopHeader.tsx`, `App.css` |
| **CGX-UI-014** | P1 | Overview Dashboard | Cluttered permanent resize banners and glowing dividers; hidden until hover/resize | **RESOLVED** | `OverviewView.tsx`, `App.css` |
| **CGX-UI-015** | P1 | Global Sidebar | Auto-collapse on small viewports (<1200px), expand on click/hover, persistent state | **RESOLVED** | `Sidebar.tsx`, `App.tsx`, `App.css` |
| **CGX-UI-016** | P0 | Overview Dashboard | Zero spacing / touching cards between Threat Activity and Network Digital Twin | **RESOLVED** | `OverviewView.tsx`, `App.css` |
| **CGX-UI-017** | P0 | Wire NIDS Sensor | Device input was static; "Start Capture" triggered HTTP 422 error | **RESOLVED** | `NIDSMonitor.tsx`, `monitoring.py` |
| **CGX-UI-018** | P0 | Automation & Insights | Generic placeholder stubs for Playbooks, Jobs, Integrations, Reports, Learn | **RESOLVED** | `views/*.tsx`, `App.tsx` |
| **CGX-TST-001** | P0 | Automated Testing | Comprehensive Playwright CLI automated E2E test suite covering baseline features | **RESOLVED** | `e2e/cyberguard.spec.ts` (7/7 Pass) |
| **CGX-TST-002** | P0 | Automated Testing | Expanded 9-test Playwright suite verifying NIDS, Automation & Insights workflows | **RESOLVED** | `e2e/cyberguard.spec.ts` (9/9 Pass) |
| **CGX-GOV-001** | P1 | Governance & Docs | Missing centralized ticket file (`TICKETS.md`) and outdated milestone tracking | **RESOLVED** | `TICKETS.md`, `PROGRESS.md` |
| **CGX-PHASE9-001**| P0 | Milestone Delivery | Phase 9 acceptance test `test_phase9.py`, reports & exit gate delivery | **RESOLVED** | `scripts/check-phase.sh 9` (PASS) |

---

## Detailed Ticket Specifications & Resolution Log

### [CGX-UI-001] Global TopBar Baseline & Control Alignment
- **Priority:** P0 (Executive UI Integrity)
- **Component:** `frontend/src/components/TopHeader.tsx`, `frontend/src/App.css`
- **Symptom:** Inconsistent vertical alignment in the top bar. The search bar was 38px, kill switch 34px, user avatar 34px, theme toggle had no container border/background, and the `LAB REPLAY TELEMETRY` pill was offset vertically.
- **Root Cause:** Unequal CSS height, padding, and display properties across disparate component definitions.
- **Implementation:**
  1. Standardized all interactive header elements (`.search-wrap`, `.icon-btn`, `.theme-toggle-btn`, `.action-btn-danger`, `.avatar-btn`) to a uniform **36px** control height with `display: inline-flex; align-items: center;`.
  2. Gave `.theme-toggle-btn` and `.icon-btn` explicit backgrounds (`var(--bg-surface)`) and borders (`1px solid var(--border-subtle)`).
  3. Locked `.telemetry-badge-pill` to `height: 28px; padding: 0 10px; border-radius: 14px;` for a centered status badge baseline.
- **Verification:** Built cleanly in Vite (325ms); visually aligned across light and dark themes.
- **Status:** **RESOLVED**

---

### [CGX-UI-002] Evidence Drawer Badge Stacking & Action Button Alignment
- **Priority:** P0 (Core Operational Workflow)
- **Component:** `frontend/src/components/EvidenceDrawer.tsx`, `frontend/src/App.css`
- **Symptom:** The top severity/status badges rendered vertically stacked with excessive empty whitespace. The footer buttons (`Acknowledge` and `Apply Host Shun`) were awkwardly right-aligned with unequal widths and missing standard button spacing.
- **Root Cause:** Missing flex row layout for badges (`display: flex; gap: 8px;`); drawer footer lacked a symmetric grid template.
- **Implementation:**
  1. Header reconstructed with `.drawer-badge-row` displaying severity (`Critical`), provenance (`OBSERVED`), and finding ID tags horizontally.
  2. Footer converted to a balanced 2-column grid (`display: grid; grid-template-columns: 1fr 1fr; gap: 14px;`) ensuring both `.btn-drawer-secondary` and `.btn-drawer-danger` occupy equal 50% widths at uniform 40px height with centered text and icons.
- **Verification:** Verified in browser screenshots; drawer triggers seamlessly on row clicks.
- **Status:** **RESOLVED**

---

### [CGX-UI-003] Assets Table Inline Text Dump Replacement (Full-Page Workbench)
- **Priority:** P0 (Core Usability Defect)
- **Component:** `frontend/src/views/AssetsView.tsx`
- **Symptom:** Clicking any host in the Asset Inventory table dumped broken, unformatted plain text directly beneath the table (`Hardware & Identity Profile`, concatenated metadata strings like `Affected Target10.0.0.12`).
- **Root Cause:** Inline nested drawer component inside the table layout with missing block styling and no routing separation.
- **Implementation:**
  1. Replaced buggy inline dump with a dedicated full-page **Asset Detail Workbench** (`selectedAsset !== null` state toggle).
  2. Added breadcrumb / `← Back to Asset Inventory` navigation button.
  3. Implemented structured hardware key-value specification grid, formatted listening services table, correlated CVE cards with CVSS pills, and quick isolation action triggers.
- **Verification:** `npm run build` PASS; zero text concatenation; verified responsive layout.
- **Status:** **RESOLVED**

---

### [CGX-UI-004] Assets by Risk Donut Chart "Critical" Arc Visibility
- **Priority:** P1 (Visual Polish & Accuracy)
- **Component:** `frontend/src/components/AssetRiskDonut.tsx`
- **Symptom:** With 6 Critical assets out of 124, the red segment arc was virtually invisible or clipped on small rendering scales.
- **Root Cause:** Proportional angle without minimum visual floor caused small percentage slices to visually collapse under stroke caps.
- **Implementation:**
  1. Implemented an 11% minimum visual arc floor with proportional redistribution across remaining segments.
  2. Added 4.5px inter-segment spacing and precise corner rounding.
- **Verification:** Close-up inspection artifact shows distinct, prominent crimson arc.
- **Status:** **RESOLVED**

---

### [CGX-UI-005] Digital Twin Topology Diagram Overhaul
- **Priority:** P0 (Anti-Slop Enterprise Quality)
- **Component:** `frontend/src/views/DigitalTwinView.tsx`, `frontend/src/App.css`
- **Symptom:** Looked like an "AI-generated" amateur diagram. Red attack beams crossed directly over zone text banners, nodes were generic circles with overflowing labels, and topology lacked pan/zoom controls.
- **Root Cause:** Naive SVG layout with overlapping bounding boxes and unpartitioned coordinate planes.
- **Implementation:**
  1. Rebuilt topology using structured **Hardware Micro-Pod Cards** with OS badges, mono IP pills, and choke point markers.
  2. Subnets partitioned into non-overlapping zones: DMZ (`10.0.0.0/28`), Internal Trust (`10.0.0.16/28`), and Crown Jewels (`10.0.0.32/29`) with dedicated header strips that links never traverse.
  3. Added interactive mouse drag pan, zoom controls (+ / - / Reset), and click-to-inspect drawers.
- **Verification:** Verified in browser at 1536x960; interactive zone filtering working.
- **Status:** **RESOLVED**

---

### [CGX-UI-006] Simulations Module Text Overflow & Layout Distortion
- **Priority:** P0 (Operational Readiness)
- **Component:** `frontend/src/views/SimulationsView.tsx`, `frontend/src/App.css`
- **Symptom:** Severe horizontal and vertical layout breakage. Text clipped across mutation cards, action buttons overlapped status chips, and baseline risk scores wrapped awkwardly.
- **Root Cause:** Unconstrained flex widths and fixed pixel paddings.
- **Implementation:**
  1. Refactored into a responsive 2-column grid (`grid-template-columns: 1fr 1fr; gap: 24px; align-items: stretch;`).
  2. Applied text ellipsis on descriptions and flexbox layout on score boxes.
- **Verification:** Both cards render at equal height with clean responsive behavior.
- **Status:** **RESOLVED**

---

### [CGX-UI-007] Scopes / Scans & NIDS Design Token Unification
- **Priority:** P1 (Design Consistency)
- **Component:** `frontend/src/NetworkDiscovery.css`, `frontend/src/NIDSMonitor.css`
- **Symptom:** Hardcoded slate-blue background values (`#0d121f`, `#1e293b`) clashing with dark theme token variables.
- **Root Cause:** Legacy CSS written prior to centralized token architecture.
- **Implementation:** Replaced hardcoded color values with `var(--bg-surface)`, `var(--bg-canvas)`, `var(--border-subtle)`, and `var(--accent-cyan)`.
- **Status:** **RESOLVED**

---

### [CGX-UI-008] Overview Dashboard Component Resizability
- **Priority:** P0 (Executive User Request)
- **Component:** `frontend/src/views/OverviewView.tsx`, `frontend/src/App.css`
- **Symptom:** Components were static and could not be resized or customized by operators.
- **Implementation:**
  1. Implemented mouse-drag column splitters and horizontal row splitters with mousemove/mouseup listener lifecycle and `document.body.style.cursor = 'col-resize'`.
  2. Added layout density quick-switch bar (`Balanced (1:1)`, `Focus Chart`, `Focus Twin`, `Reset`).
  3. Added localStorage persistence under key `cgx_overview_layout_splits`.
- **Verification:** Verified via Playwright test 3.
- **Status:** **RESOLVED**

---

### [CGX-UI-009] Table Cell Status Badge Line Wrapping
- **Priority:** P2 (Visual Hygiene)
- **Component:** `frontend/src/App.css`, `frontend/src/views/AssetsView.tsx`
- **Symptom:** Table cells with badges wrapped text into multiple lines (e.g., "3 Open" broke onto two lines).
- **Implementation:** Added `white-space: nowrap;` and `display: inline-flex; align-items: center;` to `.status-pill`, `.badge-provenance`, and `.tag-cve`.
- **Status:** **RESOLVED**

---

### [CGX-UI-010] Scopes & Scans Form Styling & White Patch Elimination
- **Priority:** P0 (Anti-Slop Enterprise Polish)
- **Component:** `frontend/src/NetworkDiscovery.css`, `NetworkDiscovery.tsx`
- **Symptom:** White patches on input fields, overlapping text labels, unstyled buttons in Network Discovery view.
- **Implementation:** Form inputs given explicit `background-color: var(--bg-canvas) !important`, `color: var(--text-primary)`, clean borders, and generous padding.
- **Status:** **RESOLVED**

---

### [CGX-UI-011] Simulations View Card Height Equalization
- **Priority:** P0 (Visual Harmony)
- **Component:** `frontend/src/views/SimulationsView.tsx`, `frontend/src/App.css`
- **Symptom:** Left box ("Select Hypothetical Intervention") and right box ("Intervention Impact Assessment") had uneven heights.
- **Implementation:** Configured parent grid with `align-items: stretch;` and children with `height: 100%; display: flex; flex-direction: column;`.
- **Verification:** Verified via Playwright test 4: `Math.abs(configBox.height - resultsBox.height) <= 2px`.
- **Status:** **RESOLVED**

---

### [CGX-UI-012] Digital Twin Zone Filter Pill Action
- **Priority:** P0 (Feature Defect)
- **Component:** `frontend/src/views/DigitalTwinView.tsx`
- **Symptom:** Buttons like ALL, DMZ, INTERNAL, CROWN were non-functional mock buttons.
- **Implementation:** Wired state `activeZoneFilter`, filtering visible nodes and highlighting paths corresponding to selected zone.
- **Verification:** Verified via Playwright test 5.
- **Status:** **RESOLVED**

---

### [CGX-UI-013] TopBar Spacing, Kill Switch & Palette Polish
- **Priority:** P1 (Design Polish)
- **Component:** `frontend/src/components/TopHeader.tsx`, `frontend/src/App.css`
- **Symptom:** Spacing issues, color clashing in header and kill switch button.
- **Implementation:** Unified all header buttons to 36px height, rounded corners, subtle red outline on kill switch, and smooth transitions.
- **Verification:** Verified via Playwright test 2.
- **Status:** **RESOLVED**

---

### [CGX-UI-014] Overview Divider Hover Reveal
- **Priority:** P1 (Anti-Slop Cleanliness)
- **Component:** `frontend/src/views/OverviewView.tsx`, `frontend/src/App.css`
- **Symptom:** Visible ugly resize banners and glowing bars cluttered the clean dashboard view.
- **Implementation:** Hidden splitter drag-bars by default; subtle cyan highlight appears only on hover or active dragging.
- **Status:** **RESOLVED**

---

### [CGX-UI-015] Sidebar Responsive Auto-Collapse & Expand
- **Priority:** P1 (Navigation & Usability)
- **Component:** `frontend/src/components/Sidebar.tsx`, `App.tsx`, `App.css`
- **Symptom:** Sidebar stayed fixed at 240px on all viewports, consuming valuable analytical screen real estate.
- **Implementation:** Added viewport resize listener that auto-collapses sidebar when viewport width < 1200px. Added manual toggle button, logo expand trigger, and localStorage persistence.
- **Verification:** Verified via Playwright test 1.
- **Status:** **RESOLVED**

---

### [CGX-UI-016] Overview Dashboard Card Spacing Overhaul
- **Priority:** P0 (Executive UI Integrity)
- **Component:** `frontend/src/views/OverviewView.tsx`, `frontend/src/App.css`
- **Symptom:** In the Overview dashboard, the Threat Activity and Network Digital Twin cards were touching with zero spacing.
- **Root Cause:** `.resizable-row` lacked an explicit CSS gap, and `.split-gutter-col` had a negative margin (`margin: 0 -7px`).
- **Implementation:**
  1. Set `gap: 20px;` and `margin-bottom: 20px;` on `.resizable-row`.
  2. Set `.split-gutter-col` width to 16px with centered grab bar (`margin: 0 -18px;`).
  3. Added bottom margin to `.cg-hero` (24px) and middle row splitter (20px).
- **Verification:** Verified via Playwright test 3 and visual browser screenshots.
- **Status:** **RESOLVED**

---

### [CGX-UI-017] Wire NIDS Dynamic Interface Scanning & HTTP 422 Resolution
- **Priority:** P0 (Core Sensor Workflow)
- **Component:** `frontend/src/NIDSMonitor.tsx`, `backend/app/api/v1/monitoring.py`
- **Symptom:** The interface input was hardcoded static text ("en0"). Clicking "Start Capture" triggered a red banner with `Backend request failed (HTTP 422)`.
- **Root Cause:**
  1. `App.tsx` passed `scopeId="default-scope"`, but FastAPI requires a valid UUID regex. Passing `"default-scope"` threw HTTP 422 Unprocessable Entity.
  2. Host network interfaces were not enumerated by the backend.
- **Implementation:**
  1. Added backend endpoint `GET /interfaces` utilizing `scapy.get_if_list()` with fallback to common host interfaces.
  2. Replaced the text input in `NIDSMonitor.tsx` with a `<select className="nids-interface-select">` populated dynamically.
  3. Added a dedicated Refresh button with spinning state on data fetch.
  4. Dynamically queried network scopes via `getNetworkScopes(orgId, token)` and bound the active scope UUID instead of passing hardcoded strings.
- **Verification:** Verified via Playwright test 8: dynamic interface dropdown populated with `en0`, `lo0`, `en1`, etc.; Start Capture executes without HTTP 422 error.
- **Status:** **RESOLVED**

---

### [CGX-UI-018] Automation & Insights Subsystem View Implementation
- **Priority:** P0 (Feature Completeness)
- **Component:** `frontend/src/views/PlaybooksView.tsx`, `JobsView.tsx`, `IntegrationsView.tsx`, `ReportsView.tsx`, `LearnView.tsx`
- **Symptom:** Navigation tabs under "Automate" (Playbooks, Jobs & Runs, Integrations) and "Insights" (Reports, Learn) rendered static generic placeholder cards.
- **Implementation:**
  1. Built `PlaybooksView.tsx`: Interactive playbooks with trigger conditions, dry-run simulation, execution metrics, and active/paused state toggles.
  2. Built `JobsView.tsx`: Real-time jobs queue table displaying job ID, task type, status, attempts, leasing timeouts, and manual dispatch controls.
  3. Built `IntegrationsView.tsx`: Telemetry connectors for pfSense, Splunk HEC, CrowdStrike Falcon, and AWS VPC with credential configuration dialog and connection tests.
  4. Built `ReportsView.tsx`: Exportable reports (Discovery scan, incident forensics, ML performance evaluation) with modal Markdown viewer and download capability.
  5. Built `LearnView.tsx`: Platform knowledge base covering the 5-pillar architecture, MITRE ATT&CK matrix mappings, ML feature engineering, and zero-fake-data governance.
- **Verification:** Verified via Playwright test 9.
- **Status:** **RESOLVED**

---

### [CGX-TST-002] Expanded 9-Test Playwright E2E Suite
- **Priority:** P0 (Automated Quality Gate)
- **Component:** `frontend/e2e/cyberguard.spec.ts`
- **Scope:**
  - Test 1: Sidebar Navigation, Collapse/Expand & Routing
  - Test 2: Top Bar Controls (Search, Theme, Kill Switch, Notifications)
  - Test 3: Overview Page Resizability & Layout Controls
  - Test 4: Simulations Module — Equal Card Height & Interactive Countermeasures
  - Test 5: Digital Twin — Active Zone Filters (ALL, DMZ, INTERNAL, CROWN)
  - Test 6: Findings Module & Evidence Drawer
  - Test 7: Assets Module Master-Detail Workbench
  - Test 8: Wire NIDS — Dynamic Interface Dropdown & Error-Free Sensor Control
  - Test 9: Automation & Insights Modules (Playbooks, Jobs, Integrations, Reports, Learn)
- **Verification:** Ran `npx playwright test` -> **9 passed in 17.4s**.
- **Status:** **RESOLVED**

---

### [CGX-PHASE9-001] Phase 9 Polish, Reports & Milestone Exit Gate Delivery
- **Priority:** P0 (Cumulative Delivery Gate)
- **Component:** `scripts/check-phase.sh`, `backend/tests/acceptance/test_phase9.py`, `docs/reports/`, `PROGRESS.md`
- **Scope & Objectives:**
  1. Authored `test_phase9.py` implementing `test_demo_runbook_smoke` verifying the complete 13-step story in `docs/DEMO_RUNBOOK.md`.
  2. Generated sample discovery scan report (`docs/reports/scan_report_example.md`) and incident response report (`docs/reports/incident_report_example.md`).
  3. Audited Python runtime dependencies with `pip-audit --progress-spinner off` verifying 0 known CVEs.
  4. Configured execution environment in `scripts/check-phase.sh` ensuring virtualenv binaries are included in PATH.
  5. Documented Definition of Done Evidence Blocks for milestones 9.1, 9.2, 9.3, 9.4, and 9.5 in `PROGRESS.md`.
- **Verification:**
  - `./scripts/check-phase.sh 9` -> `PHASE 9 GATE: PASS`.
  - `./scripts/verify-all.sh` -> All 217 backend tests passed, frontend tsc passed, eslint clean, production vite build passed.
  - `npx playwright test` -> All 9 end-to-end browser tests passed.
- **Status:** **RESOLVED**
