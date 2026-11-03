"""Reviewed community listings for three sections:

- market: handmade goods, books, crafts — buyers contact sellers directly (no payments on SANTALIQ)
- media: photos (uploaded) and videos / podcasts / music (YouTube, SoundCloud… links)
- library: books, papers and archives about Santali (links only; we never host copyrighted files)
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin
from app.modules.language.models import VerificationStatus
from app.modules.users.models import User


class Section(enum.StrEnum):
    market = "market"
    media = "media"
    library = "library"


CATEGORIES: dict[Section, tuple[str, ...]] = {
    Section.market: ("handmade", "clothing", "books", "art", "food", "digital", "other"),
    Section.media: ("photo", "video", "podcast", "music", "other"),
    Section.library: ("book", "paper", "thesis", "archive", "dictionary", "other"),
}


class Listing(TimestampMixin, Base):
    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    section: Mapped[Section] = mapped_column(
        Enum(Section, name="listing_section", native_enum=False, length=12), index=True
    )
    category: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(500))
    contact: Mapped[str | None] = mapped_column(String(200), comment="market: how to reach seller")
    price: Mapped[str | None] = mapped_column(String(60), comment="market: free text, e.g. ₹250")
    location: Mapped[str | None] = mapped_column(String(120))
    credit: Mapped[str | None] = mapped_column(String(300), comment="author / creator / source")
    image: Mapped[str | None] = mapped_column(String(80), comment="file name in MEDIA_DIR")
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
