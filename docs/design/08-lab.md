# 08 — Lab Environment

The lab is the **only** place where scans, captures, attack simulation scripts and defensive actions run. Everything about it is recorded in `docs/LAB.md` (create it from this design in Phase 1.8).

## Option A: Docker lab on the Mac (default, cheapest)
```
docker network: cgx-lab  (e.g. 172.30.0.0/24)  ← this CIDR is the org scope allowlist
  ├─ cgx-sensor      (sensor agent, NET_ADMIN + NET_RAW, sniffs the lab bridge)
  ├─ cgx-gw          (Alpine/Debian + pf-equivalent nftables, privileged helper for blocks)
  ├─ target-web      (deliberately outdated web app, ARM64 image)
  ├─ target-ssh      (OpenSSH with a weak *test-only* password)
  ├─ target-db       (Postgres/MySQL with a port exposed inside the lab)
  ├─ crown-files     (file server marked CROWN_JEWEL)
  └─ attacker        (nmap, hydra, python scripts — talks only to the lab network)
```
- Docker Desktop hides bridge traffic from macOS, so **the sensor must run inside `cgx-lab`** (or use `network_mode: "service:cgx-gw"`).
- Put everything in `lab/docker-compose.yml`, with no published ports except the sensor → API path. Run with `make lab-up`, `make lab-down` and `make lab-reset`.
- On these Linux lab hosts, the `fw_block` executor uses its nftables backend (see `05-defense.md`).

## Option B: physical mini-lab (more realistic, optional)
- A spare router not connected to college or home networks, a Raspberry Pi or old laptop as targets, and the Mac on a USB-Ethernet adapter running the sensor on that interface.
- Use this if examiners expect "real hardware".

## Images (Apple Silicon)
Prefer multi-arch or ARM64 images. Classic x86 VMs such as Metasploitable 2 run only under slow emulation in UTM. Avoid them, or use them only as a single optional host.

## Labelled activity scripts (`lab/scenarios/`)
| Script | Label | What it does (lab targets only) |
|---|---|---|
| `benign_baseline.py` | `BENIGN` | Simulated user activity: HTTP browsing on target-web, DB queries, file fetches |
| `scan_vertical.sh` | `SCAN` | `nmap -sS -p- target-web` |
| `scan_sweep.sh` | `SCAN` | `nmap -sn 172.30.0.0/24` |
| `bruteforce_ssh.sh` | `BRUTE_FORCE` | `hydra` with a small wordlist against target-ssh |
| `beacon.py` | `BEACON` | Regular-interval HTTP to a lab "C2" container |

Each script writes `lab/labels/<session_id>.csv` (`start,end,src,dst,label`) used to build ML datasets, and saves a pcap to `lab/captures/<session_id>.pcap` for replay tests and the demo fallback.

## Safety
- The lab network has no route to anything outside it. Verify with `docker network inspect` and a failing `curl` to the internet from the attacker container.
- The weak passwords exist only in lab containers and are listed in `lab/README.md` as test-only.
- Never point lab scripts at any address outside the lab CIDR. Scripts refuse targets outside it.
