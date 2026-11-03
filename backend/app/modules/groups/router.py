import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.db import get_db
from app.modules.groups.models import Group, GroupMember, GroupPost
from app.modules.users.models import ROLE_RANK, Role, User
from app.modules.users.security import audit, current_user, current_user_optional
from app.modules.write.router import make_slug

router = APIRouter(prefix="/groups", tags=["groups"])
GROUPS_PER_DAY = 3
POSTS_PER_HOUR = 30


class GroupIn(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=2000)


class GroupOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str
    members: int
    posts: int
    i_am_member: bool
    i_own: bool


class GroupPostIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class GroupPostOut(BaseModel):
    id: uuid.UUID
    body: str
    created_at: datetime
    author_id: uuid.UUID
    author_name: str
    can_delete: bool


def _staff(u: User | None) -> bool:
    return u is not None and ROLE_RANK[u.role] >= ROLE_RANK[Role.reviewer]


def _out(db: Session, g: Group, me: User | None) -> GroupOut:
    members = db.scalar(select(func.count()).where(GroupMember.group_id == g.id)) or 0
    posts = (
        db.scalar(
            select(func.count()).where(GroupPost.group_id == g.id, GroupPost.removed.is_(False))
        )
        or 0
    )
    m = db.get(GroupMember, {"group_id": g.id, "user_id": me.id}) if me else None
    return GroupOut(
        id=g.id,
        slug=g.slug,
        name=g.name,
        description=g.description,
        members=members,
        posts=posts,
        i_am_member=m is not None,
        i_own=bool(m and m.is_owner),
    )


def _group(db: Session, slug: str) -> Group:
    g = db.scalar(select(Group).where(Group.slug == slug))
    if g is None:
        raise HTTPException(status_code=404, detail="Not found.")
    return g


@router.get("", response_model=list[GroupOut])
def list_groups(
    me: User | None = Depends(current_user_optional), db: Session = Depends(get_db)
) -> list[GroupOut]:
    rows = db.scalars(select(Group).order_by(Group.created_at.desc()).limit(200)).all()
    return sorted((_out(db, g, me) for g in rows), key=lambda o: -o.members)


@router.post("", response_model=GroupOut, status_code=201)
async def create_group(
    body: GroupIn,
    request: Request,
    me: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> GroupOut:
    if await hit_rate_limit(store, f"rl:group:{me.id}", GROUPS_PER_DAY, window_seconds=86400):
        raise HTTPException(status_code=429, detail="You can create 3 groups a day.")
    g = Group(slug=make_slug(body.name), name=body.name.strip(), description=body.description)
    g.created_by = me.id
    db.add(g)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Please try again.") from None
    db.add(GroupMember(group_id=g.id, user_id=me.id, is_owner=True))
    audit(db, "group.create", actor=me, target_type="group", target_id=g.id, request=request)
    db.commit()
    return _out(db, g, me)


@router.get("/{slug}", response_model=GroupOut)
def get_group(
    slug: str, me: User | None = Depends(current_user_optional), db: Session = Depends(get_db)
) -> GroupOut:
    return _out(db, _group(db, slug), me)


@router.post("/{slug}/join", response_model=GroupOut)
def join(slug: str, me: User = Depends(current_user), db: Session = Depends(get_db)) -> GroupOut:
    g = _group(db, slug)
    if not db.get(GroupMember, {"group_id": g.id, "user_id": me.id}):
        db.add(GroupMember(group_id=g.id, user_id=me.id))
        db.commit()
    return _out(db, g, me)


@router.post("/{slug}/leave", response_model=GroupOut)
def leave(slug: str, me: User = Depends(current_user), db: Session = Depends(get_db)) -> GroupOut:
    g = _group(db, slug)
    db.execute(
        delete(GroupMember).where(
            GroupMember.group_id == g.id,
            GroupMember.user_id == me.id,
            GroupMember.is_owner.is_(False),
        )
    )
    db.commit()
    return _out(db, g, me)


@router.delete("/{slug}", status_code=204)
def delete_group(
    slug: str, request: Request, me: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    g = _group(db, slug)
    owner = db.get(GroupMember, {"group_id": g.id, "user_id": me.id})
    if not ((owner and owner.is_owner) or me.role == Role.admin):
        raise HTTPException(status_code=403, detail="Only the group owner can delete it.")
    audit(db, "group.delete", actor=me, target_type="group", target_id=g.id, request=request)
    db.delete(g)
    db.commit()


def _post_out(p: GroupPost, g: Group, db: Session, me: User | None) -> GroupPostOut:
    owner = db.get(GroupMember, {"group_id": g.id, "user_id": me.id}) if me else None
    can = me is not None and (p.author_id == me.id or _staff(me) or bool(owner and owner.is_owner))
    return GroupPostOut(
        id=p.id,
        body=p.body,
        created_at=p.created_at,
        author_id=p.author_id,
        author_name=p.author.display_name,
        can_delete=can,
    )


@router.get("/{slug}/posts", response_model=list[GroupPostOut])
def list_posts(
    slug: str, me: User | None = Depends(current_user_optional), db: Session = Depends(get_db)
) -> list[GroupPostOut]:
    g = _group(db, slug)
    rows = db.scalars(
        select(GroupPost)
        .where(GroupPost.group_id == g.id, GroupPost.removed.is_(False))
        .order_by(GroupPost.created_at.desc())
        .limit(100)
    ).all()
    return [_post_out(p, g, db, me) for p in rows]


@router.post("/{slug}/posts", response_model=GroupPostOut, status_code=201)
async def add_post(
    slug: str,
    body: GroupPostIn,
    me: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> GroupPostOut:
    g = _group(db, slug)
    if not db.get(GroupMember, {"group_id": g.id, "user_id": me.id}):
        raise HTTPException(status_code=403, detail="Join the group to post.")
    if await hit_rate_limit(store, f"rl:gpost:{me.id}", POSTS_PER_HOUR, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many posts. Please slow down.")
    p = GroupPost(group_id=g.id, author_id=me.id, author=me, body=body.body.strip())
    db.add(p)
    db.commit()
    return _post_out(p, g, db, me)


@router.delete("/{slug}/posts/{post_id}", status_code=204)
def remove_post(
    slug: str,
    post_id: uuid.UUID,
    request: Request,
    me: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    g = _group(db, slug)
    p = db.get(GroupPost, post_id)
    if p is None or p.group_id != g.id or p.removed:
        raise HTTPException(status_code=404, detail="Not found.")
    if not _post_out(p, g, db, me).can_delete:
        raise HTTPException(status_code=403, detail="You cannot remove this post.")
    p.removed = True
    audit(
        db, "group.post.remove", actor=me, target_type="group_post", target_id=p.id, request=request
    )
    db.commit()
