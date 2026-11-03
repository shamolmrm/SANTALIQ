import re
import secrets
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.db import get_db, utcnow
from app.modules.users.models import ROLE_RANK, Role, User
from app.modules.users.security import audit, current_user, current_user_optional
from app.modules.write.models import Post, PostKind, PostReport, PostStatus

router = APIRouter(prefix="/write", tags=["write"])

ScriptCode = Literal["olck", "latn", "beng", "orya", "deva"]
MAX_BODY = 100_000
POSTS_PER_HOUR = 20


# ── Schemas ──


class AuthorOut(BaseModel):
    id: uuid.UUID
    display_name: str


class PostCardOut(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    kind: PostKind
    script: str
    excerpt: str
    status: PostStatus
    published_at: datetime | None
    updated_at: datetime | None
    author: AuthorOut


class PostOut(PostCardOut):
    body: str
    moderation_note: str | None = None


class PostListOut(BaseModel):
    total: int
    items: list[PostCardOut]


class PostIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    kind: PostKind
    script: ScriptCode
    body: str = Field(min_length=1, max_length=MAX_BODY)
    publish: bool = False


class PostPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    kind: PostKind | None = None
    script: ScriptCode | None = None
    body: str | None = Field(default=None, min_length=1, max_length=MAX_BODY)
    publish: bool | None = None


class ReportIn(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


# ── Helpers ──

_MARKUP = re.compile(r"(^#{1,3}\s+|^>\s?|^[-*]\s+|\*\*|\*|_)", re.MULTILINE)


def make_excerpt(body: str) -> str:
    text = " ".join(_MARKUP.sub("", body).split())
    return text if len(text) <= 280 else text[:277].rstrip() + "…"


def make_slug(title: str) -> str:
    ascii_part = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60].strip("-")
    suffix = secrets.token_hex(3)
    return f"{ascii_part}-{suffix}" if ascii_part else f"post-{suffix}"


def card(p: Post) -> PostCardOut:
    return PostCardOut(
        id=p.id,
        slug=p.slug,
        title=p.title,
        kind=p.kind,
        script=p.script,
        excerpt=p.excerpt,
        status=p.status,
        published_at=p.published_at,
        updated_at=p.updated_at,
        author=AuthorOut(id=p.author.id, display_name=p.author.display_name),
    )


def full(p: Post, *, include_note: bool = False) -> PostOut:
    return PostOut(
        **card(p).model_dump(),
        body=p.body,
        moderation_note=p.moderation_note if include_note else None,
    )


def is_moderator(user: User | None) -> bool:
    return user is not None and ROLE_RANK[user.role] >= ROLE_RANK[Role.reviewer]


def own_post(db: Session, post_id: uuid.UUID, user: User) -> Post:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Only the author can change this.")
    return post


# ── Public ──


@router.get("/posts", response_model=PostListOut)
def list_posts(
    kind: PostKind | None = None,
    author: uuid.UUID | None = None,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> PostListOut:
    base = select(Post).where(Post.status == PostStatus.published)
    if kind:
        base = base.where(Post.kind == kind)
    if author:
        base = base.where(Post.author_id == author)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(base.order_by(Post.published_at.desc()).limit(limit).offset(offset)).all()
    return PostListOut(total=total, items=[card(p) for p in rows])


@router.get("/posts/{slug}", response_model=PostOut)
def get_post(
    slug: str,
    user: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
) -> PostOut:
    post = db.scalar(select(Post).where(Post.slug == slug))
    is_author = post is not None and user is not None and post.author_id == user.id
    if post is None or (
        post.status != PostStatus.published and not (is_author or is_moderator(user))
    ):
        raise HTTPException(status_code=404, detail="Not found.")
    return full(post, include_note=is_author or is_moderator(user))


# ── Author ──


@router.get("/me/posts", response_model=list[PostCardOut])
def my_posts(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[PostCardOut]:
    rows = db.scalars(
        select(Post).where(Post.author_id == user.id).order_by(Post.updated_at.desc())
    ).all()
    return [card(p) for p in rows]


@router.post("/posts", response_model=PostOut, status_code=201)
async def create_post(
    body: PostIn,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> PostOut:
    if await hit_rate_limit(store, f"rl:write:{user.id}", POSTS_PER_HOUR, window_seconds=3600):
        raise HTTPException(
            status_code=429, detail="You are writing very fast! Please try again later."
        )
    post = Post(
        author_id=user.id,
        author=user,
        title=body.title.strip(),
        slug=make_slug(body.title),
        kind=body.kind,
        script=body.script,
        body=body.body,
        excerpt=make_excerpt(body.body),
        status=PostStatus.published if body.publish else PostStatus.draft,
        published_at=utcnow() if body.publish else None,
    )
    db.add(post)
    try:
        db.flush()
    except IntegrityError:  # astronomically unlikely slug clash
        db.rollback()
        raise HTTPException(status_code=409, detail="Please try again.") from None
    audit(
        db,
        "post.create",
        actor=user,
        target_type="post",
        target_id=post.id,
        detail={"published": body.publish},
        request=request,
    )
    db.commit()
    return full(post, include_note=True)


@router.patch("/posts/{post_id}", response_model=PostOut)
def update_post(
    post_id: uuid.UUID,
    body: PostPatch,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> PostOut:
    post = own_post(db, post_id, user)
    if post.status == PostStatus.removed:
        raise HTTPException(status_code=403, detail="This piece was removed by moderators.")
    if body.title is not None:
        post.title = body.title.strip()
    if body.kind is not None:
        post.kind = body.kind
    if body.script is not None:
        post.script = body.script
    if body.body is not None:
        post.body = body.body
        post.excerpt = make_excerpt(body.body)
    if body.publish is True and post.status == PostStatus.draft:
        post.status = PostStatus.published
        post.published_at = post.published_at or utcnow()
    elif body.publish is False and post.status == PostStatus.published:
        post.status = PostStatus.draft
    audit(db, "post.update", actor=user, target_type="post", target_id=post.id, request=request)
    db.commit()
    return full(post, include_note=True)


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(
    post_id: uuid.UUID,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if post.author_id != user.id and not (user.role == Role.admin):
        raise HTTPException(status_code=403, detail="Only the author can delete this.")
    audit(
        db,
        "post.delete",
        actor=user,
        target_type="post",
        target_id=post.id,
        detail={"title": post.title},
        request=request,
    )
    db.delete(post)
    db.commit()


# ── Community safety ──


@router.post("/posts/{post_id}/report", status_code=202)
def report_post(
    post_id: uuid.UUID,
    body: ReportIn,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    post = db.get(Post, post_id)
    if post is None or post.status != PostStatus.published:
        raise HTTPException(status_code=404, detail="Not found.")
    exists = db.scalar(
        select(PostReport.id).where(
            PostReport.post_id == post.id, PostReport.reporter_id == user.id
        )
    )
    if not exists:
        db.add(PostReport(post_id=post.id, reporter_id=user.id, reason=body.reason.strip()))
        audit(db, "post.report", actor=user, target_type="post", target_id=post.id, request=request)
        db.commit()
    return {"status": "Thank you. Moderators will review this."}
