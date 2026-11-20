---
name: no-fake-data-audit
description: Use before closing any CYBERGUARD-X milestone that touches the UI or API responses, or when asked to check for fake/mock/placeholder data. Scans production code for invented operational data.
---

# no-fake-data-audit

1. Run `.claude/skills/no-fake-data-audit/audit.sh`. It lists suspicious hits in production code, excluding `tests/`, fixtures, `*.test.*`, `*.spec.*` and `lab/`.
2. For each hit, decide:
   - **Violation:** invented hosts, IPs, ports, alerts, metrics, `Math.random()` stats, hard-coded arrays rendered as live data, fake "uptime"/"threats blocked" counters. Replace it with a real API call plus an empty state.
   - **Legitimate:** a CIDR in config, a validation regex, a doc example, `127.0.0.1` for a local bind. Add an inline `# cgx-allow: <reason>` (or `// cgx-allow: <reason>`) comment so the script skips it next time.
3. Re-run until it exits 0. Paste the final output.
