# Phase 6 — PREDICT & DECIDE (ML)
**Lead:** M2 · **Gate:** `./scripts/check-phase.sh 6` · **Design refs:** `04-twin-ml` (ML plan, risk v2), `08-lab` (scenarios), `07-nfr` P8 · **Skill:** `ml-experiment`

## Milestones
- **6.1 [MVP]** Dataset cards: `ml/datasets/lab-v1/DATASET_CARD.md` (scripted and labelled) and a public dataset card with the feature-parity table.
- **6.2 [MVP]** The pipeline: shared `ml/features/`, time and session splits, `make train` / `make evaluate`, and the `model_versions` registry.
- **6.3 [MVP]** Models: LR baseline → RF/XGBoost; Isolation Forest per asset class.
- **6.4 [MVP]** The evaluation report with three separate tables (public, lab, cross-domain) and a limitations section.
- **6.5 [MVP]** An inference worker; predictions with `PREDICTED` provenance and model version; risk score v2.
- **6.6 [STRETCH]** SHAP explanations; probability calibration (`calibrated=true` only if it's done).

## Acceptance tests (marker `phase6`)
`test_no_session_leakage_in_split`, `test_feature_code_shared_train_infer`, `test_prediction_has_model_version`, `test_rule_not_labelled_ml`, `test_evaluate_reproducible` (same seed → same metrics).

## Exit criteria
- The gate passes.
- `ml/reports/*.md` exists with real numbers from `make evaluate`.
- A model kept beyond the baseline beats LR on macro-F1 on held-out lab data. If none does, say so honestly and keep LR.
- P8 is measured.
