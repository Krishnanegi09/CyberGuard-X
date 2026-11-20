# 06 — Threat Model of CYBERGUARD-X Itself (STRIDE)

A security platform is itself a high-value target: it holds network maps, vulnerability lists and the power to block traffic. Review this table at the end of every phase and add rows as features land.

## Assets worth protecting
Network inventory and topology · vulnerability findings · captured flows and packet samples · defensive-action capability · Firebase service-account key · sensor tokens · ML models and datasets · audit logs.

## Trust boundaries
1. Browser ↔ API
2. Sensor ↔ API
3. API/Worker ↔ Postgres
4. Worker ↔ external tools (nmap, executors, privileged helper)
5. Worker ↔ the internet (CVE feed)

## STRIDE table
| # | Threat | Where | Mitigation | Test |
|---|---|---|---|---|
| S1 | Spoofed user (forged or expired token) | Browser→API | Admin SDK verification, revocation check on sensitive routes | `test_invalid_token`, `test_revoked_token` |
| S2 | Spoofed sensor injecting fake flows | Sensor→API | Per-sensor token (hashed at rest), revocable, bound to an org; TLS | `test_ingest_bad_token`, `test_ingest_wrong_org` |
| S3 | WebSocket hijack or cross-org subscription | WS | Token on connect, re-checked on refresh; server-side org filter | `test_ws_cross_org` |
| T1 | Tampering with audit logs | DB | INSERT-only grants plus a trigger; optional hash chain (`prev_hash`) `[STRETCH]` | `test_audit_immutable` |
| T2 | Ingest replay or duplication | Sensor→API | `batch_id` idempotency, `sent_at` skew window | `test_ingest_replay` |
| T3 | Poisoning ML training data | Learn | Only analyst-verified labels; dataset versioning and provenance | `test_unverified_not_labelled` |
| R1 | An admin denies approving an action | Defend | Approvals audit-logged with actor and timestamp; four-eyes rule | `test_action_audit_trail` |
| I1 | Cross-tenant data leak | API/DB | `OrgContext` plus RLS | `rls-check`, `test_cross_org_*` |
| I2 | Leak of secrets (Firebase key, DB password) | Repo/CI | `.env` gitignored, `gitleaks` in pre-commit and CI | CI gate |
| I3 | Stack traces or internals in errors | API | Error envelope; detail only in the server log | `test_error_envelope` |
| I4 | Sensitive payloads in packet samples | Sensor/DB | Metadata only by default, snippet ≤ 128 B, 7-day retention | `test_sample_payload_cap` |
| D1 | Scan or job flood | API/Worker | Rate limits per user and org; concurrency cap per org; queue depth alert | `test_rate_limit_scans` |
| D2 | Sensor overwhelms the API | Sensor→API | Batch size cap, 413 on oversize, backpressure | `test_ingest_oversize` |
| E1 | Command injection through scan targets | Worker→nmap | `ipaddress` validation, argv list, no shell | `test_scan_target_injection` |
| E2 | Scope bypass (scanning outside the allowlist) | API/Worker | Validation in both API and worker; audit on rejection | `test_scope_violation` |
| E3 | Privilege escalation through roles | API | Role checked server-side; role changes only by Admin or Owner | `test_role_escalation` |
| E4 | Abuse of the executor (blocking arbitrary hosts) | Defend | Allowlist, scope check, signed helper commands, TTL, emergency stop | `test_executor_out_of_scope` |
| E5 | API compromise leads to root | Host | API and worker unprivileged; only the sensor and helper are privileged, with minimal surface | Deployment checklist |

## Residual risks (state them honestly in the report)
- The developer laptop hosts everything during the demo, so there's no hardware separation.
- The CVE match is heuristic (CPE and version ranges).
- The ML model is trained on a small lab dataset, so it generalises poorly.
