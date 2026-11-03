"""SANTALIQ Voice: consented Santali speech recordings for a future community TTS / ASR.

Rules:
- Nobody records without first giving consent (stored with its version and time).
- Speakers choose separately whether their voice may be heard publicly and whether it may be
  used for research and training of Santali speech models. No voice cloning of individuals.
- Every clip is `pending` until a reviewer other than the speaker verifies it.
- Speakers can delete any clip, or all of their voice data, at any time; files are removed too.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin
from app.modules.language.models import VerificationStatus
from app.modules.users.models import User

CONSENT_VERSION = "2026-11-v1"


class VoiceSpeaker(TimestampMixin, Base):
    """A member's voice consent and optional, self-described speaker details."""

    __tablename__ = "voice_speakers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    consent_version: Mapped[str] = mapped_column(String(20))
    consented_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consent_public: Mapped[bool] = mapped_column(Boolean, comment="others may listen on SANTALIQ")
    consent_research: Mapped[bool] = mapped_column(
        Boolean, comment="may be used for research / Santali speech-model training"
    )
    dialect: Mapped[str | None] = mapped_column(String(80))
    region: Mapped[str | None] = mapped_column(String(120))
    age_range: Mapped[str | None] = mapped_column(String(16))
    gender: Mapped[str | None] = mapped_column(String(24))


class VoiceClip(TimestampMixin, Base):
    __tablename__ = "voice_clips"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(String(500), comment="what the speaker reads")
    script: Mapped[str] = mapped_column(String(4))
    lexeme_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lexemes.id", ondelete="SET NULL"), comment="prompt from a verified entry"
    )
    file_name: Mapped[str] = mapped_column(String(80))
    mime: Mapped[str] = mapped_column(String(40))
    size_bytes: Mapped[int] = mapped_column(Integer)
    duration_ms: Mapped[int | None] = mapped_column(Integer, comment="reported by the browser")
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status", native_enum=False, length=16),
        default=VerificationStatus.pending,
        index=True,
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_note: Mapped[str | None] = mapped_column(Text)

    speaker: Mapped[User] = relationship(foreign_keys=[user_id], lazy="joined")

    __table_args__ = (
        CheckConstraint(
            "script IN ('olck', 'latn', 'beng', 'orya', 'deva')", name="ck_voice_clips_script"
        ),
    )
