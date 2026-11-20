# Dataset Card: CYBERGUARD-X Lab Telemetry (lab-v1)

## Dataset Summary
`lab-v1` contains high-fidelity network flow telemetry and packet metadata captured within the air-gapped `cgx-lab` network environment (CIDR: `172.30.0.0/24`). It features ground-truth labelled benign network traffic interleaved with real attack scenarios:
- Benign baseline: Web browsing, SSH management, DNS lookups, background database sync.
- Malicious scenarios: Multi-port TCP SYN scanning (`NIDS-001`), UDP sweeping (`NIDS-002`), port sweeps (`NIDS-003`), brute-force authentication.

## Dataset Structure
- **Format:** Parquet / CSV flow records with NetFlow v9 schema.
- **Features:**
  - `src_ip`, `dst_ip`, `src_port`, `dst_port`, `proto`
  - `packet_count`, `byte_count`, `duration_ms`
  - `tcp_flags_syn`, `tcp_flags_ack`, `tcp_flags_fin`, `tcp_flags_rst`
  - `label`: `BENIGN` or `ATTACK`
  - `attack_type`: `SYN_SCAN`, `UDP_SCAN`, `PORT_SWEEP`, `BRUTE_FORCE`

## Splitting Strategy
- **Session Split:** Temporal and source-session partitioning to prevent data leakage between training and validation sets.
- **Class Balance:** 80% Benign, 20% Attack.

## Intended Use
Training and evaluating tabular intrusion detection classifiers and anomaly scoring models in Phase 6.
