"""CYBERGUARD-X ML Intrusion Detection Training Pipeline.

Trains and evaluates:
1. Logistic Regression (Baseline)
2. Random Forest Classifier (Champion)

Generates versioned artifacts in ml/artifacts/:
- rf_nids_classifier_v1.joblib
- scaler_v1.joblib
- model_metadata.json
"""

import csv
import json
import os
from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler

ROOT_DIR = Path(__file__).resolve().parents[2]
DATASET_DIR = ROOT_DIR / "ml" / "datasets" / "lab-v1"
ARTIFACTS_DIR = ROOT_DIR / "ml" / "artifacts"

FEATURE_NAMES = [
    "src_port",
    "dst_port",
    "proto_code",       # 6 for TCP, 17 for UDP
    "packet_count",
    "byte_count",
    "duration_ms",
    "tcp_flags_syn",
    "tcp_flags_ack",
    "tcp_flags_fin",
    "tcp_flags_rst",
]


def generate_lab_dataset() -> list[dict]:
    """Generate the 1,250 ground-truth flow records according to MANIFEST.json."""
    np.random.seed(42)
    records = []

    # 1. TCP_SYN_SCAN (250 records) - NIDS-001
    for _ in range(250):
        records.append({
            "src_ip": "172.30.0.105",
            "dst_ip": f"172.30.0.{np.random.randint(10, 30)}",
            "src_port": np.random.randint(40000, 65000),
            "dst_port": np.random.choice([21, 22, 23, 25, 80, 443, 3306, 5432, 8080]),
            "proto": "TCP",
            "proto_code": 6,
            "packet_count": np.random.randint(1, 4),
            "byte_count": np.random.randint(40, 240),
            "duration_ms": np.random.randint(1, 150),
            "tcp_flags_syn": 1,
            "tcp_flags_ack": 0,
            "tcp_flags_fin": 0,
            "tcp_flags_rst": np.random.choice([0, 1], p=[0.7, 0.3]),
            "label": 1,
            "attack_type": "TCP_SYN_SCAN",
            "rule": "NIDS-001",
        })

    # 2. UDP_SWEEP (180 records) - NIDS-002
    for _ in range(180):
        records.append({
            "src_ip": "172.30.0.188",
            "dst_ip": f"172.30.0.{np.random.randint(10, 30)}",
            "src_port": np.random.randint(40000, 65000),
            "dst_port": np.random.choice([53, 67, 68, 69, 123, 161, 500, 4500]),
            "proto": "UDP",
            "proto_code": 17,
            "packet_count": np.random.randint(1, 3),
            "byte_count": np.random.randint(28, 120),
            "duration_ms": np.random.randint(1, 80),
            "tcp_flags_syn": 0,
            "tcp_flags_ack": 0,
            "tcp_flags_fin": 0,
            "tcp_flags_rst": 0,
            "label": 1,
            "attack_type": "UDP_SWEEP",
            "rule": "NIDS-002",
        })

    # 3. PORT_SWEEP_SSH (120 records) - NIDS-003
    for _ in range(120):
        records.append({
            "src_ip": "172.30.0.220",
            "dst_ip": "172.30.0.12",
            "src_port": np.random.randint(30000, 60000),
            "dst_port": 22,
            "proto": "TCP",
            "proto_code": 6,
            "packet_count": np.random.randint(8, 45),
            "byte_count": np.random.randint(800, 4500),
            "duration_ms": np.random.randint(500, 8000),
            "tcp_flags_syn": 1,
            "tcp_flags_ack": 1,
            "tcp_flags_fin": np.random.choice([0, 1], p=[0.5, 0.5]),
            "tcp_flags_rst": np.random.choice([0, 1], p=[0.6, 0.4]),
            "label": 1,
            "attack_type": "PORT_SWEEP_SSH",
            "rule": "NIDS-003",
        })

    # 4. BENIGN_TELEMETRY (700 records)
    for _ in range(700):
        is_tcp = np.random.choice([True, False], p=[0.82, 0.18])
        dst_port = int(np.random.choice([80, 443, 53, 8080, 22, 5432], p=[0.35, 0.40, 0.15, 0.04, 0.03, 0.03]))
        records.append({
            "src_ip": f"172.30.0.{np.random.randint(2, 50)}",
            "dst_ip": f"172.30.0.{np.random.randint(2, 50)}",
            "src_port": np.random.randint(1024, 65535),
            "dst_port": dst_port,
            "proto": "TCP" if is_tcp else "UDP",
            "proto_code": 6 if is_tcp else 17,
            "packet_count": np.random.randint(5, 120),
            "byte_count": np.random.randint(300, 65000),
            "duration_ms": np.random.randint(50, 15000),
            "tcp_flags_syn": 1 if is_tcp else 0,
            "tcp_flags_ack": 1 if is_tcp else 0,
            "tcp_flags_fin": np.random.choice([0, 1], p=[0.6, 0.4]) if is_tcp else 0,
            "tcp_flags_rst": 0,
            "label": 0,
            "attack_type": "BENIGN",
            "rule": "NONE",
        })

    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames = list(records[0].keys())
    with open(DATASET_DIR / "flows.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    return records


def main():
    print("=" * 60)
    print("CYBERGUARD-X ML Pipeline: Training NIDS Flow Classifier")
    print("=" * 60)

    records = generate_lab_dataset()
    print(f"Generated {len(records)} records in {DATASET_DIR / 'flows.csv'}")

    y = np.array([r["label"] for r in records])
    X = np.array([[r[feat] for feat in FEATURE_NAMES] for r in records], dtype=float)
    benign_count = int(np.sum(y == 0))
    attack_count = int(np.sum(y == 1))
    print(f"Class Distribution: {{'BENIGN (0)': {benign_count}, 'ATTACK (1)': {attack_count}}}")

    # Stratified K-Fold
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    lr_precisions, lr_recalls, lr_f1s = [], [], []
    rf_precisions, rf_recalls, rf_f1s = [], [], []

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_train, X_val = X_scaled[train_idx], X_scaled[val_idx]
        y_train, y_val = y[train_idx], y[val_idx]

        # 1. Baseline: Logistic Regression
        lr = LogisticRegression(max_iter=500, random_state=42)
        lr.fit(X_train, y_train)
        y_pred_lr = lr.predict(X_val)
        lr_precisions.append(precision_score(y_val, y_pred_lr))
        lr_recalls.append(recall_score(y_val, y_pred_lr))
        lr_f1s.append(f1_score(y_val, y_pred_lr))

        # 2. Champion: Random Forest
        rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
        rf.fit(X_train, y_train)
        y_pred_rf = rf.predict(X_val)
        rf_precisions.append(precision_score(y_val, y_pred_rf))
        rf_recalls.append(recall_score(y_val, y_pred_rf))
        rf_f1s.append(f1_score(y_val, y_pred_rf))

    print("\n[Evaluation Results - 5-Fold Stratified Cross-Validation]")
    print(f"Logistic Regression: Precision={np.mean(lr_precisions):.3f}, Recall={np.mean(lr_recalls):.3f}, F1={np.mean(lr_f1s):.3f}")
    print(f"Random Forest:       Precision={np.mean(rf_precisions):.3f}, Recall={np.mean(rf_recalls):.3f}, F1={np.mean(rf_f1s):.3f}")

    # Train final champion model on entire scaled dataset
    final_rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    final_rf.fit(X_scaled, y)

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = ARTIFACTS_DIR / "rf_nids_classifier_v1.joblib"
    scaler_path = ARTIFACTS_DIR / "scaler_v1.joblib"
    metadata_path = ARTIFACTS_DIR / "model_metadata.json"

    joblib.dump(final_rf, model_path)
    joblib.dump(scaler, scaler_path)

    metadata = {
        "model_name": "CYBERGUARD-X Random Forest NIDS Classifier",
        "model_version": "v1.0",
        "model_type": "RandomForestClassifier",
        "artifact_file": "rf_nids_classifier_v1.joblib",
        "scaler_file": "scaler_v1.joblib",
        "provenance": "PREDICTED",
        "features": FEATURE_NAMES,
        "n_features": len(FEATURE_NAMES),
        "target_classes": ["BENIGN", "ATTACK"],
        "metrics": {
            "cross_val_precision": float(np.mean(rf_precisions)),
            "cross_val_recall": float(np.mean(rf_recalls)),
            "cross_val_f1": float(np.mean(rf_f1s)),
            "baseline_lr_f1": float(np.mean(lr_f1s)),
        },
        "feature_importances": {
            feat: float(imp)
            for feat, imp in zip(FEATURE_NAMES, final_rf.feature_importances_)
        },
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[Artifacts Serialized]")
    print(f"  ● Model:    {model_path} ({os.path.getsize(model_path):,} bytes)")
    print(f"  ● Scaler:   {scaler_path} ({os.path.getsize(scaler_path):,} bytes)")
    print(f"  ● Metadata: {metadata_path}")
    print("\nFeature Importances:")
    for feat, imp in sorted(metadata["feature_importances"].items(), key=lambda x: x[1], reverse=True):
        print(f"  - {feat:15s}: {imp * 100:5.2f}%")
    print("=" * 60)


if __name__ == "__main__":
    main()
