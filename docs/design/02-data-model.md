# 02 — Data Model

> These are proposed names. **Inspect the existing models first, and extend them rather than renaming them.** Add a table only when a milestone needs it. Enums live in `docs/CONTRACTS.md`.

## Entities by stage
| Stage | Entities |
|---|---|
| Cross-cutting | `users`, `organizations`, `memberships(role)`, `scopes(cidr)`, `jobs`, `audit_logs`, `system_flags(emergency_stop)` |
| Observe | `sensors`, `capture_sessions(source LIVE|REPLAY, pcap_ref)`, `scan_runs`, `assets(criticality, tags)`, `asset_interfaces`, `port_observations`, `asset_changes`, `flows`, `packet_samples` |
| Understand | `detections`, `findings`, `finding_evidence`, `vulnerability_findings`, `cve_entries` (mirror), `attack_techniques`, `incidents` |
| Simulate | `twin_snapshots`, `twin_nodes`, `twin_edges`, `simulation_runs`, `attack_paths` |
| Predict | `model_versions`, `predictions`, `risk_scores` |
| Defend | `recommendations`, `defensive_actions`, `approvals` |
| Learn | `feedback_labels`, `datasets`, `evaluations` |

## Required fields
- **Finding:** `id, org_id, asset_id?, flow_ids[] (via finding_evidence), method, rule_id|model_version_id, severity, confidence, level, status, first_seen, last_seen, hit_count, explanation, recommended_action, provenance`.
  Duplicate hits on the same `(org, rule, asset, window)` increase `hit_count` and update `last_seen`.
- **Prediction:** `model_version_id, feature_hash, input_refs, ts, label, score, calibrated bool, top_features jsonb, eval_status, provenance='PREDICTED'`.
- **Defensive action:** `type, target, params, requested_by, approved_by, idempotency_key, timeout_s, ttl_s, pre_state jsonb, result, verification jsonb, status`.
- **Simulation output:** `snapshot_id` always set, `provenance='SIMULATED'`.

## Rules
- UUID primary keys. `timestamptz` stored in UTC. `org_id NOT NULL` and indexed on every tenant table.
- Foreign keys enforced. Natural-key uniqueness, for example `(org_id, scan_run_id, ip)` on observations.
- **Append-only history:** observations are never updated in place. The "current" state is a view or a latest pointer.
- `audit_logs`: the app DB role has `INSERT, SELECT` only. A trigger blocks `UPDATE` and `DELETE`.
- Column changes follow **expand → backfill → switch reads → contract**, across separate migrations.

## Volume and retention
| Table | Partitioning | Default retention |
|---|---|---|
| `flows` | monthly range on `first_seen` | 30 days (configurable per org) |
| `packet_samples` | monthly range on `ts` | 7 days; payload snippet ≤ 128 bytes or none |
| `jobs` | — | finished jobs kept 14 days |
| `audit_logs` | — | never deleted automatically |
| everything else | — | kept |

A `retention.sweep` job drops expired partitions. It never runs row-by-row deletes on large tables.

## Row-Level Security
```sql
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON assets
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);
```
- The session dependency runs `SET LOCAL app.org_id = :org` inside each transaction.
- Workers set it per job.
- The migration role bypasses RLS; the app role does not.
- Every new tenant table needs a policy in the same migration. The `rls-check` skill verifies this.
