# CYBERGUARD-X — Incident Response & Forensics Report

**Incident ID:** `INC-20261119-001`  
**Severity:** CRITICAL  
**Status:** RESOLVED (Contained & Rolled Back)  
**Detected At:** 2026-11-19T14:20:11.204Z  
**Target Asset:** `srv-app-core.sec.local` (`10.0.0.12`, Crown Jewel)  
**Attacker IP:** `192.168.1.105`  
**Detection Rule:** `RULE_PORT_SCAN_VERTICAL` (`NIDS-001`)  
**MITRE ATT&CK:** `T1046` (Network Service Discovery)  

---

## Incident Narrative
At `14:20:11.204Z`, the wire NIDS capture sensor detected a burst of 15 TCP SYN packets from external host `192.168.1.105` targeting distinct ports on crown jewel server `10.0.0.12` within a 4.2-second window.

The event matched signature `RULE_PORT_SCAN_VERTICAL` with 96% confidence score.

---

## Evidence Trail
- **Packet Capture:** `lab/captures/vertical_scan_demo.pcap`
- **Raw BPF Flow Records:**
  - `14:20:11.204`: `192.168.1.105:54101 -> 10.0.0.12:21` [TCP SYN, 60 bytes]
  - `14:20:11.248`: `192.168.1.105:54102 -> 10.0.0.12:22` [TCP SYN, 60 bytes]
  - `14:20:11.291`: `192.168.1.105:54103 -> 10.0.0.12:80` [TCP SYN, 60 bytes]
  - `14:20:11.335`: `192.168.1.105:54104 -> 10.0.0.12:443` [TCP SYN, 60 bytes]

---

## Containment & Defense Execution
1. **Four-Eyes Approval Enforced:**
   - **Requester:** Operator (`analyst@democorp.local`)
   - **Approver:** Lead (`lead@democorp.local`)
2. **Action Applied:** Dynamic Host Shun (`fw_block` with TTL 15m) dropping inbound traffic from `192.168.1.105`.
3. **Verification:** Live traffic re-probe confirmed packets from `192.168.1.105` dropped at perimeter pfSense gateway.
4. **Lifecycle:** TTL auto-expired cleanly at `14:35:11Z` and transitioned to `ROLLED_BACK`.
5. **Audit Trail:** Immutable audit log records `DEFENSE_ACTION_APPROVED` and `DEFENSE_ACTION_ROLLED_BACK`.
