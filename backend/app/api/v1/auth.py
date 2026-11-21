
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.deps import (
    get_current_user,
    get_db,
    get_firebase_claims,
)
from backend.app.db.models.users import User
from backend.app.schemas.auth import FirebaseSyncRequest, UserPublic

router = APIRouter(tags=["Authentication"])

email_adapter = TypeAdapter(EmailStr)


@router.post("/auth/sync", response_model=UserPublic)
def sync_firebase_user(
    payload: FirebaseSyncRequest,
    claims: dict = Depends(get_firebase_claims),
    db: Session = Depends(get_db),
):
    uid = claims.get("uid")
    email = claims.get("email")

    if (
        not isinstance(uid, str)
        or not uid.strip()
        or not isinstance(email, str)
        or claims.get("email_verified") is not True
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A verified Firebase email is required.",
        )

    try:
        normalized_email = str(
            email_adapter.validate_python(email)
        ).strip().lower()
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase account information.",
        )

    user = db.scalar(
        select(User)
        .where(User.firebase_uid == uid)
        .with_for_update()
    )

    if user is not None:
        if user.email.lower() != normalized_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Firebase account email does not match the linked account.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is inactive.",
            )

        if not user.is_verified:
            user.is_verified = True
            db.commit()
            db.refresh(user)

        return user

    user = db.scalar(
        select(User)
        .where(func.lower(User.email) == normalized_email)
        .with_for_update()
    )

    if user is not None:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is inactive.",
            )

        if user.firebase_uid is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already linked to another Firebase account.",
            )

        # Preserve the existing user ID, password hash and memberships.
        user.firebase_uid = uid
        user.is_verified = True

    else:
        user = User(
            email=normalized_email,
            firebase_uid=uid,
            full_name=payload.full_name,
            password_hash=None,
            is_active=True,
            is_verified=True,
        )
        db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account synchronization conflict. Please retry.",
        )

    return user


@router.get("/auth/me", response_model=UserPublic)
def get_authenticated_user(
    current_user: User = Depends(get_current_user),
):
    return current_user
