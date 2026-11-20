# CYBERGUARD-X — Automated Discovery Scan Report

**Organization ID:** `org-democorp-01`  
**Execution Timestamp:** 2026-11-19T14:20:00Z  
**Scan Scope:** `10.0.0.0/24` (Lab DMZ Boundary)  
**Profile:** `host_discovery` + `service_banner`  
**Scanner Engine:** Nmap 7.95 (SYN Stealth)  

---

## Executive Summary
Active network discovery completed against the approved boundary `10.0.0.0/24`. All scans were bounded within authorized CIDR boundaries per multi-tenant scope definitions.

- **Total IPs Scanned:** 254
- **Live Hosts Discovered:** 3
- **Exposed Open Ports:** 6
- **Highest Criticality Asset:** `srv-app-core.sec.local` (10.0.0.12, CROWN_JEWEL)

---

## Discovered Assets & Services

| Hostname | IP Address | MAC Address | OS Fingerprint | Open Ports / Banners |
|---|---|---|---|---|
| `srv-app-core.sec.local` | `10.0.0.12` | `00:1a:2b:3c:4d:5e` | Ubuntu Linux 24.04 LTS | 21/tcp (vsftpd 2.3.4), 22/tcp (OpenSSH 9.6p1) |
| `operator-station.soc.local` | `10.0.0.44` | `00:1a:2b:3c:4d:9a` | macOS Sonoma 14.6 | 22/tcp (OpenSSH 9.4) |
| `gw-perimeter.dmz.local` | `10.0.0.254` | `00:1a:2b:3c:4d:ff` | FreeBSD 14 / pfSense | 80/tcp (pfSense WebGUI), 443/tcp (pfSense WebGUI) |

---

## Findings & Risk Corroboration
1. **Unencrypted FTP Exposure:** Port 21 open on `10.0.0.12` with banner matching vulnerable vsftpd.
2. **Attack Path Risk:** Digital twin lateral movement identifies port 21 as entry point for ingress compromise.
3. **Recommended Action:** Execute dynamic firewall block (`fw_block`) on port 21 via automated Defense module.
