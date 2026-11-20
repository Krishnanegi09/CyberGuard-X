# 04 — Digital Twin & ML

## Digital twin
- A **snapshot** is an immutable, versioned copy built by `twin.rebuild` from the current assets, open ports, potential vulnerabilities, observed flows (the reachability edges), scopes and trust zones, and manual criticality.
- Graph library: **NetworkX**, built in memory per request or job and persisted as `twin_nodes` / `twin_edges`.
- Nodes are assets and their services. Edges are `REACHES(src, dst, port)` from observed flows or scans, and `IN_ZONE`.
- Trust zones are CIDR groups or manual tags (for example `dmz`, `internal`, `crown`).

## Attack-path analysis (simplified, MulVAL-style)
- **Entry nodes:** a chosen attacker position (for example the lab attacker host or "any internet-facing asset").
- **Targets:** assets with criticality `HIGH` or `CROWN_JEWEL`.
- **Edge cost:** `1 / (exploitability × exposure)`, where exploitability comes from the CVSS of potential CVEs on the destination service (a floor value when there's none) and exposure is 1.0 for an observed flow and 0.5 for a port that is open but unused.
- Run k-shortest simple paths (`nx.shortest_simple_paths`, capped at k = 5 and depth 6). Path score = product of the edge probabilities.
- Output `attack_paths` with steps, score and `snapshot_id`, `provenance='SIMULATED'`.

## What-if scenarios
- Copy the snapshot → apply mutations (`close_port`, `remove_edge`, `segment_zone`, `patch_cve`) → recompute paths → diff (paths removed or added, max-score change).
- Store each one as a `simulation_run` with its mutations and results. **It never touches the real network.**

## ML plan
### Objective
Model A is a **supervised flow classifier**: benign vs. scan, brute-force or beacon (multi-class).
Model B is **per-asset anomaly detection** (unsupervised).

### Data
1. **Lab ground truth (primary).** Record a benign baseline (≥ 2 sessions), then run scripted activity from the attacker node against lab targets only. Each script writes a label manifest `(session_id, start, end, src, dst, label)`, and flows are labelled by joining on it. Keep in `ml/datasets/lab-vN/` with a `DATASET_CARD.md`.
2. **Public supplement.** CIC-IDS2017 or UNSW-NB15. Use only the features your flow tracker also computes (feature parity table in the card). Document the licence, age and known labelling problems.

### Features (shared `ml/features/`, imported by training *and* inference)
Duration, packets and bytes each way, bytes per packet, TCP flag counts, dst port bucket, inter-arrival mean and std, plus per-source window features (distinct ports and hosts in the last 60 s).

### Method
- **Splits by time and capture session**, never random within one session (that leaks data).
- Baseline Logistic Regression → Random Forest → XGBoost. Keep a model only if it beats the baseline on macro-F1 on the held-out set.
- Isolation Forest per asset class, trained on benign lab baseline windows.
- Use a fixed seed and log the environment so `make train && make evaluate` reproduces the result.

### Evaluation report (`ml/reports/<model>-<version>.md`)
Precision, recall, F1 (per class and macro), FPR, FNR, ROC-AUC, confusion matrix, and p50/p95 inference latency, in **three separate tables**:
- public → public;
- lab → lab;
- public → lab (cross-domain).

Add a limitations section.

### Serving
- The `ml.infer` job loads the `model_versions` row marked `active`, scores new flows, and writes `predictions` with provenance `PREDICTED`.
- Promotion to `active` needs the user's approval.
- Explanations come from the top features (importances; SHAP is `[STRETCH]`). An LLM summary is `[STRETCH]`, optional, and must cite evidence IDs.

## Risk score
- **v1 (`DERIVED`, Phase 2):** `risk(asset) = criticality_w × max(severity_w of open findings) × (1 + 0.1 × open_finding_count) × exposure_w`, normalised to 0–100. The formula is documented in the UI tooltip.
- **v2 (Phase 6):** adds the attack-path score to the asset and the ML anomaly score. Each component is shown separately so the score stays explainable.
