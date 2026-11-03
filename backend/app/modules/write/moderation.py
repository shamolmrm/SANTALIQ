"""Moderation of SANTALIQ Write (reviewer or admin)."""

import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.db import get_db, utcnow
from app.modules.users.models import Role, User
from app.modules.users.security import audit, require_role
from app.modules.write.models import Post, PostReport, PostStatus
from app.modules.write.router import PostCardOut, card

router = APIRouter(prefix="/admin", tags=["admin"])
moderator_required = require_role(Role.reviewer)


class ReportedPostOut(BaseModel):
    post: PostCardOut
    open_reports: int
    reasons: list[str]
    last_reported_at: datetime | None


class ModerateIn(BaseModel):
    action: Literal["remove", "restore", "dismiss"]
    note: str | None = Field(default=None, max_length=1000)


@router.get("/reports", response_model=list[ReportedPostOut])
def open_reports(
    _: User = Depends(moderator_required), db: Session = Depends(get_db)
) -> list[ReportedPostOut]:
    rows = db.execute(
        select(PostReport.post_id, func.count(), func.max(PostReport.created_at))
        .where(PostReport.resolved_at.is_(None))
        .group_by(PostReport.post_id)
        .order_by(func.count().desc())
        .limit(100)
    ).all()
    out: list[ReportedPostOut] = []
    for post_id, count, last in rows:
        post = db.get(Post, post_id)
        if post is None:
            continue
        reasons = db.scalars(
            select(PostReport.reason)
            .where(PostReport.post_id == post_id, PostReport.resolved_at.is_(None))
            .limit(10)
        ).all()
        out.append(
            ReportedPostOut(
                post=card(post), open_reports=count, reasons=list(reasons), last_reported_at=last
            )
        )
    return out


@router.post("/posts/{post_id}/moderate", response_model=PostCardOut)
def moderate(
    post_id: uuid.UUID,
    body: ModerateIn,
    request: Request,
    moderator: User = Depends(moderator_required),
    db: Session = Depends(get_db),
) -> PostCardOut:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if body.action == "remove":
        post.status = PostStatus.removed
        post.moderation_note = body.note
    elif body.action == "restore":
        post.status = PostStatus.published
        post.published_at = post.published_at or utcnow()
        post.moderation_note = None
    db.execute(
        update(PostReport)
        .where(PostReport.post_id == post.id, PostReport.resolved_at.is_(None))
        .values(resolved_at=utcnow())
    )
    audit(
        db,
        f"post.moderate.{body.action}",
        actor=moderator,
        target_type="post",
        target_id=post.id,
        detail={"note": body.note} if body.note else None,
        request=request,
    )
    db.commit()
    return card(post)
