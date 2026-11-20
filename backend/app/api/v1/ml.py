from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.api.deps import require_organization_permission
from backend.app.schemas.ml import (
    FlowFeaturesInput,
    ModelMetadataResponse,
    PredictionResponse,
)
from backend.app.services.ml.prediction_service import get_model_metadata, predict_flow

router = APIRouter(
    prefix="/organizations/{organization_id}/ml",
    tags=["Machine Learning"],
)


@router.get("/model-info", response_model=ModelMetadataResponse)
def get_ml_model_info(
    organization_id: UUID,
    membership=Depends(require_organization_permission("observations.read")),
):
    """Retrieve production ML model metadata, architecture details, and cross-validation benchmark metrics."""
    try:
        return get_model_metadata()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML model metadata unavailable: {exc}",
        ) from exc


@router.post("/predict", response_model=PredictionResponse)
def predict_network_flow(
    organization_id: UUID,
    payload: FlowFeaturesInput,
    membership=Depends(require_organization_permission("observations.read")),
):
    """Run real-time inference on a network flow using the versioned Random Forest champion model."""
    try:
        return predict_flow(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {exc}",
        ) from exc
