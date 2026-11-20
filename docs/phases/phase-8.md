# Phase 8 — LEARN
**Lead:** M2 · **Gate:** `./scripts/check-phase.sh 8` · **Design refs:** `04-twin-ml`, `06-threat-model` (T3)

## Milestones
- **8.1 [MVP]** Analyst verdicts on findings and predictions (`CONFIRMED` / `FALSE_POSITIVE`) stored as `feedback_labels` with actor and timestamp.
- **8.2 [MVP]** Versioned dataset export built only from verified labels, with a provenance manifest (which findings, which flows, who verified).
- **8.3 [STRETCH]** Controlled retraining and a model comparison report; promotion only with user approval.
- **8.4 [STRETCH]** Drift monitoring (feature distribution shift, rolling precision from verdicts).

## Acceptance tests (marker `phase8`)
`test_unverified_not_labelled`, `test_dataset_manifest_traceable`, `test_feedback_requires_analyst_role`.

## Exit criteria
- The gate passes.
- A dataset export exists and every row traces back to a verdict.
