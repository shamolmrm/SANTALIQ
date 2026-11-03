"""SANTALIQ Heritage: folk stories, songs, festivals and history shared by the community.

Nothing is seeded: SANTALIQ never writes cultural content itself. Every item needs a source
(who shared it / where it comes from) and the submitter's consent, starts `pending`, and
becomes public only after a reviewer other than the submitter verifies it.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin
from app.modules.language.models import VerificationStatus
from app.modules.users.models import User


class HeritageKind(enum.StrEnum):
    folk_story = "folk_story"
    song = "song"
    festival = "festival"
    history = "history"
    craft = "craft"  # crafts, food, traditional knowledge
    other = "other"


class HeritageItem(TimestampMixin, Base):
    __tablename__ = "heritage_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    kind: Mapped[HeritageKind] = mapped_column(
        Enum(HeritageKind, name="heritage_kind", native_enum=False, length=16), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    script: Mapped[str] = mapped_column(String(4))
    body: Mapped[str] = mapped_column(Text)
    excerpt: Mapped[str] = mapped_column(String(300))
    region: Mapped[str | None] = mapped_column(String(120), comment="village / district / region")
    source: Mapped[str] = mapped_column(String(500), comment="who shared it / where it comes from")
    consent: Mapped[bool] = mapped_column(Boolean, comment="submitter confirmed permission")
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status", native_enum=False, length=16),
        default=VerificationStatus.pending,
        index=True,
    )
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_note: Mapped[str | None] = mapped_column(Text)

    submitter: Mapped[User | None] = relationship(foreign_keys=[submitted_by], lazy="joined")

    __table_args__ = (
        CheckConstraint(
            "script IN ('olck', 'latn', 'beng', 'orya', 'deva')", name="ck_heritage_script"
        ),
    )
