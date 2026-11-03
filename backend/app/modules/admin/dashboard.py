"""Admin dashboard: overview counts, activity log, system status and content listing."""

import asyncio
import shutil
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.v1.health import _ping_translate
from app.core.cache import ping_redis
from app.core.config import get_settings
from app.core.db import get_db, ping_database, utcnow
from app.modules.admin.models import SystemStatus
from app.modules.ai.models import AIUsage
from app.modules.careers.models import JobPost
from app.modules.contact.models import ContactMessage, ContactStatus
from app.modules.heritage.models import HeritageItem
from app.modules.language.models import Lexeme, VerificationStatus
from app.modules.listings.models import Listing
from app.modules.monitoring.models import ErrorEvent
from app.modules.users.models import AuditEvent, Role, User
from app.modules.users.security import require_role
from app.modules.voice.models import VoiceClip
from app.modules.write.models import Post, PostReport, PostStatus
from app.modules.write.router import PostCardOut, card

router = APIRouter(prefix="/admin", tags=["admin"])
reviewer_required = require_role(Role.reviewer)
admin_required = require_role(Role.admin)


class ReviewCounts(BaseModel):
    pending: int = 0
    verified: int = 0
    rejected: int = 0


class OverviewOut(BaseModel):
    dictionary: ReviewCounts
    heritage: ReviewCounts
    voice: ReviewCounts
    careers: ReviewCounts = ReviewCounts()
    listings: ReviewCounts = ReviewCounts()
    voice_minutes: float
    posts_published: int
    posts_removed: int
    open_reports: int
    users_total: int
    users_active: int
    users_new_7d: int
    users_by_role: dict[str, int]
    ai_requests_7d: int
    ai_tokens_7d: int
    to_review: int
    new_messages: int = 0
    open_errors: int = 0


class ActivityOut(BaseModel):
    id: uuid.UUID
    action: str
    actor: str | None
    actor_id: uuid.UUID | None
    target_type: str | None
    target_id: str | None
    detail: dict | None
    created_at: datetime


class ActivityListOut(BaseModel):
    total: int
    items: list[ActivityOut]


class SystemOut(BaseModel):
    environment: str
    checks: dict[str, bool]
    features: dict[str, bool]
    ai_model: str
    dataset_license: str
    last_backup: dict | None
    last_backup_at: datetime | None
    disk_total_gb: float | None
    disk_free_gb: float | None
    voice_storage_mb: float
    database_rows: dict[str, int]


class PostListOut(BaseModel):
    total: int
    items: list[PostCardOut]


def _counts(db: Session, column) -> ReviewCounts:  # noqa: ANN001
    rows = dict(db.execute(select(column, func.count()).group_by(column)).all())
    return ReviewCounts(
        pending=rows.get(VerificationStatus.pending, 0),
        verified=rows.get(VerificationStatus.verified, 0),
        rejected=rows.get(VerificationStatus.rejected, 0),
    )


@router.get("/overview", response_model=OverviewOut)
def overview(_: User = Depends(reviewer_required), db: Session = Depends(get_db)) -> OverviewOut:
    week = utcnow() - timedelta(days=7)
    dictionary = _counts(db, Lexeme.status)
    heritage = _counts(db, HeritageItem.status)
    voice = _counts(db, VoiceClip.status)
    careers = _counts(db, JobPost.status)
    listings = _counts(db, Listing.status)
    voice_ms = db.scalar(
        select(func.coalesce(func.sum(VoiceClip.duration_ms), 0)).where(
            VoiceClip.status == VerificationStatus.verified
        )
    )
    posts = dict(db.execute(select(Post.status, func.count()).group_by(Post.status)).all())
    reports = db.scalar(
        select(func.count(func.distinct(PostReport.post_id))).where(
            PostReport.resolved_at.is_(None)
        )
    )
    roles = dict(db.execute(select(User.role, func.count()).group_by(User.role)).all())
    ai_requests, ai_tokens = db.execute(
        select(
            func.count(AIUsage.id),
            func.coalesce(func.sum(AIUsage.input_tokens + AIUsage.output_tokens), 0),
        ).where(AIUsage.created_at >= week)
    ).one()
    return OverviewOut(
        dictionary=dictionary,
        heritage=heritage,
        voice=voice,
        careers=careers,
        listings=listings,
        voice_minutes=round((voice_ms or 0) / 60000, 1),
        posts_published=posts.get(PostStatus.published, 0),
        posts_removed=posts.get(PostStatus.removed, 0),
        open_reports=reports or 0,
        users_total=sum(roles.values()),
        users_active=db.scalar(select(func.count()).where(User.is_active.is_(True))) or 0,
        users_new_7d=db.scalar(select(func.count()).where(User.created_at >= week)) or 0,
        users_by_role={str(r): n for r, n in roles.items()},
        ai_requests_7d=ai_requests,
        ai_tokens_7d=ai_tokens,
        to_review=dictionary.pending
        + heritage.pending
        + voice.pending
        + careers.pending
        + listings.pending
        + (reports or 0),
        new_messages=db.scalar(
            select(func.count(ContactMessage.id)).where(ContactMessage.status == ContactStatus.new)
        )
        or 0,
        open_errors=db.scalar(
            select(func.count(ErrorEvent.id)).where(ErrorEvent.resolved.is_(False))
        )
        or 0,
    )


@router.get("/activity", response_model=ActivityListOut)
def activity(
    action: str | None = Query(None, max_length=64, description="prefix, e.g. 'voice.'"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: User = Depends(admin_required),
    db: Session = Depends(get_db),
) -> ActivityListOut:
    """Audit log (IP addresses are not shown)."""
    base = select(AuditEvent, User.display_name).outerjoin(User, User.id == AuditEvent.actor_id)
    if action:
        base = base.where(AuditEvent.action.like(f"{action.strip()}%"))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(AuditEvent.created_at.desc()).limit(limit).offset(offset)).all()
    return ActivityListOut(
        total=total,
        items=[
            ActivityOut(
                id=e.id,
                action=e.action,
                actor=name,
                actor_id=e.actor_id,
                target_type=e.target_type,
                target_id=e.target_id,
                detail=e.detail,
                created_at=e.created_at,
            )
            for e, name in rows
        ],
    )


@router.get("/system", response_model=SystemOut)
async def system(_: User = Depends(admin_required), db: Session = Depends(get_db)) -> SystemOut:
    """Service health, feature switches and storage. Never returns secrets."""
    s = get_settings()
    database, redis, translate = await asyncio.gather(
        asyncio.to_thread(ping_database), ping_redis(), _ping_translate()
    )
    backup = db.get(SystemStatus, "last_backup")
    try:
        usage = shutil.disk_usage(s.voice_dir)
        total, free = round(usage.total / 1e9, 1), round(usage.free / 1e9, 1)
    except OSError:
        total = free = None
    voice_bytes = db.scalar(select(func.coalesce(func.sum(VoiceClip.size_bytes), 0))) or 0
    rows = {
        "users": db.scalar(select(func.count()).select_from(User)) or 0,
        "dictionary_entries": db.scalar(select(func.count()).select_from(Lexeme)) or 0,
        "posts": db.scalar(select(func.count()).select_from(Post)) or 0,
        "heritage_items": db.scalar(select(func.count()).select_from(HeritageItem)) or 0,
        "voice_clips": db.scalar(select(func.count()).select_from(VoiceClip)) or 0,
        "audit_events": db.scalar(select(func.count()).select_from(AuditEvent)) or 0,
    }
    return SystemOut(
        environment=s.environment,
        checks={"database": database, "redis": redis, "translate": translate},
        features={
            "ai_chat": bool(s.anthropic_api_key),
            "google_translate": bool(s.google_translate_api_key),
            "email": s.email_enabled,
        },
        ai_model=s.ai_model,
        dataset_license=s.dataset_license,
        last_backup=backup.value if backup else None,
        last_backup_at=backup.updated_at if backup else None,
        disk_total_gb=total,
        disk_free_gb=free,
        voice_storage_mb=round(voice_bytes / 1e6, 2),
        database_rows=rows,
    )


@router.get("/posts", response_model=PostListOut)
def all_posts(
    status: PostStatus | None = None,
    q: str | None = Query(None, max_length=100),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> PostListOut:
    """Published and removed pieces (drafts stay private to their authors)."""
    base = select(Post).join(User, User.id == Post.author_id)
    base = base.where(
        Post.status == status
        if status and status != PostStatus.draft
        else Post.status.in_([PostStatus.published, PostStatus.removed])
    )
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        base = base.where(
            or_(func.lower(Post.title).like(like), func.lower(User.display_name).like(like))
        )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(base.order_by(Post.updated_at.desc()).limit(limit).offset(offset)).all()
    return PostListOut(total=total, items=[card(p) for p in rows])
