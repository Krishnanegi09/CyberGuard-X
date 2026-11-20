# CYBERGUARD-X — Lab Environment Specification

**Version:** 1.0  
**References:** `docs/design/08-lab.md`, `docs/phases/phase-1.md` (Milestone 1.8)

---

## 1. Architecture & Isolation
The lab is an isolated, reproducible testing range designed for live reconnaissance, BPF packet capture, attack trajectory evaluation, and automated countermeasure enforcement without external exposure.

```text
Docker Network: cgx-lab (172.30.0.0/24, internal: true)
  ├─ cgx-sensor   (172.30.0.2)   - Sensor daemon with BPF / libpcap (NET_ADMIN, NET_RAW)
  ├─ cgx-gw       (172.30.0.10)  - Simulated perimeter gateway & nftables/pf filter
  ├─ target-web   (172.30.0.12)  - Nginx web server representing DMZ perimeter
  ├─ target-ssh   (172.30.0.18)  - Internal management host
  ├─ target-db    (172.30.0.35)  - PostgreSQL 16 representing Crown Jewels database
  └─ attacker     (172.30.0.105) - Controlled reconnaissance origin executing Nmap/Scapy
```

---

## 2. Network Isolation Guarantees
- **Air-Gapped Bridge:** `cgx-lab` is configured with `internal: true`. Containers cannot reach the public Internet or host LAN interfaces.
- **Strict CIDR Allowlist:** All reconnaissance and defense engines enforce scope restriction to `172.30.0.0/24` (or approved lab subnet `10.0.0.0/24`). Targets outside configured scopes are rejected at API ingress with HTTP 400.

---

## 3. Operational Commands
- `docker compose -f lab/docker-compose.yml up -d`: Launch lab containers.
- `docker compose -f lab/docker-compose.yml down`: Tear down lab environment.
- `docker compose -f lab/docker-compose.yml ps`: Inspect live lab container status.

---

## 4. Test Scenarios (`lab/scenarios/`)
- `benign_baseline`: Normal HTTP GET/POST queries to `172.30.0.12` and internal DB transactions.
- `scan_vertical`: Rapid SYN probe sweeps simulating MITRE ATT&CK T1046.
- `bruteforce_ssh`: Rate-limited authentication probing on `172.30.0.18:22`.
