---
name: new-api-endpoint
description: Use when adding or changing a CYBERGUARD-X FastAPI endpoint. A checklist that enforces org scoping, RBAC, provenance, the error envelope, tests and client regeneration.
---

# new-api-endpoint

Follow `docs/CONTRACTS.md`. Look at an existing, working endpoint first and copy its patterns.

1. **Schema** (`app/schemas/`): request and response Pydantic models. Response items include `provenance: Provenance`. No `org_id` in request bodies; it comes from `OrgContext`.
2. **Repository** (`app/repositories/`): every query takes `org_id` from the context and filters by it (RLS is the second layer, not the only one). Parameterized queries only.
3. **Service** (`app/services/`): the business logic, with no FastAPI imports, so it can be unit-tested.
4. **Router** (`app/api/v1/<group>.py`): thin. Dependencies are `ctx: OrgContext = Depends(get_org_context)` and `require_role(Role.X)`. Use cursor pagination for lists, and `Idempotency-Key` for scan, action and ingest creation. Errors are raised as typed exceptions and mapped to the error envelope.
5. **Audit:** state-changing endpoints write an `audit_logs` entry.
6. **Long-running work:** enqueue a job, return `202` with the job or resource id. Never block the request.
7. **Tests** (minimum): happy path · cross-org denied (404, not 403, to avoid leaking existence) · wrong role denied (403) · validation error (422 envelope) · unauthenticated (401).
8. **Client:** `cd frontend && npm run gen:api`. Commit the regenerated client.
9. Run `verify-all`.
