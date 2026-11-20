# Phase 9 — Polish, Reports & Delivery
**Lead:** M3 (all contribute) · **Gate:** `./scripts/check-phase.sh 9` · **Design refs:** `10-ui`, `06-threat-model`, `07-nfr`, `09-ethics-legal`, `docs/ACADEMIC_MAPPING.md`, `docs/DEMO_RUNBOOK.md`

## Milestones
- **9.1 [MVP]** UI polish: both themes, and every view in its loading, empty and error states; accessibility pass.
- **9.2 [MVP]** Reports: scan, incident and ML evaluation (HTML or Markdown; PDF is STRETCH).
- **9.3 [MVP]** Hardening: rate limits, `pip-audit` and `npm audit` clean (Q2), `gitleaks` clean, error-handling review, and an independent security review subagent run against `06-threat-model.md`.
- **9.4 [MVP]** Docs: architecture, ERD (generated from the models), API (OpenAPI export), deployment, `LAB.md`, user guide, `PERF.md` with every NFR measured.
- **9.5 [MVP]** The demo runbook rehearsed twice from a reset lab; the fallback pcaps verified; the project report and slides drafted from `ACADEMIC_MAPPING.md`.

## Acceptance (marker `phase9`)
The full suite of earlier markers passes, plus `test_vertical_slice_e2e` and `test_demo_runbook_smoke`.

## Exit criteria
- The gate passes.
- Setup on a clean machine works from the docs alone (a teammate follows them).
- Every row of the threat model has a passing test or a documented residual risk.
