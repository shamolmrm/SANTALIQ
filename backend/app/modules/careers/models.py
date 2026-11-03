"""SANTALIQ Career: jobs, internships, scholarships and training for the Santali community.

Every listing is reviewed before it is public (to keep out scams), and needs a way to apply.
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin
from app.modules.language.models import VerificationStatus
from app.modules.users.models import User


class JobKind(enum.StrEnum):
    job = "job"
    internship = "internship"
    scholarship = "scholarship"
    training = "training"


class JobPost(TimestampMixin, Base):
    __tablename__ = "job_posts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    kind: Mapped[JobKind] = mapped_column(
        Enum(JobKind, name="job_kind", native_enum=False, length=16), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    organization: Mapped[str] = mapped_column(String(200))
    location: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    apply_url: Mapped[str | None] = mapped_column(String(500))
    apply_email: Mapped[str | None] = mapped_column(String(254))
    deadline: Mapped[date | None] = mapped_column(Date, index=True)
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
