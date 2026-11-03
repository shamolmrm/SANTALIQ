import uuid
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.db import get_db, utcnow
from app.modules.careers.models import JobKind, JobPost
from app.modules.language.models import VerificationStatus
from app.modules.notify.service import notify
from app.modules.users.models import ROLE_RANK, Role, User
from app.modules.users.router import EMAIL_PATTERN
from app.modules.users.security import audit, current_user, current_user_optional, require_role

router = APIRouter(prefix="/careers", tags=["careers"])
admin_router = APIRouter(prefix="/admin/careers", tags=["admin"])
reviewer_required = require_role(Role.reviewer)
POSTS_PER_HOUR = 5


class JobIn(BaseModel):
    kind: JobKind
    title: str = Field(min_length=3, max_length=200)
    organization: str = Field(min_length=2, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    description: str = Field(min_length=20, max_length=10_000)
    apply_url: str | None = Field(default=None, max_length=500, pattern=r"^https://\S+$")
    apply_email: str | None = Field(default=None, max_length=254, pattern=EMAIL_PATTERN)
    deadline: date | None = None

    @model_validator(mode="after")
    def how_to_apply(self) -> "JobIn":
        if not self.apply_url and not self.apply_email:
            raise ValueError("Give an application link (https://…) or an email address.")
        return self


class JobOut(BaseModel):
    id: uuid.UUID
    kind: JobKind
    title: str
    organization: str
    location: str | None
    description: str
    apply_url: str | None
    apply_email: str | None
    deadline: date | None
    status: VerificationStatus
    created_at: datetime | None
    review_note: str | None = None
    posted_by: str | None = None


class ReviewIn(BaseModel):
    decision: Literal["verified", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


def out(j: JobPost, *, include_note: bool = False) -> JobOut:
    return JobOut(
        id=j.id,
        kind=j.kind,
        title=j.title,
        organization=j.organization,
        location=j.location,
        description=j.description,
        apply_url=j.apply_url,
        apply_email=j.apply_email,
        deadline=j.deadline,
        status=j.status,
        created_at=j.created_at,
        review_note=j.review_note if include_note else None,
        posted_by=j.submitter.display_name if j.submitter else None,
    )


def _open() -> object:
    return or_(JobPost.deadline.is_(None), JobPost.deadline >= date.today())


@router.get("", response_model=list[JobOut])
def list_jobs(kind: JobKind | None = None, db: Session = Depends(get_db)) -> list[JobOut]:
    q = select(JobPost).where(JobPost.status == VerificationStatus.verified, _open())
    if kind:
        q = q.where(JobPost.kind == kind)
    rows = db.scalars(q.order_by(JobPost.reviewed_at.desc()).limit(100)).all()
    return [out(j) for j in rows]


@router.get("/mine", response_model=list[JobOut])
def my_jobs(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[JobOut]:
    rows = db.scalars(
        select(JobPost).where(JobPost.submitted_by == user.id).order_by(JobPost.created_at.desc())
    ).all()
    return [out(j, include_note=True) for j in rows]


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: uuid.UUID,
    user: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
) -> JobOut:
    j = db.get(JobPost, job_id)
    own = j is not None and user is not None and j.submitted_by == user.id
    staff = user is not None and ROLE_RANK[user.role] >= ROLE_RANK[Role.reviewer]
    if j is None or (j.status != VerificationStatus.verified and not (own or staff)):
        raise HTTPException(status_code=404, detail="Not found.")
    return out(j, include_note=own or staff)


@router.post("", response_model=JobOut, status_code=201)
async def submit_job(
    body: JobIn,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> JobOut:
    if await hit_rate_limit(store, f"rl:jobs:{user.id}", POSTS_PER_HOUR, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many listings. Please try later.")
    if body.deadline and body.deadline < date.today():
        raise HTTPException(status_code=422, detail="The deadline has already passed.")
    j = JobPost(
        **body.model_dump(),
        status=VerificationStatus.pending,
        submitted_by=user.id,
        submitter=user,
    )
    db.add(j)
    db.flush()
    audit(db, "job.submit", actor=user, target_type="job", target_id=j.id, request=request)
    db.commit()
    return out(j, include_note=True)


@router.delete("/{job_id}", status_code=204)
def withdraw_job(
    job_id: uuid.UUID,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    j = db.get(JobPost, job_id)
    if j is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if j.submitted_by != user.id and user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only the poster can remove this.")
    audit(db, "job.withdraw", actor=user, target_type="job", target_id=j.id, request=request)
    db.delete(j)
    db.commit()


@admin_router.get("", response_model=list[JobOut])
def review_queue(
    status: VerificationStatus = VerificationStatus.pending,
    _: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> list[JobOut]:
    rows = db.scalars(
        select(JobPost).where(JobPost.status == status).order_by(JobPost.created_at).limit(50)
    ).all()
    return [out(j, include_note=True) for j in rows]


@admin_router.post("/{job_id}", response_model=JobOut)
def review_job(
    job_id: uuid.UUID,
    body: ReviewIn,
    request: Request,
    reviewer: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> JobOut:
    j = db.get(JobPost, job_id)
    if j is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if j.submitted_by == reviewer.id and reviewer.role != Role.admin:
        raise HTTPException(status_code=403, detail="You cannot review your own listing.")
    j.status = VerificationStatus(body.decision)
    j.reviewed_by = reviewer.id
    j.reviewed_at = utcnow()
    j.review_note = body.note
    notify(
        db,
        j.submitted_by,
        "job_reviewed",
        actor_id=reviewer.id,
        decision=body.decision,
        title=j.title,
        id=j.id,
        note=body.note,
    )
    audit(
        db,
        f"job.{body.decision}",
        actor=reviewer,
        target_type="job",
        target_id=j.id,
        request=request,
    )
    db.commit()
    return out(j, include_note=True)
