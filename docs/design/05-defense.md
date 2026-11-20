# 05 — Defend & Automate

## Lifecycle
```
RECOMMENDED ──approve──▶ APPROVED ──execute──▶ EXECUTING ──▶ SUCCEEDED ──rollback──▶ ROLLED_BACK
     │                        │                    └──────▶ FAILED ───rollback──▶ ROLLED_BACK
     └──reject──▶ REJECTED    └──timeout──▶ EXPIRED
```
Every transition writes to `audit_logs` (actor, from, to, reason, ts).

## Executor interface
```python
class Executor(Protocol):
    type: str
    def validate(self, action, ctx) -> None        # scope, allowlist, params
    def dry_run(self, action, ctx) -> DryRunResult # what would change
    def snapshot_pre_state(self, action, ctx) -> dict
    def execute(self, action, ctx) -> ExecResult
    def verify(self, action, ctx) -> VerifyResult  # did it actually take effect?
    def rollback(self, action, ctx) -> ExecResult
```
The orchestrator runs these steps in order:
1. Check `system_flags.emergency_stop`.
2. `validate`.
3. `dry_run` (shown at approval time).
4. `snapshot_pre_state`.
5. `execute`, under a timeout.
6. `verify`.
7. Schedule a TTL rollback if the action is time-limited.

## Executors
| Type | Tier | Target | Mechanism |
|---|---|---|---|
| `notify` | MVP | users | In-app notification (email or webhook is STRETCH) |
| `fw_block` | MVP | **lab gateway or host only** | Backends: **nftables** for Linux lab hosts (default for the Docker lab) and **pf** for a macOS gateway (a dedicated anchor `cyberguard/<action_id>`). Add the rule with a TTL; verify by listing the rules and running a connection test from the attacker node; roll back by deleting the rule or flushing the anchor |
| `isolate_lab_container` | STRETCH | lab Docker container | `docker network disconnect`; verify by ping; roll back by reconnecting |

- Executors that touch a host run through a **small privileged helper** on the lab host, which accepts only signed, allowlisted commands. The API and worker never run pf directly as root.
- The developer's own Mac is never a target.

## Guardrails
- Only `ADMIN` or `OWNER` can approve, and the requester can't approve their own action (four-eyes), unless the org has a single member and records that in an ADR.
- Per-org **allowlist** of executor types and target CIDRs.
- Blocks have a default TTL of 15 min and a maximum of 24 h.
- `Idempotency-Key` is required on execute.
- **Emergency stop:** a DB flag set from the UI. Every executor checks it before `execute`, and setting it also triggers a rollback of all active TTL actions.
- Autonomous mode is `[STRETCH]`: only `notify` plus `fw_block` with TTL ≤ 15 min, only in the lab scope, only for findings of level ≥ `SUSPECTED`, and switched on per org by the Owner.

## Recommendations
These are generated from findings and risk by a rules table: finding type → suggested action + rationale. Each recommendation links to its finding and shows the dry-run result before approval.
