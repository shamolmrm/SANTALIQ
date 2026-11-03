import re
import uuid
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.config import get_settings
from app.core.db import get_db, utcnow
from app.modules.language.models import VerificationStatus
from app.modules.listings.models import CATEGORIES, Listing, Section
from app.modules.notify.service import notify
from app.modules.users.models import ROLE_RANK, Role, User
from app.modules.users.security import audit, current_user, current_user_optional, require_role

router = APIRouter(prefix="/listings", tags=["listings"])
admin_router = APIRouter(prefix="/admin/listings", tags=["admin"])
reviewer_required = require_role(Role.reviewer)
PER_HOUR = 10
MAX_IMAGE = 3 * 1024 * 1024
MAX_IMAGES = 4
CURRENCIES = ("INR", "BDT", "NPR", "USD")
Sort = Literal["new", "price_asc", "price_desc"]


def media_root() -> Path:
    return Path(get_settings().media_dir)


def sniff_image(data: bytes) -> tuple[str, str] | None:
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg", "jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png", "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None


class ListingOut(BaseModel):
    id: uuid.UUID
    section: Section
    category: str
    title: str
    description: str
    url: str | None
    contact: str | None
    price: str | None
    price_amount: float | None
    currency: str | None
    stock: int | None
    whatsapp: str | None
    image_urls: list[str]
    location: str | None
    credit: str | None
    image_url: str | None
    status: VerificationStatus
    created_at: datetime | None
    posted_by: str | None
    posted_by_id: uuid.UUID | None
    review_note: str | None = None


class ReviewIn(BaseModel):
    decision: Literal["verified", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


def out(x: Listing, *, include_note: bool = False) -> ListingOut:
    return ListingOut(
        id=x.id,
        section=x.section,
        category=x.category,
        title=x.title,
        description=x.description,
        url=x.url,
        contact=x.contact,
        price=x.price,
        price_amount=float(x.price_amount) if x.price_amount is not None else None,
        currency=x.currency,
        stock=x.stock,
        whatsapp=x.whatsapp,
        image_urls=[f"/api/v1/listings/{x.id}/image?n={i}" for i in range(len(_files(x)))],
        location=x.location,
        credit=x.credit,
        image_url=f"/api/v1/listings/{x.id}/image" if x.image else None,
        status=x.status,
        created_at=x.created_at,
        posted_by=x.submitter.display_name if x.submitter else None,
        posted_by_id=x.submitted_by,
        review_note=x.review_note if include_note else None,
    )


def _files(x: Listing) -> list[str]:
    return ([x.image] if x.image else []) + list(x.images or [])


def _staff(user: User | None) -> bool:
    return user is not None and ROLE_RANK[user.role] >= ROLE_RANK[Role.reviewer]


def _visible(x: Listing | None, user: User | None) -> Listing:
    if x is None or (
        x.status != VerificationStatus.verified
        and not (_staff(user) or (user is not None and x.submitted_by == user.id))
    ):
        raise HTTPException(status_code=404, detail="Not found.")
    return x


@router.get("", response_model=list[ListingOut])
def list_listings(
    section: Section,
    category: str | None = Query(None, max_length=20),
    q: str | None = Query(None, max_length=100),
    seller: uuid.UUID | None = None,
    sort: Sort = "new",
    db: Session = Depends(get_db),
) -> list[ListingOut]:
    stmt = select(Listing).where(
        Listing.section == section, Listing.status == VerificationStatus.verified
    )
    if category:
        stmt = stmt.where(Listing.category == category)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(func.lower(Listing.title).like(like), func.lower(Listing.description).like(like))
        )
    if seller:
        stmt = stmt.where(Listing.submitted_by == seller)
    order = {
        "new": [Listing.reviewed_at.desc()],
        "price_asc": [Listing.price_amount.asc().nulls_last(), Listing.reviewed_at.desc()],
        "price_desc": [Listing.price_amount.desc().nulls_last(), Listing.reviewed_at.desc()],
    }[sort]
    rows = db.scalars(stmt.order_by(*order).limit(120)).all()
    return [out(x) for x in rows]


@router.get("/mine", response_model=list[ListingOut])
def my_listings(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ListingOut]:
    rows = db.scalars(
        select(Listing).where(Listing.submitted_by == user.id).order_by(Listing.created_at.desc())
    ).all()
    return [out(x, include_note=True) for x in rows]


@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(
    listing_id: uuid.UUID,
    user: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
) -> ListingOut:
    x = _visible(db.get(Listing, listing_id), user)
    return out(x, include_note=_staff(user) or (user is not None and x.submitted_by == user.id))


@router.get("/{listing_id}/image")
def listing_image(
    listing_id: uuid.UUID,
    n: int = Query(0, ge=0, lt=MAX_IMAGES),
    user: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
) -> FileResponse:
    x = _visible(db.get(Listing, listing_id), user)
    files = _files(x)
    if n >= len(files) or not (media_root() / files[n]).is_file():
        raise HTTPException(status_code=404, detail="Not found.")
    path = media_root() / files[n]
    mime = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[files[n].split(".")[-1]]
    return FileResponse(path, media_type=mime, headers={"Cache-Control": "public, max-age=86400"})


@router.post("", response_model=ListingOut, status_code=201)
async def create_listing(
    request: Request,
    section: Annotated[Section, Form()],
    category: Annotated[str, Form(max_length=20)],
    title: Annotated[str, Form(min_length=3, max_length=200)],
    description: Annotated[str, Form(min_length=10, max_length=10_000)],
    url: Annotated[str | None, Form(max_length=500, pattern=r"^https://\S+$")] = None,
    contact: Annotated[str | None, Form(max_length=200)] = None,
    price: Annotated[str | None, Form(max_length=60)] = None,
    location: Annotated[str | None, Form(max_length=120)] = None,
    credit: Annotated[str | None, Form(max_length=300)] = None,
    price_amount: Annotated[float | None, Form(ge=0, le=10_000_000)] = None,
    currency: Annotated[str | None, Form(max_length=3)] = None,
    stock: Annotated[int | None, Form(ge=0, le=100_000)] = None,
    whatsapp: Annotated[str | None, Form(max_length=20)] = None,
    image: Annotated[UploadFile | None, File()] = None,
    images: Annotated[list[UploadFile] | None, File()] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> ListingOut:
    if category not in CATEGORIES[section]:
        raise HTTPException(status_code=422, detail="Unknown category.")
    if await hit_rate_limit(store, f"rl:listing:{user.id}", PER_HOUR, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many listings. Please try later.")
    uploads = [u for u in [image, *(images or [])] if u is not None and u.filename]
    if len(uploads) > MAX_IMAGES:
        raise HTTPException(status_code=422, detail="Up to 4 photos.")
    pictures: list[tuple[bytes, str]] = []
    for u in uploads:
        blob = await u.read(MAX_IMAGE + 1)
        if len(blob) > MAX_IMAGE:
            raise HTTPException(status_code=413, detail="Image is too large (max 3 MB).")
        kind = sniff_image(blob)
        if kind is None:
            raise HTTPException(status_code=422, detail="Image must be JPEG, PNG or WebP.")
        pictures.append((blob, kind[1]))
    data = bool(pictures)
    whatsapp = (whatsapp or "").replace(" ", "").replace("-", "") or None
    if whatsapp and not re.fullmatch(r"\+?[0-9]{8,15}", whatsapp):
        raise HTTPException(status_code=422, detail="WhatsApp number: digits with country code.")
    contact = (contact or "").strip() or None
    credit = (credit or "").strip() or None
    if section == Section.market:
        if not (contact or whatsapp):
            raise HTTPException(status_code=422, detail="Add how buyers can contact you.")
        if price_amount is None or currency not in CURRENCIES:
            raise HTTPException(status_code=422, detail="Add the price and currency.")
    if section == Section.media and category == "photo" and not data:
        raise HTTPException(status_code=422, detail="Add the photo.")
    if section == Section.media and category != "photo" and not url:
        raise HTTPException(status_code=422, detail="Add the link (YouTube, SoundCloud…).")
    if section == Section.library and not (url or credit):
        raise HTTPException(status_code=422, detail="Add a link or the author / publisher.")

    market = section == Section.market
    amount = Decimal(str(round(price_amount, 2))) if market and price_amount is not None else None
    x = Listing(
        id=uuid.uuid4(),
        section=section,
        category=category,
        title=title.strip(),
        description=description.strip(),
        url=url,
        contact=contact,
        price=(price or "").strip() or None,
        price_amount=amount,
        currency=currency if section == Section.market else None,
        stock=stock if section == Section.market else None,
        whatsapp=whatsapp if section == Section.market else None,
        location=(location or "").strip() or None,
        credit=credit,
        status=VerificationStatus.pending,
        submitted_by=user.id,
        submitter=user,
    )
    if pictures:
        root = media_root()
        root.mkdir(parents=True, exist_ok=True)
        names = [f"{x.id}-{i}.{ext}" for i, (_, ext) in enumerate(pictures)]
        for name, (blob, _) in zip(names, pictures, strict=True):
            (root / name).write_bytes(blob)
        x.image, x.images = names[0], names[1:] or None
    db.add(x)
    audit(db, "listing.submit", actor=user, target_type="listing", target_id=x.id, request=request)
    db.commit()
    return out(x, include_note=True)


@router.delete("/{listing_id}", status_code=204)
def delete_listing(
    listing_id: uuid.UUID,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    x = db.get(Listing, listing_id)
    if x is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if x.submitted_by != user.id and user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only the poster can remove this.")
    for name in _files(x):
        (media_root() / name).unlink(missing_ok=True)
    audit(db, "listing.delete", actor=user, target_type="listing", target_id=x.id, request=request)
    db.delete(x)
    db.commit()


@admin_router.get("", response_model=list[ListingOut])
def review_queue(
    section: Section | None = None,
    status: VerificationStatus = VerificationStatus.pending,
    _: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> list[ListingOut]:
    stmt = select(Listing).where(Listing.status == status)
    if section:
        stmt = stmt.where(Listing.section == section)
    rows = db.scalars(stmt.order_by(Listing.created_at).limit(60)).all()
    return [out(x, include_note=True) for x in rows]


@admin_router.post("/{listing_id}", response_model=ListingOut)
def review_listing(
    listing_id: uuid.UUID,
    body: ReviewIn,
    request: Request,
    reviewer: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> ListingOut:
    x = db.get(Listing, listing_id)
    if x is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if x.submitted_by == reviewer.id and reviewer.role != Role.admin:
        raise HTTPException(status_code=403, detail="You cannot review your own listing.")
    x.status = VerificationStatus(body.decision)
    x.reviewed_by = reviewer.id
    x.reviewed_at = utcnow()
    x.review_note = body.note
    notify(
        db,
        x.submitted_by,
        "listing_reviewed",
        actor_id=reviewer.id,
        decision=body.decision,
        title=x.title,
        id=x.id,
        section=x.section.value,
        note=body.note,
    )
    audit(
        db,
        f"listing.{body.decision}",
        actor=reviewer,
        target_type="listing",
        target_id=x.id,
        request=request,
    )
    db.commit()
    return out(x, include_note=True)
