# CYBERGUARD-X — UI Design & Image Generation Handoff

**File:** `docs/HANDOFF/2026-11-19-ui-design-and-image-generation.md`  
**Date:** 2026-11-19  
**Target:** Design Engineers, GPT Image Generators (ChatGPT / DALL-E 3 / Midjourney), and Frontend Developers.

---

## 1. Product Identity & Core Mission

- **Platform Name:** CYBERGUARD-X
- **Tagline:** *Predict. Protect. Respond. Before Threats Strike.*
- **Classification:** Autonomous AI-Powered Cyber Defense & Digital Twin Security Platform
- **Target Audience:** Security Operations Center (SOC) Tier-2/3 Analysts, Incident Responders, Network Defense Engineers, and University Major Project Reviewers.
- **Visual Personality:** High-precision, zero-fluff, dark cinematic operations deck (inspired by Linear, CrowdStrike Falcon, Cloudflare Radar, and 21st.dev design systems).
- **Mode:** Operate & Command (Clean, high data density, balanced rhythm, accessible contrast, zero fake data).

---

## 2. Design Tokens & Visual Specifications

### A. Color Palette
| Token | Hex | Usage |
|---|---|---|
| **Canvas Background** | `#080A0F` | Deep void black-slate backdrop; no harsh pure `#000000`. |
| **Bento Surface** | `#0D1017` | Card surfaces with 1px subtle borders. |
| **Elevated Surface** | `#121622` | Inputs, dropdown menus, and nested metric pills. |
| **Hover Surface** | `#171C2A` | Interactive hover states. |
| **Hairline Borders** | `rgba(255, 255, 255, 0.08)` / `#1E2330` | Clean structural 1px dividers. |
| **Primary Accent** | `#06B6D4` / `#00F0FF` | Electric cyan for active states, brand mark accents, and focus rings. |
| **Threat / Critical** | `#EF4444` / `#FF3856` | Signal crimson for intrusion alerts, port scans, and severe anomalies. |
| **Nominal / Success** | `#10B981` / `#34D399` | Emerald green for active sensor status, verified scopes, and healthy services. |
| **Warning / Staged** | `#F59E0B` | Signal amber for degraded performance or triage-pending items. |
| **Primary Text** | `#F8FAFC` | High-contrast off-white display and heading typography. |
| **Secondary Text** | `#94A3B8` | Neutral muted slate for labels, descriptions, and metadata. |

### B. Typography Standards
- **Display & Headings:** `Space Grotesk` or `Geist Display` — Semi-bold / Bold, tight letter-spacing (`-0.03em`), pure off-white.
- **UI & Form Controls:** `Inter` or `Geist Sans` — 13px / 14px, medium weight, crisp contrast.
- **Technical & Telemetry Data:** `JetBrains Mono` — Monospace for all IP addresses, CIDR ranges, MAC addresses, port numbers, SHA-256 hashes, scan IDs (`#104`), and ISO-8601 timestamps.

### C. Anti-Slop Directives (Strictly Enforced)
- **NO purple/blue rainbow gradients.** Do not use generic AI "purple glow" gradients.
- **NO decorative kickers or eyebrows.** Never put fake labels like `"01 // RECONNAISSANCE"` above headings; let the typography speak.
- **NO gradient text fills.** Headlines must be solid high-contrast text.
- **NO cards inside cards inside cards.** Max single-level Bento containment.
- **NO zero-offset blurry neon halos.** Shadows must be natural, soft, and directional.
- **Uniform 40px control heights.** Standardize buttons, inputs, and selects.

---

## 3. Screen Specifications for Generation

---

### Screen A: Zero-Trust Identity Gateway (Authentication)

#### Architectural Layout:
- **Composition:** Centered, distraction-free floating card (`max-w-[420px]`) centered on a 16:9 or 4:3 dark canvas with a subtle radial spotlight (`rgba(6, 182, 212, 0.05)`).
- **Brand Header:**
  - Compact rounded badge (`44x44px`, `#121622`) with electric cyan `CX` monogram.
  - Title: `CYBERGUARD-X` with a cyan `-X` accent.
  - Subtitle: `Autonomous Cyber Defense & Digital Twin Platform`.
- **Mode Switcher (21st.dev Segmented Tab):**
  - Dark pill container with two options: `Sign In` (active) and `Create Account`.
- **Form Controls:**
  - Field 1: `Operator Email` with placeholder `operator@security.local`.
  - Field 2: `Password` with inline link `Forgot password?`.
  - Primary CTA: High-contrast solid button (`#F8FAFC` background, deep dark text, 40px height, 8px radius) reading `Sign In to Console`.
- **Trust Footnote:**
  - Discreet bottom badge with a small green dot: `● Zero-Trust RBAC & Row-Level Security Enforced`.
- **Global Footer:**
  - Minimalist micro-text: `CYBERGUARD-X · Defense Platform v0.1 · Predict · Protect · Respond`.

---

### Screen B: Main Security Command Deck (Dashboard Overview)

#### Architectural Layout:
- **Top Navigation Bar (Linear Style - 58px):**
  - Left: `CX` brand badge, `CYBERGUARD-X` title, vertical hairline divider, and an Organization Dropdown (`SOC Team Alpha ●`).
  - Center: 21st.dev Segmented Tab Bar:
    `[ ⌘ Command Center ]` (Active) | `[ ⌖ Scopes & Discovery ]` | `[ ⚡ Wire NIDS ]` | `[ ⚙ Infrastructure ]`
  - Right: System Health Pill (`● ALL SYSTEMS OPERATIONAL`), Operator email (`operator@soc.alpha`), and `Sign Out` button.
- **Bento Grid Metric Strip (4 Cards):**
  1. **Active Workspace:** `SOC Team Alpha` — Badge: `DERIVED` — Subtext: `soc-team-alpha (Owner)`.
  2. **Network Boundaries:** `Scope Active` — Badge: `OBSERVED` — Link: `10.0.0.0/24 (Lab CIDR)`.
  3. **Live Wire NIDS:** `Passive Wire Sensor` — Badge: `OBSERVED` — Subtext: `Monitoring en0 · 0 drops`.
  4. **Infrastructure Cluster:** `PostgreSQL 17 RLS` — Badge: `CONNECTED` — Subtext: `FastAPI 0.1.0 · Port 8000`.
- **Continuous Intelligence Loop Matrix (6 Columns):**
  - Horizontal progress strip displaying the 6 intelligence stages:
    - `01 OBSERVE` (Live · Green tag) — Reconnaissance & wire sensor.
    - `02 UNDERSTAND` (Live · Green tag) — NIDS heuristic rules & ATT&CK.
    - `03 SIMULATE` (Phase 5 · Gray tag) — Topological NetworkX digital twin.
    - `04 PREDICT` (Phase 6 · Gray tag) — Random Forest & anomaly detection.
    - `05 DEFEND` (Phase 7 · Gray tag) — nftables/pf dynamic firewall shun.
    - `06 LEARN` (Phase 8 · Gray tag) — Analyst feedback & dataset loop.

---

### Screen C: Network Boundary Discovery & Reconnaissance

#### Architectural Layout:
- **Header:** `Network Discovery` with description: `Scope-bound active reconnaissance engine with strict CIDR allowlist enforcement.`
- **Left Panel (Boundary Management):**
  - List of approved network boundaries with monospace CIDR pills (`10.0.0.0/24`, `172.16.0.0/24`) and green `ACTIVE` status pills.
  - Inline clean form to register new subnets with uniform 40px inputs.
- **Right Panel (Scan Launcher):**
  - Target selection dropdown (restricted to authorized scope).
  - Scan Profile radio pills: `Host Discovery (-sn)` | `Top 1000 Ports (-sS)` | `Service Version (-sV)` | `OS Detection (-O)`.
  - Primary button: `Launch Authorized Discovery Scan`.
- **Lower Section (Execution History Table):**
  - Clean table with columns: `Scan ID` (`#101`), `Target CIDR` (`10.0.0.0/24`), `Profile` (`TOP PORTS`), `Provenance` (`OBSERVED`), `Status` (`COMPLETED`), `Started`, `Completed`.

---

### Screen D: Wire-Level NIDS Intrusion Telemetry

#### Architectural Layout:
- **Header:** `Live NIDS Monitor` with green indicator `● LIVE MONITORING` and interface chip `en0`.
- **Sensor Control Card:**
  - Packet counters strip: `Packets Captured: 142,850`, `Queued: 0`, `Processed: 142,850`, `Dropped: 0 (0.00%)`.
  - Interface selector field and `Stop Capture` button.
- **Real-Time Alert Feed (Threat Queue):**
  - Cards with 1px hairline borders:
    - Critical Alert: `PORT_SCAN_VERTICAL (T1046)` with a crimson pill `HIGH`.
    - Route: `192.168.1.105:54212 → 10.0.0.5:22` (Monospace).
    - Evidence: `58 connection attempts across 58 ports within 4.2s`.
    - Provenance: `DERIVED HEURISTIC`.
    - Action buttons: `Acknowledge` | `Isolate Target`.

---

## 4. Copy-Paste Image Generation Prompts

Copy and paste these exact prompts into ChatGPT (GPT-4o / DALL-E 3) or Midjourney v6:

### Prompt 1: The Zero-Trust Identity Gateway (Auth Screen)
```text
UI screenshot of a modern, ultra-high-end cybersecurity authentication web interface for a platform named "CYBERGUARD-X". Designed in the style of 21st.dev, Linear, and Clerk. Dark mode UI, background color deep charcoal-black (#080A0F) with a very subtle soft radial cyan ambient glow. 

In the center of the viewport floats a single minimalist, elegant rectangular card (420px width) made of dark slate glass (#0D1017) with a crisp 1px hairline border (rgba(255,255,255,0.08)) and soft natural drop shadow.

Inside the card:
- At the top, a clean 44px dark rounded icon container featuring an electric cyan "CX" logo.
- Bold display typography reading "CYBERGUARD-X" with a vibrant cyan "-X".
- Subtitle: "Autonomous Cyber Defense & Digital Twin Platform" in crisp muted gray.
- A sleek dark segmented tab switch with two pills: "Sign In" (active, highlighted in dark slate) and "Create Account".
- Two input fields: "Operator Email" (placeholder: operator@security.local) and "Password" with a small "Forgot password?" text link on the right. Both inputs have clean 40px height and dark border.
- A prominent, solid high-contrast primary action button reading "Sign In to Console" with a solid off-white background (#F8FAFC) and bold dark text.
- At the bottom of the card, a subtle trust indicator with a tiny emerald dot reading "Zero-Trust RBAC & Row-Level Security Enforced".

Professional SaaS UI, pixel-perfect alignment, no clutter, no cheesy purple gradients, no holographic sci-fi tropes, realistic web application design, 8k resolution, crisp typography, Figma UI design.
```

### Prompt 2: The Command Center Deck (Main Dashboard)
```text
UI screenshot of an elite dark-mode cybersecurity command center web dashboard named "CYBERGUARD-X". Style inspired by Linear, CrowdStrike Falcon, and 21st.dev design systems. 

Layout details:
- Top Navigation Bar (58px height, deep black-slate background with 1px border): Left has a small "CX" logo mark, "CYBERGUARD-X" title, and a workspace dropdown "SOC Team Alpha". Center has a sleek segmented control with tabs: "[Command Center] [Scopes & Discovery] [Wire NIDS] [Infrastructure]". Right has an emerald status indicator "ALL SYSTEMS OPERATIONAL" and user profile "operator@soc.alpha".
- Main Viewport: Clean Bento grid layout with 4 modern metric cards across the top:
  1. "ACTIVE WORKSPACE" displaying "SOC Team Alpha" with an amber "DERIVED" tag.
  2. "NETWORK BOUNDARIES" displaying "10.0.0.0/24 Active" with a teal "OBSERVED" badge.
  3. "LIVE WIRE NIDS" displaying "Passive Sensor: en0" with green pulse dot.
  4. "INFRASTRUCTURE" displaying "PostgreSQL 17 RLS" with "FastAPI · Port 8000".
- Below the metrics, a horizontal "Defense Intelligence Loop" matrix with 6 modular cards: "01 OBSERVE (LIVE)", "02 UNDERSTAND (LIVE)", "03 SIMULATE (PLANNED)", "04 PREDICT (PLANNED)", "05 DEFEND (PLANNED)", "06 LEARN (PLANNED)".
- Dark void background (#080A0F), card surfaces in dark obsidian (#0D1017) with hairline borders (rgba(255,255,255,0.08)), high-contrast white typography, electric cyan accents (#06B6D4), and emerald operational indicators. 

Authentic production-grade enterprise software, perfectly aligned data grid, no cartoonish elements, no generic AI purple mesh, clean Figma design, 8k, sharp focus.
```

### Prompt 3: Real-Time Wire NIDS & Intrusion Telemetry
```text
UI screenshot of a specialized real-time Network Intrusion Detection System (NIDS) telemetry screen for "CYBERGUARD-X". Modern dark theme (#080A0F).

Top bar shows "Live NIDS Monitor" with an active pulsing emerald dot reading "LIVE MONITORING: interface en0" and a teal badge "OBSERVED WIRE DATA".
Upper section features a 4-metric packet telemetry strip: "Captured: 142,850 pkts", "Queue Depth: 0", "Processed: 142,850", "Dropped: 0 (0.00%)".
Main body displays a clean, high-density threat alert table and stream:
- Threat alert card with a crimson left accent line and red badge "CRITICAL / HIGH":
  - Title: "PORT_SCAN_VERTICAL (MITRE ATT&CK T1046)"
  - Telemetry: Source "192.168.1.105:54212" -> Target "10.0.0.5:22" in monospace font.
  - Evidence note: "58 probe packets across 58 destination ports within 4.2 seconds".
  - Actions: "[Acknowledge]" button and "[Isolate Host]" button.
- Secondary alert: "SYN_FLOOD_ANOMALY" with amber warning badge.
- High visual density, crisp typography, clean dark slate card containers, monospace IP addresses and timestamps, no decorative fluff, authentic SOC security dashboard aesthetic.
```
