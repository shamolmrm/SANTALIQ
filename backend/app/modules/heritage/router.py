import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.db import get_db, utcnow
from app.modules.heritage.models import HeritageItem, HeritageKind
from app.modules.language.models import VerificationStatus
from app.modules.users.models import ROLE_RANK, Role, User
from app.modules.users.security import audit, current_user, current_user_optional, require_role
from app.modules.write.router import make_excerpt, make_slug

router = APIRouter(prefix="/heritage", tags=["heritage"])
admin_router = APIRouter(prefix="/admin/heritage", tags=["admin"])
reviewer_required = require_role(Role.reviewer)

ScriptCode = Literal["olck", "latn", "beng", "orya", "deva"]
ITEMS_PER_HOUR = 10


class PersonOut(BaseModel):
    id: uuid.UUID
    display_name: str


class ItemCardOut(BaseModel):
    id: uuid.UUID
    slug: str
    kind: HeritageKind
    title: str
    script: str
    excerpt: str
    region: str | None
    status: VerificationStatus
    created_at: datetime | None
    reviewed_at: datetime | None
    contributor: PersonOut | None


class ItemOut(ItemCardOut):
    body: str
    source: str
    review_note: str | None = None


class ItemListOut(BaseModel):
    total: int
    items: list[ItemCardOut]


class ItemIn(BaseModel):
    kind: HeritageKind
    title: str = Field(min_length=1, max_length=200)
    script: ScriptCode
    body: str = Field(min_length=20, max_length=100_000)
    region: str | None = Field(default=None, max_length=120)
    source: str = Field(min_length=3, max_length=500)
    consent: bool


class ReviewIn(BaseModel):
    decision: Literal["verified", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


class SitemapItem(BaseModel):
    slug: str
    updated_at: datetime | None


def card(i: HeritageItem) -> ItemCardOut:
    who = i.submitter
    return ItemCardOut(
        id=i.id,
        slug=i.slug,
        kind=i.kind,
        title=i.title,
        script=i.script,
        excerpt=i.excerpt,
        region=i.region,
        status=i.status,
        created_at=i.created_at,
        reviewed_at=i.reviewed_at,
        contributor=PersonOut(id=who.id, display_name=who.display_name) if who else None,
    )


def full(i: HeritageItem, *, include_note: bool = False) -> ItemOut:
    return ItemOut(
        **card(i).model_dump(),
        body=i.body,
        source=i.source,
        review_note=i.review_note if include_note else None,
    )


def _is_reviewer(user: User | None) -> bool:
    return user is not None and ROLE_RANK[user.role] >= ROLE_RANK[Role.reviewer]


# ── Public ──


@router.get("/items", response_model=ItemListOut)
def list_items(
    kind: HeritageKind | None = None,
    q: str | None = Query(None, max_length=100),
    limit: int = Query(30, ge=1, le=60),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> ItemListOut:
    base = select(HeritageItem).where(HeritageItem.status == VerificationStatus.verified)
    if kind:
        base = base.where(HeritageItem.kind == kind)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        base = base.where(
            or_(
                func.lower(HeritageItem.title).like(like),
                func.lower(HeritageItem.region).like(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.order_by(HeritageItem.reviewed_at.desc()).limit(limit).offset(offset)
    ).all()
    return ItemListOut(total=total, items=[card(i) for i in rows])


@router.get("/sitemap", response_model=list[SitemapItem])
def sitemap(db: Session = Depends(get_db)) -> list[SitemapItem]:
    rows = db.execute(
        select(HeritageItem.slug, HeritageItem.updated_at)
        .where(HeritageItem.status == VerificationStatus.verified)
        .limit(5000)
    ).all()
    return [SitemapItem(slug=s, updated_at=u) for s, u in rows]


@router.get("/items/{slug}", response_model=ItemOut)
def get_item(
    slug: str,
    user: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
) -> ItemOut:
    item = db.scalar(select(HeritageItem).where(HeritageItem.slug == slug))
    own = item is not None and user is not None and item.submitted_by == user.id
    if item is None or (
        item.status != VerificationStatus.verified and not (own or _is_reviewer(user))
    ):
        raise HTTPException(status_code=404, detail="Not found.")
    return full(item, include_note=own or _is_reviewer(user))


# ── Contributors ──


@router.get("/me/items", response_model=list[ItemOut])
def my_items(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[ItemOut]:
    rows = db.scalars(
        select(HeritageItem)
        .where(HeritageItem.submitted_by == user.id)
        .order_by(HeritageItem.created_at.desc())
    ).all()
    return [full(i, include_note=True) for i in rows]


@router.post("/items", response_model=ItemOut, status_code=201)
async def submit_item(
    body: ItemIn,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> ItemOut:
    if not body.consent:
        raise HTTPException(
            status_code=422,
            detail="Please confirm you have permission to share this with the public.",
        )
    if await hit_rate_limit(store, f"rl:heritage:{user.id}", ITEMS_PER_HOUR, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many submissions. Please try later.")
    item = HeritageItem(
        slug=make_slug(body.title),
        kind=body.kind,
        title=body.title.strip(),
        script=body.script,
        body=body.body,
        excerpt=make_excerpt(body.body),
        region=(body.region or "").strip() or None,
        source=body.source.strip(),
        consent=True,
        status=VerificationStatus.pending,
        submitted_by=user.id,
        submitter=user,
    )
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Please try again.") from None
    audit(
        db,
        "heritage.submit",
        actor=user,
        target_type="heritage",
        target_id=item.id,
        request=request,
    )
    db.commit()
    return full(item, include_note=True)


@router.delete("/items/{item_id}", status_code=204)
def withdraw_item(
    item_id: uuid.UUID,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    """Contributors can withdraw their own item at any time: consent can be revoked."""
    item = db.get(HeritageItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if item.submitted_by != user.id and user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only the contributor can withdraw this.")
    audit(
        db,
        "heritage.withdraw",
        actor=user,
        target_type="heritage",
        target_id=item.id,
        detail={"title": item.title},
        request=request,
    )
    db.delete(item)
    db.commit()


# ── Review (reviewer or admin) ──


@admin_router.get("", response_model=list[ItemOut])
def review_queue(
    status: VerificationStatus = VerificationStatus.pending,
    _: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> list[ItemOut]:
    rows = db.scalars(
        select(HeritageItem)
        .where(HeritageItem.status == status)
        .order_by(HeritageItem.created_at)
        .limit(50)
    ).all()
    return [full(i, include_note=True) for i in rows]


@admin_router.post("/{item_id}", response_model=ItemOut)
def review_item(
    item_id: uuid.UUID,
    body: ReviewIn,
    request: Request,
    reviewer: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> ItemOut:
    item = db.get(HeritageItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if item.submitted_by == reviewer.id and reviewer.role != Role.admin:
        raise HTTPException(status_code=403, detail="You cannot review your own submission.")
    item.status = VerificationStatus(body.decision)
    item.reviewed_by = reviewer.id
    item.reviewed_at = utcnow()
    item.review_note = body.note
    audit(
        db,
        f"heritage.{body.decision}",
        actor=reviewer,
        target_type="heritage",
        target_id=item.id,
        detail={"note": body.note} if body.note else None,
        request=request,
    )
    db.commit()
    return full(item, include_note=True)
