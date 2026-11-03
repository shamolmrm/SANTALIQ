import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.db import get_db
from app.modules.notify.service import notify
from app.modules.social.models import Comment, Follow
from app.modules.users.models import ROLE_RANK, Role, User
from app.modules.users.security import audit, current_user, current_user_optional
from app.modules.write.models import Post, PostStatus
from app.modules.write.router import PostListOut, card

router = APIRouter(tags=["social"])
COMMENTS_PER_HOUR = 30


class FollowOut(BaseModel):
    followers: int
    following: int
    i_follow: bool


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: uuid.UUID
    body: str
    created_at: datetime
    author_id: uuid.UUID
    author_name: str
    can_delete: bool


# ── Follow ──


def _follow_out(db: Session, user_id: uuid.UUID, me: User | None) -> FollowOut:
    followers = db.scalar(select(func.count()).where(Follow.followee_id == user_id)) or 0
    following = db.scalar(select(func.count()).where(Follow.follower_id == user_id)) or 0
    mine = bool(me and db.get(Follow, {"follower_id": me.id, "followee_id": user_id}))
    return FollowOut(followers=followers, following=following, i_follow=mine)


def _active_user(db: Session, user_id: uuid.UUID) -> User:
    u = db.get(User, user_id)
    if u is None or not u.is_active:
        raise HTTPException(status_code=404, detail="Not found.")
    return u


@router.get("/people/{user_id}/follow", response_model=FollowOut)
def follow_status(
    user_id: uuid.UUID,
    me: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
) -> FollowOut:
    _active_user(db, user_id)
    return _follow_out(db, user_id, me)


@router.post("/people/{user_id}/follow", response_model=FollowOut)
def follow(
    user_id: uuid.UUID, me: User = Depends(current_user), db: Session = Depends(get_db)
) -> FollowOut:
    _active_user(db, user_id)
    if user_id == me.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself.")
    if not db.get(Follow, {"follower_id": me.id, "followee_id": user_id}):
        db.add(Follow(follower_id=me.id, followee_id=user_id))
        notify(db, user_id, "follow", actor_id=me.id, actor=me.display_name, who=me.id)
        db.commit()
    return _follow_out(db, user_id, me)


@router.delete("/people/{user_id}/follow", response_model=FollowOut)
def unfollow(
    user_id: uuid.UUID, me: User = Depends(current_user), db: Session = Depends(get_db)
) -> FollowOut:
    db.execute(delete(Follow).where(Follow.follower_id == me.id, Follow.followee_id == user_id))
    db.commit()
    return _follow_out(db, user_id, me)


@router.get("/feed", response_model=PostListOut)
def feed(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    me: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> PostListOut:
    """Published writing from the people you follow, newest first."""
    followed = select(Follow.followee_id).where(Follow.follower_id == me.id)
    base = select(Post).where(Post.status == PostStatus.published, Post.author_id.in_(followed))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(base.order_by(Post.published_at.desc()).limit(limit).offset(offset)).all()
    return PostListOut(total=total, items=[card(p) for p in rows])


# ── Comments ──


def _can_delete(c: Comment, post: Post, me: User | None) -> bool:
    return me is not None and (
        c.author_id == me.id
        or post.author_id == me.id
        or ROLE_RANK[me.role] >= ROLE_RANK[Role.reviewer]
    )


def _comment_out(c: Comment, post: Post, me: User | None) -> CommentOut:
    return CommentOut(
        id=c.id,
        body=c.body,
        created_at=c.created_at,
        author_id=c.author_id,
        author_name=c.author.display_name,
        can_delete=_can_delete(c, post, me),
    )


def _published_post(db: Session, post_id: uuid.UUID) -> Post:
    post = db.get(Post, post_id)
    if post is None or post.status != PostStatus.published:
        raise HTTPException(status_code=404, detail="Not found.")
    return post


@router.get("/write/posts/{post_id}/comments", response_model=list[CommentOut])
def list_comments(
    post_id: uuid.UUID,
    me: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
) -> list[CommentOut]:
    post = _published_post(db, post_id)
    rows = db.scalars(
        select(Comment)
        .where(Comment.post_id == post.id, Comment.removed.is_(False))
        .order_by(Comment.created_at)
        .limit(300)
    ).all()
    return [_comment_out(c, post, me) for c in rows]


@router.post("/write/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(
    post_id: uuid.UUID,
    body: CommentIn,
    request: Request,
    me: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> CommentOut:
    post = _published_post(db, post_id)
    if await hit_rate_limit(store, f"rl:comment:{me.id}", COMMENTS_PER_HOUR, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many comments. Please slow down.")
    c = Comment(post_id=post.id, author_id=me.id, author=me, body=body.body.strip())
    db.add(c)
    notify(
        db,
        post.author_id,
        "comment",
        actor_id=me.id,
        actor=me.display_name,
        title=post.title,
        slug=post.slug,
    )
    db.flush()
    audit(db, "comment.create", actor=me, target_type="comment", target_id=c.id, request=request)
    db.commit()
    return _comment_out(c, post, me)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: uuid.UUID,
    request: Request,
    me: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    c = db.get(Comment, comment_id)
    if c is None or c.removed:
        raise HTTPException(status_code=404, detail="Not found.")
    post = db.get(Post, c.post_id)
    if post is None or not _can_delete(c, post, me):
        raise HTTPException(status_code=403, detail="You cannot remove this comment.")
    c.removed = True
    audit(db, "comment.remove", actor=me, target_type="comment", target_id=c.id, request=request)
    db.commit()
