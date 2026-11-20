# 07 — Non-Functional Requirements (measurable targets)

These targets apply on the **demo setup**: MacBook Air M4, local Postgres 17, and a lab of 5–20 hosts. Measure each one, record it in `docs/PERF.md`, and report the real number even when it misses the target.

| ID | Requirement | Target | How to measure |
|---|---|---|---|
| P1 | Sensor sustained capture without drops | ≥ 5,000 pkt/s, drop rate < 1% | `tcpreplay --mbps` a lab pcap; read the sensor stats |
| P2 | Flow ingest throughput (API → DB) | ≥ 2,000 flows/s | load script posting batches; `SELECT count(*)` over time |
| P3 | Detection latency (flow seen → finding visible) | p95 ≤ 10 s | timestamp diff: `flow.last_seen` → `finding.created_at` → WS event |
| P4 | `DISCOVERY` scan of a /24 | ≤ 2 min | `scan_runs` start/finish |
| P5 | `TOP_PORTS` scan of 10 hosts | ≤ 5 min | `scan_runs` |
| P6 | Dashboard first load (warm) | ≤ 2 s | browser devtools / Lighthouse |
| P7 | API p95 latency for list endpoints (≤ 50 items) | ≤ 300 ms | `locust` or `hey` |
| P8 | ML inference latency per flow batch of 500 | p95 ≤ 200 ms | `evaluate.py` latency section |
| P9 | Twin rebuild for 50 nodes / 500 edges | ≤ 5 s | job duration |
| P10 | Attack-path search (k = 5, depth 6) on that graph | ≤ 2 s | job duration |
| R1 | Backend restart loses no committed data; the sensor buffers | 0 lost batches over a 60 s outage | kill the API; replay; check `batch_id`s |
| R2 | Stuck job recovery | the reaper requeues within `timeout_s + 60 s` | kill a worker mid-job |
| R3 | WebSocket reconnect | the UI catches up within 5 s after a reconnect | toggle the network |
| R4 | Emergency stop takes effect | ≤ 2 s; active TTL blocks rolled back ≤ 30 s | acceptance test |
| S1 | Storage growth at the demo traffic rate | ≤ 1 GB / week with default retention | `pg_total_relation_size` |
| Q1 | Backend test coverage on `services/` and `workers/` | ≥ 70% lines | `pytest --cov` |
| Q2 | Zero high or critical dependency vulnerabilities at release | 0 | `pip-audit`, `npm audit` |

When a target turns out to be unrealistic, change it with an ADR. Don't quietly drop it.
