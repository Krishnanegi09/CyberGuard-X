from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials

from backend.app.core.config import settings


def get_firebase_app() -> firebase_admin.App:
    """Initialize Firebase Admin lazily and return its application."""

    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    credential_path: Path | None = settings.firebase_service_account_path
    project_id = settings.firebase_project_id

    if credential_path is None or not project_id:
        raise RuntimeError(
            "Firebase Admin is not configured. "
            "Set FIREBASE_SERVICE_ACCOUNT_PATH and FIREBASE_PROJECT_ID."
        )

    if not credential_path.is_file():
        raise RuntimeError("Firebase service-account file was not found.")

    certificate = credentials.Certificate(str(credential_path))

    if certificate.project_id != project_id:
        raise RuntimeError(
            "Firebase project ID does not match the service account."
        )

    return firebase_admin.initialize_app(
        certificate,
        options={"projectId": project_id},
    )


def verify_firebase_id_token(id_token: str) -> dict:
    """Verify a Firebase ID token, including revocation status."""

    app = get_firebase_app()

    return auth.verify_id_token(
        id_token,
        app=app,
        check_revoked=True,
    )
