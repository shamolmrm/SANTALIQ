"""Language data domain: Santali words with per-script spellings, meanings and provenance.

Nothing here is seeded. Entries are created by verified contributors (future auth module)
and only `verified` entries are served publicly.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

SCRIPTS = ("olck", "latn", "beng", "orya", "deva")


class VerificationStatus(enum.StrEnum):
    draft = "draft"  # entered, not yet submitted for review
    pending = "pending"  # awaiting native-speaker review
    verified = "verified"  # approved; public and usable for AI
    rejected = "rejected"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Lexeme(TimestampMixin, Base):
    """A Santali word or expression. `headword` is the canonical Ol Chiki form."""

    __tablename__ = "lexemes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    headword: Mapped[str] = mapped_column(String(200))
    part_of_speech: Mapped[str | None] = mapped_column(String(40))
    dialect: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status", native_enum=False, length=16),
        default=VerificationStatus.draft,
        index=True,
    )
    source: Mapped[str | None] = mapped_column(Text, comment="Citation: book, speaker, corpus")
    contributor: Mapped[str | None] = mapped_column(String(120))
    consent_note: Mapped[str | None] = mapped_column(Text)

    spellings: Mapped[list["Spelling"]] = relationship(
        back_populates="lexeme", cascade="all, delete-orphan", lazy="selectin"
    )
    senses: Mapped[list["Sense"]] = relationship(
        back_populates="lexeme", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (Index("ix_lexemes_headword", "headword"),)


class Spelling(Base):
    """How a lexeme is written in one script (several accepted spellings allowed)."""

    __tablename__ = "spellings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    lexeme_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lexemes.id", ondelete="CASCADE"), index=True
    )
    script: Mapped[str] = mapped_column(String(4))
    text: Mapped[str] = mapped_column(String(200))
    search_key: Mapped[str] = mapped_column(String(200), comment="lower-cased text for lookup")

    lexeme: Mapped[Lexeme] = relationship(back_populates="spellings")

    __table_args__ = (
        CheckConstraint(f"script IN {SCRIPTS}", name="ck_spellings_script"),
        UniqueConstraint("lexeme_id", "script", "text", name="uq_spellings_lexeme_script_text"),
        Index("ix_spellings_search_key", "search_key"),
    )


class Sense(Base):
    """One meaning of a lexeme, glossed in another language."""

    __tablename__ = "senses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    lexeme_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lexemes.id", ondelete="CASCADE"), index=True
    )
    language: Mapped[str] = mapped_column(String(12), comment="FLORES-200 code, e.g. eng_Latn")
    gloss: Mapped[str] = mapped_column(Text)
    example: Mapped[str | None] = mapped_column(Text)

    lexeme: Mapped[Lexeme] = relationship(back_populates="senses")
