
import uuid
from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from firebase_admin.exceptions import FirebaseError
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from backend.app.core.firebase import verify_firebase_id_token
from backend.app.db.models.access_control import (
    Membership,
    MembershipRole,
    Permission,
    RolePermission,
)
from backend.app.db.models.organizations import Organization
from backend.app.db.models.users import User
from backend.app.db.session import SessionLocal

bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def get_firebase_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate Firebase credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        claims = verify_firebase_id_token(credentials.credentials)

    except (
        auth.InvalidIdTokenError,
        auth.ExpiredIdTokenError,
        auth.RevokedIdTokenError,
        auth.UserDisabledError,
    ):
        raise unauthorized

    except FirebaseError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable.",
        )

    if not isinstance(claims, dict):
        raise unauthorized

    if not isinstance(claims.get("uid"), str):
        raise unauthorized

    if not claims["uid"].strip():
        raise unauthorized

    return claims


def get_current_user(
    claims: dict = Depends(get_firebase_claims),
    db: Session = Depends(get_db),
) -> User:
    user = db.scalar(
        select(User).where(
            User.firebase_uid == claims["uid"]
        )
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account is linked to this Firebase user.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    if claims.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required.",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account verification required.",
        )

    return user


def require_organization_permission(permission_code: str):
    """
    Require an active organization membership with a specific permission.

    The organization_id must come from the route path. Authorization is
    always resolved using the authenticated user's database identity
    and server-side role/permission assignments.
    """

    if not isinstance(permission_code, str) or not permission_code.strip():
        raise ValueError("A valid permission code is required.")

    required_permission = permission_code.strip()

    def permission_dependency(
        organization_id: uuid.UUID,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Membership:

        organization = db.scalar(
            select(Organization).where(
                Organization.id == organization_id,
                Organization.is_active.is_(True),
            )
        )

        if organization is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found or inactive.",
            )

        membership = db.scalar(
            select(Membership).where(
                Membership.organization_id == organization_id,
                Membership.user_id == current_user.id,
                Membership.status == "active",
            )
        )

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Active organization membership required.",
            )

        permission_exists = db.scalar(
            select(Permission.id)
            .join(
                RolePermission,
                RolePermission.permission_id == Permission.id,
            )
            .join(
                MembershipRole,
                and_(
                    MembershipRole.organization_id
                    == RolePermission.organization_id,
                    MembershipRole.role_id
                    == RolePermission.role_id,
                ),
            )
            .where(
                MembershipRole.organization_id == organization_id,
                MembershipRole.membership_id == membership.id,
                Permission.code == required_permission,
            )
            .limit(1)
        )

        if permission_exists is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return membership

    return permission_dependency
