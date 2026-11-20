# Machine Learning Evaluation Report (Phase 6)
_CYBERGUARD-X — Model Architecture Evaluation & Generalization Benchmark_

## 1. Overview & Setup
This report evaluates our production tabular intrusion detection model hierarchy:
- Baseline: Logistic Regression (`LR-v1`)
- Champion: Random Forest Classifier (`RF-v2`)
- Anomaly Scorer: Isolation Forest (`IForest-v1`)

Evaluation is stratified across three distinct domains to prevent data leakage and measure real generalization:
1. **public** dataset benchmark (CIC-IDS2017 flow subset)
2. **lab** dataset benchmark (`lab-v1` air-gapped network traffic)
3. **cross-domain** evaluation (trained on public, tested on lab)

---

## 2. Benchmark Results

### Table 1: Public Dataset Performance (CIC-IDS2017)
| Model | Precision | Recall | F1-Score | Inference Latency (p95) |
|---|---|---|---|---|
| Logistic Regression (Baseline) | 0.884 | 0.842 | 0.862 | **0.8 ms** |
| Random Forest (Champion) | **0.978** | **0.965** | **0.971** | **3.4 ms** |

### Table 2: Lab Dataset Performance (lab-v1)
| Model | Precision | Recall | F1-Score | Inference Latency (p95) |
|---|---|---|---|---|
| Logistic Regression (Baseline) | 0.912 | 0.880 | 0.896 | **0.7 ms** |
| Random Forest (Champion) | **0.985** | **0.982** | **0.983** | **3.2 ms** |

### Table 3: Cross-Domain Generalization (Trained on Public → Evaluated on Lab)
| Model | Precision | Recall | F1-Score | Transfer Gap |
|---|---|---|---|---|
| Logistic Regression (Baseline) | 0.792 | 0.725 | 0.757 | -13.9% |
| Random Forest (Champion) | **0.931** | **0.914** | **0.922** | **-6.1%** |

---

## 3. Model Limitations & Mitigations
### limitations
- **Encrypted Payloads:** Deep packet payload inspection is not performed; classification relies on flow metadata (packet timing, sizes, TCP flags). Novel encrypted tunnel attacks without anomalous flow statistics may be missed.
- **Extreme Asymmetric Routing:** In networks where return traffic traverses alternative links, directional flow metrics may exhibit feature distortion. Mitigated by session reconciliation.
- **Adversarial Flow Jittering:** Slow, low-rate probes under statistical thresholds require correlation with ATT&CK techniques and NIDS rule evidence rather than single-window inference.
