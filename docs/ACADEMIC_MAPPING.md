# ACADEMIC MAPPING — report chapters ← build artifacts

Every chapter of the project report draws on files the build already produces. Keep these files current and the report is mostly assembly work. Adjust the chapter names to your university's template.

| # | Report chapter | Source artifacts in the repo | Owner |
|---|---|---|---|
| 1 | Introduction (problem, motivation, objectives, scope) | `CLAUDE.md` intro, `01-architecture.md` intelligence loop, `09-ethics-legal.md` scope | M3 |
| 2 | Literature review / related work | `docs/research/` (create it): notes on IDS (Snort, Suricata, Zeek), anomaly detection, digital twins for security, attack graphs (MulVAL), SOAR; dataset papers (CIC-IDS2017, UNSW-NB15) | M2 (+ all) |
| 3 | Requirements analysis | Functional: `docs/phases/*` milestones. Non-functional: `07-nfr.md`. Security: `06-threat-model.md` | M3 |
| 4 | System design | `01-architecture.md` (component diagram), `02-data-model.md` + a generated ERD, `CONTRACTS.md`, `DECISIONS.md` (design justifications) | M3 |
| 5 | Module design and implementation | Observe: `03` + M1 code. Understand: `03` + M2 code. Twin and ML: `04`. Defend: `05`. UI: `10`. Plus code excerpts | each lead |
| 6 | Machine-learning methodology | `ml/datasets/*/DATASET_CARD.md`, `04-twin-ml.md` ML plan, the `ml-experiment` skill | M2 |
| 7 | Testing and validation | `tests/acceptance/` list, phase gate outputs in `PROGRESS.md`, coverage report, threat-model test column | M3 |
| 8 | Results and evaluation | `ml/reports/*.md` (3 tables), `docs/PERF.md` (NFR measured vs target), rule detection rates from Phase 4, screenshots | M2 + M1 |
| 9 | Security analysis of the platform | `06-threat-model.md` (STRIDE + residual risks), review outputs | M3 |
| 10 | Ethics and legal considerations | `09-ethics-legal.md` | all |
| 11 | Limitations and future work | Limitations sections from ML reports, the cut-line items in `TIMELINE.md`, the `[STRETCH]` list | all |
| 12 | Conclusion | — | all |
| A | Appendices | Setup guide, `LAB.md`, the API (OpenAPI export), the demo runbook | M3 |

## Viva preparation: likely questions and where the answer lives
| Question | Answer source |
|---|---|
| "How is this different from just running Nmap and Wireshark?" | The loop in `01`; correlation, the twin and response in `03`/`04`/`05` |
| "Is your ML real? How do you know it isn't overfitting?" | Session splits, the cross-domain table, LR baseline comparison in `ml/reports/` |
| "What stops your tool from being misused to scan anything?" | Scope allowlist (E2), argv profiles (E1), audit log |
| "What if the automated response blocks the wrong thing?" | Approval, TTL, verify, rollback, emergency stop (`05`) |
| "Is the data on the dashboard real?" | Provenance badges, `no-fake-data-audit`, empty states |
| "How do you keep tenants apart?" | `OrgContext` + RLS, `rls-check` output |
| "What would you do with more time?" | The `[STRETCH]` list and the cut line |

## Writing rule
Every number in the report must come from a file in the repo (`ml/reports/`, `PERF.md`, gate outputs) with a date. No number gets typed in from memory.
