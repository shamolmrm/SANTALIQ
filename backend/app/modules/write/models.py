"""SANTALIQ Write: articles, poetry, stories, essays and journals written by members."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin
from app.modules.users.models import User


class PostKind(enum.StrEnum):
    article = "article"
    poetry = "poetry"
    story = "story"
    essay = "essay"
    journal = "journal"


class PostStatus(enum.StrEnum):
    draft = "draft"
    published = "published"
    removed = "removed"  # taken down by moderation


class Post(TimestampMixin, Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    kind: Mapped[PostKind] = mapped_column(
        Enum(PostKind, name="post_kind", native_enum=False, length=16), index=True
    )
    script: Mapped[str] = mapped_column(String(4), comment="script the body is written in")
    body: Mapped[str] = mapped_column(Text)
    excerpt: Mapped[str] = mapped_column(String(300))
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus, name="post_status", native_enum=False, length=16),
        default=PostStatus.draft,
        index=True,
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    moderation_note: Mapped[str | None] = mapped_column(Text)

    author: Mapped[User] = relationship(lazy="joined")

    __table_args__ = (
        CheckConstraint(
            "script IN ('olck', 'latn', 'beng', 'orya', 'deva')", name="ck_posts_script"
        ),
    )


class PostReport(Base):
    __tablename__ = "post_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), index=True
    )
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    reason: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)

    __table_args__ = (
        UniqueConstraint("post_id", "reporter_id", name="uq_post_reports_post_reporter"),
    )
