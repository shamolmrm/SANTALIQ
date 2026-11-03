import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import mailer
from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.config import get_settings
from app.core.db import get_db, utcnow
from app.modules.users.models import Role, User
from app.modules.users.security import (
    audit,
    client_ip,
    current_user,
    end_session,
    hash_password,
    needs_rehash,
    start_session,
    verify_password,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterIn(BaseModel):
    email: str = Field(max_length=254, pattern=EMAIL_PATTERN)
    password: str = Field(min_length=10, max_length=200)
    display_name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    role: Role
    is_active: bool
    email_verified: bool = False
    created_at: datetime | None = None


def to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified_at is not None,
        created_at=user.created_at,
    )


async def _limit(request: Request, store: KeyValueStore) -> None:
    limit = get_settings().auth_rate_limit_per_minute
    if await hit_rate_limit(store, f"rl:auth:{client_ip(request)}", limit):
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a minute.")


@router.post("/register", response_model=UserOut, status_code=201)
async def register(
    body: RegisterIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> UserOut:
    await _limit(request, store)
    email = body.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        display_name=body.display_name.strip(),
        role=Role.member,
        last_login_at=utcnow(),
    )
    db.add(user)
    db.flush()
    start_session(db, user, request, response)
    audit(db, "user.register", actor=user, target_type="user", target_id=user.id, request=request)
    db.commit()
    if mailer.email_enabled():
        from app.modules.users.account_router import send_verification

        try:
            send_verification(db, user)
        except Exception as exc:  # registration must not fail because of email
            log.error("verification email failed: %s", exc)
    return to_out(user)


@router.post("/login", response_model=UserOut)
async def login(
    body: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> UserOut:
    await _limit(request, store)
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not verify_password(user.password_hash if user else None, body.password) or not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled.")
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
    user.last_login_at = utcnow()
    start_session(db, user, request, response)
    audit(db, "user.login", actor=user, target_type="user", target_id=user.id, request=request)
    db.commit()
    return to_out(user)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    end_session(db, request, response)
    db.commit()
    response.status_code = 204
    return response


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> UserOut:
    return to_out(user)
