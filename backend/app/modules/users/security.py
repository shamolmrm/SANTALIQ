import hashlib
import secrets
import uuid
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import as_utc, get_db, utcnow
from app.modules.users.models import ROLE_RANK, AuditEvent, AuthSession, Role, User

_hasher = PasswordHasher()
# Used to keep login timing equal when the email does not exist.
_DUMMY_HASH = _hasher.hash("santaliq-timing-equaliser")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def _token_id(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def start_session(db: Session, user: User, request: Request, response: Response) -> None:
    settings = get_settings()
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(
            id=_token_id(token),
            user_id=user.id,
            expires_at=utcnow() + timedelta(days=settings.session_ttl_days),
            ip=client_ip(request),
            user_agent=(request.headers.get("user-agent") or "")[:255],
        )
    )
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=settings.session_ttl_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def end_session(db: Session, request: Request, response: Response) -> None:
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        session = db.get(AuthSession, _token_id(token))
        if session:
            db.delete(session)
    response.delete_cookie(settings.session_cookie_name, path="/")


def audit(
    db: Session,
    action: str,
    *,
    actor: User | None = None,
    target_type: str | None = None,
    target_id: uuid.UUID | str | None = None,
    detail: dict | None = None,
    request: Request | None = None,
) -> None:
    db.add(
        AuditEvent(
            actor_id=actor.id if actor else None,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            detail=detail,
            ip=client_ip(request) if request else None,
        )
    )


# ── FastAPI dependencies ──


def current_user_optional(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get(get_settings().session_cookie_name)
    if not token:
        return None
    session = db.get(AuthSession, _token_id(token))
    if not session or as_utc(session.expires_at) < utcnow():
        return None
    user = db.get(User, session.user_id)
    return user if user and user.is_active else None


def current_user(user: User | None = Depends(current_user_optional)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return user


def require_role(role: Role):
    def dependency(user: User = Depends(current_user)) -> User:
        if ROLE_RANK[user.role] < ROLE_RANK[role]:
            raise HTTPException(status_code=403, detail="You do not have permission to do this.")
        return user

    return dependency
