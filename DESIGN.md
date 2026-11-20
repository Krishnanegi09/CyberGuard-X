# CYBERGUARD-X — Design System & UI Specification

**Version:** 1.0.0  
**Specification Level:** Enterprise Security Operations Center (SOC)  
**Standard:** Anti-Slop, High-Precision, Restrained Dark Interface (Operate Mode)

---

## 1. Design Tokens & Color Palette

The color system avoids harsh pure blacks, rainbow gradients, and excessive neon halos. Surfaces use dark charcoal and slate with strict 1px hairline dividers.

| Token | Hex / Value | Semantic Role |
|---|---|---|
| `--bg-canvas` | `#0B0D10` | Global application backdrop. |
| `--bg-sidebar` | `#0E1116` | Left navigation surface with 1px right border. |
| `--bg-surface` | `#14171C` | Primary card surfaces (Bento grid). |
| `--bg-surface-elevated`| `#1B1F25` | Hover states, active navigation pills, dropdown menus. |
| `--bg-surface-subtle` | `#111419` | Inset containers, table headers, chart backgrounds. |
| `--border-subtle` | `rgba(255, 255, 255, 0.07)` | Hairline structural dividers (1px). |
| `--border-hover` | `rgba(255, 255, 255, 0.15)` | Interactive element hover boundary. |
| `--text-primary` | `#F2F4F6` | High-contrast display and primary headings. |
| `--text-secondary` | `#A4ABB5` | Body copy, labels, metadata, secondary timestamps. |
| `--text-muted` | `#667080` | Subtle indicators, shortcuts, disabled states. |
| `--accent-cyan` | `#00F0FF` / `#06B6D4` | Primary brand accent, selected focus rings. |
| `--accent-critical` | `#EF4444` / `#FF3856` | Critical findings, threat spikes, active intrusions. |
| `--accent-high` | `#F59E0B` | High severity alerts, suspicious anomalies. |
| `--accent-medium` | `#94A3B8` / `#CBD5E1`| Medium severity indicators, neutral alerts. |
| `--accent-low` | `#10B981` | Nominal telemetry, verified scopes, healthy sensors. |

---

## 2. Typography

- **Display & Headings:** `Space Grotesk` / `Inter Display` — Semi-bold / Bold, letter spacing `-0.025em`.
- **UI & Controls:** `Inter` — Weights 400 (regular), 500 (medium), 600 (semi-bold). 13px / 14px base.
- **Telemetry & Technical Data:** `JetBrains Mono` — Strictly applied to IP addresses (`10.0.0.12`), CIDRs (`10.0.0.0/24`), ports (`54212`), hashes, CVEs (`CVE-2024-38077`), and MITRE ATT&CK techniques (`T1046`).

---

## 3. Elevation & Surfaces

- **Surface 0 (Canvas):** `#0B0D10`
- **Surface 1 (Card/Bento):** `#14171C`, border: `1px solid rgba(255, 255, 255, 0.07)`, radius: `12px`.
- **Surface 2 (Elevated):** `#1B1F25`, border: `1px solid rgba(255, 255, 255, 0.12)`, radius: `8px`.
- **Surface 3 (Modal / Drawer / Tooltip):** `#181C22`, box-shadow: `0 20px 40px rgba(0, 0, 0, 0.6)`.

---

## 4. Component Standards

1. **Navigation Sidebar:**
   - Width: `240px` desktop, collapsible to `64px` on tablet, slide-over drawer on mobile.
   - Section headers in subtle uppercase: `OPERATE`, `AUTOMATE`, `INSIGHTS`.
   - Active state: `#1B1F25` background with high-contrast text and icon.
   - Numerical badges for unread findings (`24`) and active incidents (`3`).
   - Bottom workspace switcher showing active organization and tenant environment.

2. **Hero Header:**
   - Dark celestial globe visualization on the upper right with subtle atmospheric rim curve.
   - High-contrast typography: `"Continuous defense for your digital infrastructure."`
   - Secondary subtitle: `"Observe • Understand • Simulate • Defend • Learn"`.
   - Embedded 4-metric KPI strip (`Critical`, `High`, `Medium`, `Low`).

3. **Data Visualizations:**
   - **Threat Activity:** SVG area spline with crimson gradient fill, dual axis, and interactive hover tooltip pin.
   - **Digital Twin:** Isometric topological network view with servers, databases, workstations, and animated data links.
   - **Asset Risk:** Donut chart with centered asset counter (`124 Assets`) and labeled legend.

4. **Provenance Badges:**
   - Every finding and record visibly displays:
     - `OBSERVED`: Emerald green outline
     - `DERIVED`: Amber/cyan outline
     - `PREDICTED`: Purple/blue outline
     - `SIMULATED`: Orange outline

5. **Guardrailed Controls:**
   - Four-Eyes approval dialog for defensive actions.
   - Emergency Stop kill switch with double confirmation modal.
   - Standardized 38–40px control heights for all inputs and buttons.
