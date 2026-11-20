---
name: ml-experiment
description: Use for any CYBERGUARD-X model training, evaluation, dataset creation or model promotion. Enforces dataset cards, leakage-safe splits, baselines, separate public/lab reporting and the model registry.
---

# ml-experiment

Design reference: `docs/design/04-twin-ml.md`. Honest-ML rules: `CLAUDE.md` rule 9.

1. **Dataset card first:** `ml/datasets/<name>-vN/DATASET_CARD.md` covering source, licence, collection method (lab scenario scripts and session ids), label definitions, class counts, a feature-parity table (public datasets), known issues, and the date.
2. **Features:** only through `ml/features/`, the same module that inference imports. No feature that inference can't compute.
3. **Split by time or capture session.** Assert in code that no `session_id` appears in more than one split. Fix the seed.
4. **Baseline first:** Logistic Regression. Every other model is compared against it on macro-F1 over the same held-out split.
5. **Evaluate:** `make evaluate` writes `ml/reports/<model>-<version>.md` containing:
   - per-class and macro precision, recall and F1; FPR and FNR; ROC-AUC; confusion matrix; p50/p95 latency;
   - separate tables for **public→public**, **lab→lab** and **public→lab (cross-domain)**;
   - a **Limitations** section.
6. **Register:** insert a `model_versions` row with the git sha, dataset version, metrics JSON and `status='candidate'`.
7. **Promote to `active` only after the user approves**, quoting the report numbers.
8. **Never:** report training-set metrics as results · tune on the test set · call a rule ML · put `calibrated=true` without calibration.
