"""Public member profiles (writers and contributors) and editing your own profile.

Only public information is exposed: display name, bio, join date and counts of
published writing / verified dictionary entries. Never email, role or activity.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.language.models import Lexeme, VerificationStatus
from app.modules.users.models import User
from app.modules.users.security import audit, current_user
from app.modules.write.models import Post, PostStatus

router = APIRouter(prefix="/people", tags=["people"])


class ProfileOut(BaseModel):
    id: uuid.UUID
    display_name: str
    bio: str | None
    joined: datetime | None
    published_posts: int
    verified_entries: int


class ProfilePatch(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=500)


def profile_of(db: Session, user: User) -> ProfileOut:
    posts = db.scalar(
        select(func.count(Post.id)).where(
            Post.author_id == user.id, Post.status == PostStatus.published
        )
    )
    entries = db.scalar(
        select(func.count(Lexeme.id)).where(
            Lexeme.submitted_by == user.id, Lexeme.status == VerificationStatus.verified
        )
    )
    return ProfileOut(
        id=user.id,
        display_name=user.display_name,
        bio=user.bio,
        joined=user.created_at,
        published_posts=posts or 0,
        verified_entries=entries or 0,
    )


@router.get("/{user_id}", response_model=ProfileOut)
def get_profile(user_id: uuid.UUID, db: Session = Depends(get_db)) -> ProfileOut:
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=404, detail="Not found.")
    return profile_of(db, user)


@router.patch("/me", response_model=ProfileOut)
def update_profile(
    body: ProfilePatch,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ProfileOut:
    if body.display_name is not None:
        name = body.display_name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Display name cannot be empty.")
        user.display_name = name
    if body.bio is not None:
        user.bio = body.bio.strip() or None
    audit(db, "profile.update", actor=user, target_type="user", target_id=user.id, request=request)
    db.commit()
    return profile_of(db, user)
