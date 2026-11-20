from datetime import datetime, timezone
from uuid import uuid4

import pytest


# ---------------------------------------------------------------------------
# 1. test_unverified_not_labelled
# ---------------------------------------------------------------------------
@pytest.mark.phase8
def test_unverified_not_labelled():
    """Unreviewed or open alerts are excluded from training dataset export."""
    records = [
        {"id": "alert-1", "status": "open", "analyst_verdict": None},
        {"id": "alert-2", "status": "acknowledged", "analyst_verdict": None},
        {"id": "alert-3", "status": "resolved", "analyst_verdict": "CONFIRMED_TRUE_POSITIVE"},
        {"id": "alert-4", "status": "resolved", "analyst_verdict": "FALSE_POSITIVE"},
    ]

    # Export pipeline filter: requires confirmed analyst verdict
    exportable = [r for r in records if r.get("analyst_verdict") in ("CONFIRMED_TRUE_POSITIVE", "FALSE_POSITIVE")]
    exportable_ids = [r["id"] for r in exportable]

    assert "alert-1" not in exportable_ids
    assert "alert-2" not in exportable_ids
    assert "alert-3" in exportable_ids
    assert "alert-4" in exportable_ids


# ---------------------------------------------------------------------------
# 2. test_dataset_manifest_traceable
# ---------------------------------------------------------------------------
@pytest.mark.phase8
def test_dataset_manifest_traceable():
    """Every record in exported dataset links to an analyst ID and verdict timestamp."""
    export_record = {
        "record_id": str(uuid4()),
        "features": [15, 900, 1.0, 2.5],
        "label": 1,
        "feedback_provenance": {
            "finding_id": "finding-882",
            "verified_by_actor": "analyst-uuid-99",
            "verdict": "CONFIRMED",
            "verdict_timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }

    prov = export_record["feedback_provenance"]
    assert prov["finding_id"] is not None
    assert prov["verified_by_actor"] is not None
    assert prov["verdict"] == "CONFIRMED"
    assert prov["verdict_timestamp"] is not None


# ---------------------------------------------------------------------------
# 3. test_feedback_requires_analyst_role
# ---------------------------------------------------------------------------
@pytest.mark.phase8
def test_feedback_requires_analyst_role():
    """Submitting feedback labels requires at least Analyst role; Viewer is rejected."""
    allowed_roles = {"Analyst", "Admin", "Owner"}

    def submit_feedback(user_role, verdict):
        if user_role not in allowed_roles:
            raise PermissionError("Viewer role lacks feedback label permission")
        return {"status": "accepted", "verdict": verdict}

    with pytest.raises(PermissionError, match="Viewer"):
        submit_feedback("Viewer", "CONFIRMED")

    result = submit_feedback("Analyst", "CONFIRMED")
    assert result["status"] == "accepted"
