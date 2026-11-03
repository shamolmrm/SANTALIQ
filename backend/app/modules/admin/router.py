import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.core.db import get_db, utcnow
from app.modules.language.models import Lexeme, VerificationStatus
from app.modules.language.router import EntryReviewOut, entry_review_out
from app.modules.notify.service import notify
from app.modules.users.models import AuthSession, Role, User
from app.modules.users.router import UserOut, to_out
from app.modules.users.security import audit, require_role

router = APIRouter(prefix="/admin", tags=["admin"])

reviewer_required = require_role(Role.reviewer)
admin_required = require_role(Role.admin)


class StatsOut(BaseModel):
    pending: int
    verified: int
    rejected: int
    users: int


class ReviewQueueOut(BaseModel):
    total: int
    items: list[EntryReviewOut]


class ReviewIn(BaseModel):
    decision: Literal["verified", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


class UserPatch(BaseModel):
    role: Role | None = None
    is_active: bool | None = None


class UserListOut(BaseModel):
    total: int
    items: list[UserOut]


@router.get("/stats", response_model=StatsOut)
def stats(_: User = Depends(reviewer_required), db: Session = Depends(get_db)) -> StatsOut:
    counts = dict(db.execute(select(Lexeme.status, func.count()).group_by(Lexeme.status)).all())
    return StatsOut(
        pending=counts.get(VerificationStatus.pending, 0),
        verified=counts.get(VerificationStatus.verified, 0),
        rejected=counts.get(VerificationStatus.rejected, 0),
        users=db.scalar(select(func.count()).select_from(User)) or 0,
    )


@router.get("/review", response_model=ReviewQueueOut)
def review_queue(
    status: VerificationStatus = VerificationStatus.pending,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> ReviewQueueOut:
    base = select(Lexeme).where(Lexeme.status == status)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(base.order_by(Lexeme.created_at).limit(limit).offset(offset)).all()
    return ReviewQueueOut(total=total, items=[entry_review_out(r) for r in rows])


@router.post("/review/{entry_id}", response_model=EntryReviewOut)
def review(
    entry_id: uuid.UUID,
    body: ReviewIn,
    request: Request,
    reviewer: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> EntryReviewOut:
    lex = db.get(Lexeme, entry_id)
    if lex is None:
        raise HTTPException(status_code=404, detail="Entry not found.")
    if lex.submitted_by == reviewer.id and reviewer.role != Role.admin:
        raise HTTPException(status_code=403, detail="You cannot review your own submission.")
    lex.status = VerificationStatus(body.decision)
    lex.reviewed_by = reviewer.id
    lex.reviewed_at = utcnow()
    lex.review_note = body.note
    notify(
        db,
        lex.submitted_by,
        "entry_reviewed",
        actor_id=reviewer.id,
        decision=body.decision,
        title=lex.headword,
        note=body.note,
    )
    audit(
        db,
        f"entry.{body.decision}",
        actor=reviewer,
        target_type="lexeme",
        target_id=lex.id,
        detail={"note": body.note} if body.note else None,
        request=request,
    )
    db.commit()
    return entry_review_out(lex)


@router.get("/users", response_model=UserListOut)
def list_users(
    q: str | None = Query(None, max_length=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: User = Depends(admin_required),
    db: Session = Depends(get_db),
) -> UserListOut:
    base = select(User)
    if q:
        like = f"%{q.strip().lower()}%"
        base = base.where(or_(User.email.like(like), func.lower(User.display_name).like(like)))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(base.order_by(User.created_at.desc()).limit(limit).offset(offset)).all()
    return UserListOut(total=total, items=[to_out(u) for u in rows])


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    body: UserPatch,
    request: Request,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role or status.")
    changes: dict[str, object] = {}
    if body.role is not None and body.role != user.role:
        changes["role"] = [user.role.value, body.role.value]
        user.role = body.role
    if body.is_active is not None and body.is_active != user.is_active:
        changes["is_active"] = body.is_active
        user.is_active = body.is_active
        if not body.is_active:
            db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    if changes:
        audit(
            db,
            "user.update",
            actor=admin,
            target_type="user",
            target_id=user.id,
            detail=changes,
            request=request,
        )
        db.commit()
    return to_out(user)
