"""Messages sent through the public contact form (no IP addresses are stored)."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ContactTopic(enum.StrEnum):
    general = "general"
    data_request = "data_request"  # access / delete my data, withdraw consent
    report = "report"  # report content or a problem
    language = "language"  # language advice, corrections, reviewing
    partnership = "partnership"


class ContactStatus(enum.StrEnum):
    new = "new"
    done = "done"


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    topic: Mapped[ContactTopic] = mapped_column(
        Enum(ContactTopic, name="contact_topic", native_enum=False, length=20)
    )
    message: Mapped[str] = mapped_column(Text)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[ContactStatus] = mapped_column(
        Enum(ContactStatus, name="contact_status", native_enum=False, length=8),
        default=ContactStatus.new,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
