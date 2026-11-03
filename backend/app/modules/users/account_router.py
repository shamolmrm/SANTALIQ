"""Email verification, password reset and password change."""

import hashlib
import logging
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core import mailer
from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.config import get_settings
from app.core.db import as_utc, get_db, utcnow
from app.modules.users.models import AuthSession, TokenPurpose, User, UserToken
from app.modules.users.security import (
    audit,
    client_ip,
    current_user,
    hash_password,
    start_session,
    verify_password,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

TOKEN_TTL = {
    TokenPurpose.verify_email: timedelta(days=2),
    TokenPurpose.reset_password: timedelta(hours=1),
}


class FeaturesOut(BaseModel):
    email: bool


class TokenIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)


class ForgotIn(BaseModel):
    email: str = Field(max_length=254)


class ResetIn(TokenIn):
    password: str = Field(min_length=10, max_length=200)


class ChangeIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=10, max_length=200)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _issue(db: Session, user: User, purpose: TokenPurpose) -> str:
    # one live token per purpose
    db.execute(delete(UserToken).where(UserToken.user_id == user.id, UserToken.purpose == purpose))
    token = secrets.token_urlsafe(32)
    db.add(
        UserToken(
            id=_hash(token),
            user_id=user.id,
            purpose=purpose,
            expires_at=utcnow() + TOKEN_TTL[purpose],
        )
    )
    return token


def _consume(db: Session, token: str, purpose: TokenPurpose) -> User:
    row = db.get(UserToken, _hash(token))
    if (
        row is None
        or row.purpose != purpose
        or row.used_at is not None
        or as_utc(row.expires_at) < utcnow()
    ):
        raise HTTPException(status_code=400, detail="This link is invalid or has expired.")
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="This link is invalid or has expired.")
    row.used_at = utcnow()
    return user


def _require_email() -> None:
    if not mailer.email_enabled():
        raise HTTPException(status_code=503, detail="Email is not available yet.")


async def _limit(request: Request, store: KeyValueStore, bucket: str) -> None:
    limit = get_settings().auth_rate_limit_per_minute
    if await hit_rate_limit(store, f"rl:{bucket}:{client_ip(request)}", limit):
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a minute.")


def send_verification(db: Session, user: User) -> None:
    """Issue a verification token and email it. Commits the token first."""
    token = _issue(db, user, TokenPurpose.verify_email)
    db.commit()
    link = f"{get_settings().public_url}/verify-email?token={token}"
    mailer.send_email(
        user.email,
        "Confirm your SANTALIQ email",
        f"Hello {user.display_name},\n\nPlease confirm your email address for SANTALIQ:\n{link}\n\n"
        "This link expires in 2 days. If you did not create an account, ignore this email.\n",
    )


@router.get("/features", response_model=FeaturesOut)
def features() -> FeaturesOut:
    return FeaturesOut(email=mailer.email_enabled())


@router.post("/verify/request", status_code=202)
async def request_verification(
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> dict[str, str]:
    _require_email()
    await _limit(request, store, "verify")
    if user.email_verified_at:
        return {"status": "already_verified"}
    try:
        send_verification(db, user)
    except Exception as exc:
        log.error("verification email failed: %s", exc)
        raise HTTPException(status_code=502, detail="Could not send email. Try later.") from exc
    return {"status": "sent"}


@router.post("/verify/confirm")
def confirm_verification(
    body: TokenIn, request: Request, db: Session = Depends(get_db)
) -> dict[str, str]:
    user = _consume(db, body.token, TokenPurpose.verify_email)
    user.email_verified_at = utcnow()
    audit(
        db,
        "user.email_verified",
        actor=user,
        target_type="user",
        target_id=user.id,
        request=request,
    )
    db.commit()
    return {"status": "verified"}


@router.post("/password/forgot", status_code=202)
async def forgot_password(
    body: ForgotIn,
    request: Request,
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> dict[str, str]:
    """Always answers the same way, whether or not the email exists."""
    _require_email()
    await _limit(request, store, "forgot")
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user and user.is_active:
        token = _issue(db, user, TokenPurpose.reset_password)
        db.commit()
        link = f"{get_settings().public_url}/reset-password?token={token}"
        try:
            mailer.send_email(
                user.email,
                "Reset your SANTALIQ password",
                f"Hello {user.display_name},\n\nReset your SANTALIQ password here:\n{link}\n\n"
                "This link expires in 1 hour. If you did not ask for this, ignore this email — "
                "your password stays the same.\n",
            )
        except Exception as exc:
            log.error("reset email failed: %s", exc)
    return {"status": "If an account exists for that email, a reset link has been sent."}


@router.post("/password/reset")
def reset_password(
    body: ResetIn, request: Request, response: Response, db: Session = Depends(get_db)
) -> dict[str, str]:
    user = _consume(db, body.token, TokenPurpose.reset_password)
    user.password_hash = hash_password(body.password)
    user.email_verified_at = user.email_verified_at or utcnow()  # they proved mailbox access
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    start_session(db, user, request, response)
    audit(
        db,
        "user.password_reset",
        actor=user,
        target_type="user",
        target_id=user.id,
        request=request,
    )
    db.commit()
    return {"status": "reset"}


@router.post("/password/change")
async def change_password(
    body: ChangeIn,
    request: Request,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> dict[str, str]:
    await _limit(request, store, "change")
    if not verify_password(user.password_hash, body.current_password):
        raise HTTPException(status_code=400, detail="Your current password is not correct.")
    user.password_hash = hash_password(body.new_password)
    # sign out every other device, keep this one with a fresh session
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    start_session(db, user, request, response)
    audit(
        db,
        "user.password_change",
        actor=user,
        target_type="user",
        target_id=user.id,
        request=request,
    )
    db.commit()
    return {"status": "changed"}
