import json
from pathlib import Path
from threading import Lock
from typing import Any
import joblib
import numpy as np

from backend.app.schemas.ml import FlowFeaturesInput, PredictionResponse, ModelMetadataResponse

ARTIFACTS_DIR = Path(__file__).resolve().parents[4] / "ml" / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "rf_nids_classifier_v1.joblib"
SCALER_PATH = ARTIFACTS_DIR / "scaler_v1.joblib"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"

_lock = Lock()
_model: Any = None
_scaler: Any = None
_metadata: dict[str, Any] | None = None


def _load_artifacts():
    global _model, _scaler, _metadata
    with _lock:
        if _model is None:
            if not MODEL_PATH.exists() or not SCALER_PATH.exists():
                raise RuntimeError(
                    f"ML model artifacts not found at {ARTIFACTS_DIR}. "
                    "Run 'python ml/training/train_classifier.py' to produce them."
                )
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            if METADATA_PATH.exists():
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    _metadata = json.load(f)
            else:
                _metadata = {
                    "model_name": "RandomForestClassifier",
                    "model_version": "v1.0",
                    "provenance": "PREDICTED",
                }


def get_model_metadata() -> ModelMetadataResponse:
    _load_artifacts()
    assert _metadata is not None
    return ModelMetadataResponse(**_metadata)


def predict_flow(flow: FlowFeaturesInput) -> PredictionResponse:
    _load_artifacts()
    assert _model is not None
    assert _scaler is not None
    assert _metadata is not None

    proto_code = 6 if flow.proto == "TCP" else 17

    feature_vector = np.array([[
        float(flow.src_port),
        float(flow.dst_port),
        float(proto_code),
        float(flow.packet_count),
        float(flow.byte_count),
        float(flow.duration_ms),
        float(flow.tcp_flags_syn),
        float(flow.tcp_flags_ack),
        float(flow.tcp_flags_fin),
        float(flow.tcp_flags_rst),
    ]])

    scaled_vector = _scaler.transform(feature_vector)
    probabilities = _model.predict_proba(scaled_vector)[0]
    classes = _model.classes_  # [0, 1]

    # Map probability of class 1 (ATTACK)
    attack_idx = np.where(classes == 1)[0]
    attack_prob = float(probabilities[attack_idx[0]]) if len(attack_idx) > 0 else 0.0
    benign_prob = 1.0 - attack_prob

    is_attack = attack_prob >= 0.5
    prediction_label = "ATTACK" if is_attack else "BENIGN"
    confidence = attack_prob if is_attack else benign_prob

    # Top contributing features based on scaled values and importances
    feature_names = _metadata.get("features", [])
    importances = _metadata.get("feature_importances", {})
    feature_scores = []
    for idx, name in enumerate(feature_names):
        weight = importances.get(name, 0.1)
        score = abs(scaled_vector[0][idx]) * weight
        feature_scores.append((name, score))

    feature_scores.sort(key=lambda x: x[1], reverse=True)
    top_features = [name for name, _ in feature_scores[:3]]

    # Generate deterministic, evidence-backed explanation
    if is_attack:
        explanation = (
            f"Classified as ATTACK with {confidence:.1%} confidence. Key drivers: "
            f"{', '.join(top_features)}. Abnormal byte density ({flow.byte_count}B) "
            f"and packet dynamics ({flow.packet_count}pkts in {flow.duration_ms}ms) "
            f"match malicious flow profiling."
        )
    else:
        explanation = (
            f"Classified as BENIGN with {confidence:.1%} confidence. Flow features align "
            f"with normal baseline traffic across {flow.proto} port {flow.dst_port}."
        )

    return PredictionResponse(
        prediction=prediction_label,
        is_anomaly=is_attack,
        attack_probability=round(attack_prob, 4),
        confidence=round(confidence, 4),
        provenance="PREDICTED",
        model_name=_metadata.get("model_name", "RandomForestClassifier"),
        model_version=_metadata.get("model_version", "v1.0"),
        explanation=explanation,
        top_contributing_features=top_features,
    )
