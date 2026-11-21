from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.db.models.observations import Asset, PortObservation
from backend.app.db.models.users import User
from backend.app.db.session import engine
from backend.app.main import app
from backend.app.schemas.ml import FlowFeaturesInput
from backend.app.services.ml.prediction_service import get_model_metadata, predict_flow


@pytest.fixture
def api_client():
    with engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()
        connection.rollback()
        assert database_name == "cyberguard_x_restore_test"

        outer_tx = connection.begin()

        def override_get_db():
            db = Session(bind=connection, autoflush=False, autocommit=False)
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.pop(get_db, None)
            if outer_tx.is_active:
                outer_tx.rollback()


def test_ml_prediction_service_direct():
    # 1. Test model metadata loading
    meta = get_model_metadata()
    assert meta.model_version == "v1.0"
    assert meta.provenance == "PREDICTED"
    assert "dst_port" in meta.features

    # 2. Test benign flow prediction
    benign_flow = FlowFeaturesInput(
        src_port=49152,
        dst_port=443,
        proto="TCP",
        packet_count=20,
        byte_count=8500,
        duration_ms=1200,
        tcp_flags_syn=1,
        tcp_flags_ack=1,
        tcp_flags_fin=0,
        tcp_flags_rst=0,
    )
    res_benign = predict_flow(benign_flow)
    assert res_benign.provenance == "PREDICTED"
    assert res_benign.prediction == "BENIGN"
    assert res_benign.attack_probability < 0.5
    assert not res_benign.is_anomaly

    # 3. Test attack flow prediction (SYN scan burst)
    attack_flow = FlowFeaturesInput(
        src_port=54120,
        dst_port=21,
        proto="TCP",
        packet_count=1,
        byte_count=60,
        duration_ms=2,
        tcp_flags_syn=1,
        tcp_flags_ack=0,
        tcp_flags_fin=0,
        tcp_flags_rst=0,
    )
    res_attack = predict_flow(attack_flow)
    assert res_attack.provenance == "PREDICTED"
    assert res_attack.prediction == "ATTACK"
    assert res_attack.attack_probability >= 0.5
    assert res_attack.is_anomaly


from backend.app.db.models.access_control import (
    Membership,
    MembershipRole,
    Role,
)
from backend.app.db.models.organizations import Organization


def test_twin_graph_empty_organization(api_client, monkeypatch):
    client, conn = api_client
    db = Session(bind=conn, autoflush=False, autocommit=False)
    try:
        uid = f"twin-owner-{uuid4().hex}"
        email = f"{uid}@example.com"
        user = User(
            full_name="Twin Owner",
            email=email,
            firebase_uid=uid,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    monkeypatch.setattr(
        "backend.app.api.deps.verify_firebase_id_token",
        lambda token: {"uid": uid, "sub": uid, "email": email, "email_verified": True},
    )

    headers = {"Authorization": "Bearer test-firebase-token"}
    org_res = client.post(
        "/api/v1/organizations",
        headers=headers,
        json={"name": "Twin Org", "slug": f"twin-org-{uuid4().hex[:8]}"},
    )
    assert org_res.status_code == 201, org_res.text
    org_id = org_res.json()["id"]

    res = client.get(
        f"/api/v1/organizations/{org_id}/twin/graph",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_nodes"] == 0
    assert data["nodes"] == []
    assert data["edges"] == []
    assert data["provenance"] == "DERIVED"

    # Test ML model info endpoint
    ml_info_res = client.get(
        f"/api/v1/organizations/{org_id}/ml/model-info",
        headers=headers,
    )
    assert ml_info_res.status_code == 200
    ml_info = ml_info_res.json()
    assert ml_info["model_version"] == "v1.0"
    assert ml_info["provenance"] == "PREDICTED"

    # Test ML predict endpoint via API
    flow_payload = {
        "src_port": 54120,
        "dst_port": 22,
        "proto": "TCP",
        "packet_count": 1,
        "byte_count": 60,
        "duration_ms": 2,
        "tcp_flags_syn": 1,
        "tcp_flags_ack": 0,
        "tcp_flags_fin": 0,
        "tcp_flags_rst": 0,
    }
    pred_res = client.post(
        f"/api/v1/organizations/{org_id}/ml/predict",
        headers=headers,
        json=flow_payload,
    )
    assert pred_res.status_code == 200
    pred_data = pred_res.json()
    assert pred_data["provenance"] == "PREDICTED"
    assert pred_data["prediction"] in {"BENIGN", "ATTACK"}
    assert "explanation" in pred_data
