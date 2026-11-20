# CONTRACTS

These are the shared definitions every workstream must respect. Change them only in the main session, *before* parallel sessions branch off, then regenerate the TS client.

## Enums
```python
class Provenance(str, Enum):   OBSERVED = "OBSERVED"; DERIVED = "DERIVED"; PREDICTED = "PREDICTED"; SIMULATED = "SIMULATED"
class ScanStatus(str, Enum):   QUEUED; RUNNING; COMPLETED; FAILED; CANCELLED
class ScanProfile(str, Enum):  DISCOVERY; TOP_PORTS; SERVICE; OS
class AssetState(str, Enum):   NEW; KNOWN; CHANGED; UNREACHABLE
class AssetCriticality(str, Enum): LOW; MEDIUM; HIGH; CROWN_JEWEL
class DetectionMethod(str, Enum):  RULE; STATISTICAL; ML
class FindingLevel(str, Enum): OBSERVATION; INDICATOR; SUSPECTED; CONFIRMED_INCIDENT
class FindingStatus(str, Enum): OPEN; INVESTIGATING; CONFIRMED; DISMISSED; FALSE_POSITIVE
class Severity(str, Enum):     INFO; LOW; MEDIUM; HIGH; CRITICAL
class ActionStatus(str, Enum): RECOMMENDED; APPROVED; REJECTED; EXPIRED; EXECUTING; SUCCEEDED; FAILED; ROLLED_BACK
class JobStatus(str, Enum):    QUEUED; RUNNING; SUCCEEDED; FAILED; CANCELLED; DEAD
class Role(str, Enum):         OWNER; ADMIN; ANALYST; VIEWER
class CaptureSourceKind(str, Enum): LIVE; REPLAY
```

## Role permissions (summary)
| Capability | Viewer | Analyst | Admin | Owner |
|---|---|---|---|---|
| Read assets, findings, twin | ✓ | ✓ | ✓ | ✓ |
| Start scan / capture (in scope) | | ✓ | ✓ | ✓ |
| Triage findings, give feedback | | ✓ | ✓ | ✓ |
| Run simulations | | ✓ | ✓ | ✓ |
| Approve / execute / roll back actions | | | ✓ | ✓ |
| Edit scope, sensors, members | | | ✓ | ✓ |
| Emergency stop | | | ✓ | ✓ |
| Delete org, transfer ownership | | | | ✓ |

## API conventions
- Base path: `/api/v1`. JSON only. Timestamps are ISO-8601 UTC (`...Z`).
- Auth: `Authorization: Bearer <Firebase ID token>`. Sensors use `Authorization: Sensor <token>`.
- Org context: `X-Org-Id` header, **checked against the caller's memberships** (it is never trusted on its own).
- Error envelope:
  ```json
  { "error": { "code": "SCOPE_VIOLATION", "message": "Target 10.9.0.5 is outside the allowed scope.", "details": {}, "request_id": "..." } }
  ```
- Pagination: cursor-based, `?limit=50&cursor=...` → `{ "items": [...], "next_cursor": "..." | null }`.
- `Idempotency-Key` header is **required** on `POST /scans`, `POST /defense/actions/{id}/execute` and `POST /sensors/ingest`.
- Every response item carries `provenance`.

## Queue payloads (`jobs.payload`)
```json
{ "type": "scan.run",       "scan_run_id": "uuid" }
{ "type": "detect.window",  "org_id": "uuid", "from": "ts", "to": "ts" }
{ "type": "twin.rebuild",   "org_id": "uuid" }
{ "type": "ml.infer",       "org_id": "uuid", "flow_ids": ["uuid"] }
{ "type": "action.execute", "action_id": "uuid" }
{ "type": "retention.sweep" }
```

## Sensor ingest (`POST /api/v1/sensors/ingest`)
```json
{
  "sensor_id": "uuid", "batch_id": "uuid", "sent_at": "ts",
  "stats": { "packets_seen": 0, "packets_dropped": 0, "queue_depth": 0 },
  "flows": [{ "src_ip": "", "dst_ip": "", "src_port": 0, "dst_port": 0, "proto": "TCP",
              "first_seen": "ts", "last_seen": "ts", "packets": 0, "bytes": 0, "tcp_flags": "SA" }],
  "packet_samples": [{ "ts": "ts", "src_ip": "", "dst_ip": "", "proto": "", "length": 0, "reason": "" }]
}
```
`batch_id` makes ingest idempotent: a re-sent batch is ignored.

## WebSocket events (`/api/v1/ws`, org-scoped)
`scan.updated` · `asset.changed` · `flow.batch` · `finding.created` · `finding.updated` · `twin.rebuilt` · `action.updated` · `sensor.health`
Envelope: `{ "event": "finding.created", "org_id": "...", "id": "...", "ts": "..." }`. Clients re-fetch by `id`; events never carry the full data.
