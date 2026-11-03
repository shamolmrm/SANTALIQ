import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core import mailer
from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.config import get_settings
from app.core.db import get_db
from app.modules.contact.models import ContactMessage, ContactStatus, ContactTopic
from app.modules.users.models import Role, User
from app.modules.users.router import EMAIL_PATTERN
from app.modules.users.security import client_ip, current_user_optional, require_role

log = logging.getLogger(__name__)
router = APIRouter(tags=["contact"])
admin_required = require_role(Role.admin)
MESSAGES_PER_HOUR = 5


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(max_length=254, pattern=EMAIL_PATTERN)
    topic: ContactTopic
    message: str = Field(min_length=10, max_length=5000)
    website: str = Field(default="", max_length=200)  # honeypot: humans leave it empty


class MessageOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    topic: ContactTopic
    message: str
    user_id: uuid.UUID | None
    status: ContactStatus
    created_at: datetime


class MessagePatch(BaseModel):
    status: ContactStatus


def out(m: ContactMessage) -> MessageOut:
    return MessageOut(
        id=m.id,
        name=m.name,
        email=m.email,
        topic=m.topic,
        message=m.message,
        user_id=m.user_id,
        status=m.status,
        created_at=m.created_at,
    )


@router.post("/contact", status_code=202)
async def send_message(
    body: ContactIn,
    request: Request,
    user: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> dict[str, str]:
    thanks = {"status": "Thank you. We will reply by email."}
    if body.website:  # bot filled the hidden field: pretend success, store nothing
        return thanks
    if await hit_rate_limit(
        store, f"rl:contact:{client_ip(request)}", MESSAGES_PER_HOUR, window_seconds=3600
    ):
        raise HTTPException(status_code=429, detail="Too many messages. Please try later.")
    msg = ContactMessage(
        name=body.name.strip(),
        email=body.email.strip().lower(),
        topic=body.topic,
        message=body.message.strip(),
        user_id=user.id if user else None,
    )
    db.add(msg)
    db.commit()

    s = get_settings()
    if s.contact_notify_email and mailer.email_enabled():
        try:
            mailer.send_email(
                s.contact_notify_email,
                f"[SANTALIQ contact] {body.topic.value}: {body.name.strip()[:60]}",
                f"From: {body.name} <{body.email}>\nTopic: {body.topic.value}\n\n{body.message}\n\n"
                f"Reply from the admin dashboard: {s.public_url}/admin/messages",
            )
        except Exception:  # noqa: BLE001 — the message is saved; email is best effort
            log.exception("contact notification email failed")
    return thanks


@router.get("/admin/messages", response_model=list[MessageOut])
def list_messages(
    status: ContactStatus | None = None,
    _: User = Depends(admin_required),
    db: Session = Depends(get_db),
) -> list[MessageOut]:
    q = select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(200)
    if status:
        q = q.where(ContactMessage.status == status)
    return [out(m) for m in db.scalars(q).all()]


@router.get("/admin/messages/count")
def count_new(_: User = Depends(admin_required), db: Session = Depends(get_db)) -> dict[str, int]:
    n = db.scalar(
        select(func.count(ContactMessage.id)).where(ContactMessage.status == ContactStatus.new)
    )
    return {"new": n or 0}


@router.patch("/admin/messages/{message_id}", response_model=MessageOut)
def update_message(
    message_id: uuid.UUID,
    body: MessagePatch,
    _: User = Depends(admin_required),
    db: Session = Depends(get_db),
) -> MessageOut:
    m = db.get(ContactMessage, message_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Not found.")
    m.status = body.status
    db.commit()
    return out(m)
