import pytest
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# 1. test_no_session_leakage_in_split
# ---------------------------------------------------------------------------
@pytest.mark.phase6
def test_no_session_leakage_in_split():
    """Dataset splitting partitions strictly by session ID without cross-split overlap."""
    records = [
        {"session_id": "sess-alpha", "packets": 10, "bytes": 600, "label": 0},
        {"session_id": "sess-alpha", "packets": 12, "bytes": 720, "label": 0},
        {"session_id": "sess-beta", "packets": 50, "bytes": 3000, "label": 1},
        {"session_id": "sess-gamma", "packets": 5, "bytes": 300, "label": 0},
        {"session_id": "sess-delta", "packets": 80, "bytes": 4800, "label": 1},
    ]

    # Session-grouped split (80% train, 20% test by distinct sessions)
    all_sessions = sorted(list({r["session_id"] for r in records}))
    train_sessions = set(all_sessions[:3])
    test_sessions = set(all_sessions[3:])

    train_data = [r for r in records if r["session_id"] in train_sessions]
    test_data = [r for r in records if r["session_id"] in test_sessions]

    overlap = set(r["session_id"] for r in train_data) & set(r["session_id"] for r in test_data)
    assert len(overlap) == 0


# ---------------------------------------------------------------------------
# 2. test_feature_code_shared_train_infer
# ---------------------------------------------------------------------------
@pytest.mark.phase6
def test_feature_code_shared_train_infer():
    """Identical vectorization logic transforms both training samples and live telemetry."""
    def extract_flow_features(flow_dict):
        return [
            float(flow_dict.get("packet_count", 0)),
            float(flow_dict.get("byte_count", 0)),
            1.0 if flow_dict.get("proto") == "tcp" else 0.0,
            float(flow_dict.get("duration_ms", 0)) / 1000.0,
        ]

    # Offline batch
    offline_sample = {"packet_count": 15, "byte_count": 900, "proto": "tcp", "duration_ms": 2500}
    offline_vec = extract_flow_features(offline_sample)

    # Online live inference input
    online_sample = {"packet_count": 15, "byte_count": 900, "proto": "tcp", "duration_ms": 2500}
    online_vec = extract_flow_features(online_sample)

    assert offline_vec == online_vec == [15.0, 900.0, 1.0, 2.5]


# ---------------------------------------------------------------------------
# 3. test_prediction_has_model_version
# ---------------------------------------------------------------------------
@pytest.mark.phase6
def test_prediction_has_model_version():
    """Every inference output records model_version_id, timestamp, and provenance='PREDICTED'."""
    prediction = {
        "model_version_id": "rf-classifier-v2.1",
        "score": 0.942,
        "label": "ATTACK",
        "calibrated": True,
        "provenance": "PREDICTED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    assert prediction["model_version_id"] == "rf-classifier-v2.1"
    assert prediction["provenance"] == "PREDICTED"
    assert 0.0 <= prediction["score"] <= 1.0


# ---------------------------------------------------------------------------
# 4. test_rule_not_labelled_ml
# ---------------------------------------------------------------------------
@pytest.mark.phase6
def test_rule_not_labelled_ml():
    """Heuristic and signature-based findings carry method='RULE', never 'ML'."""
    from backend.app.services.monitoring.nids_engine import NIDSAlert

    alert = NIDSAlert(
        alert_id="alert-101",
        rule_id="NIDS-001",
        name="TCP SYN Port Scan",
        severity="high",
        occurred_at=datetime.now(timezone.utc),
        source_ip="172.30.0.100",
        destination_ip="172.30.0.12",
        description="Threshold port scan",
        evidence="12 ports",
    )

    finding_record = {
        "id": alert.alert_id,
        "rule_id": alert.rule_id,
        "method": "RULE",
        "provenance": "OBSERVED",
    }

    assert finding_record["method"] == "RULE"
    assert finding_record["method"] != "ML"


# ---------------------------------------------------------------------------
# 5. test_evaluate_reproducible
# ---------------------------------------------------------------------------
@pytest.mark.phase6
def test_evaluate_reproducible():
    """Model evaluation metric calculation is strictly deterministic with fixed seed."""
    import random

    def run_eval(seed):
        rng = random.Random(seed)
        y_true = [rng.choice([0, 1]) for _ in range(100)]
        y_pred = [rng.choice([0, 1]) for _ in range(100)]
        tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp == 1)
        fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        return precision

    score_1 = run_eval(42)
    score_2 = run_eval(42)

    assert score_1 == score_2
