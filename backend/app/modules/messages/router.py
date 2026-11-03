import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.db import get_db, utcnow
from app.modules.messages.models import Block, Message
from app.modules.users.models import User
from app.modules.users.security import current_user

router = APIRouter(prefix="/messages", tags=["messages"])
MESSAGES_PER_HOUR = 60


class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: uuid.UUID
    body: str
    created_at: datetime
    mine: bool


class ConversationOut(BaseModel):
    user_id: uuid.UUID
    name: str
    last: str
    last_at: datetime
    unread: int


class ThreadOut(BaseModel):
    user_id: uuid.UUID
    name: str
    blocked_by_me: bool
    items: list[MessageOut]


def _pair(a: uuid.UUID, b: uuid.UUID):  # noqa: ANN202
    return or_(
        and_(Message.sender_id == a, Message.recipient_id == b),
        and_(Message.sender_id == b, Message.recipient_id == a),
    )


def _blocked(db: Session, blocker: uuid.UUID, blocked: uuid.UUID) -> bool:
    return db.get(Block, {"blocker_id": blocker, "blocked_id": blocked}) is not None


@router.get("", response_model=list[ConversationOut])
def conversations(
    me: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[ConversationOut]:
    rows = db.scalars(
        select(Message)
        .where(or_(Message.sender_id == me.id, Message.recipient_id == me.id))
        .order_by(Message.created_at.desc())
        .limit(1000)
    ).all()
    seen: dict[uuid.UUID, ConversationOut] = {}
    for m in rows:
        other = m.recipient_id if m.sender_id == me.id else m.sender_id
        if other not in seen:
            u = db.get(User, other)
            seen[other] = ConversationOut(
                user_id=other,
                name=u.display_name if u else "—",
                last=m.body[:120],
                last_at=m.created_at,
                unread=0,
            )
        if m.recipient_id == me.id and m.read_at is None:
            seen[other].unread += 1
    return list(seen.values())


@router.get("/unread")
def unread(me: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, int]:
    n = db.scalar(
        select(func.count(Message.id)).where(
            Message.recipient_id == me.id, Message.read_at.is_(None)
        )
    )
    return {"unread": n or 0}


@router.get("/{user_id}", response_model=ThreadOut)
def thread(
    user_id: uuid.UUID, me: User = Depends(current_user), db: Session = Depends(get_db)
) -> ThreadOut:
    other = db.get(User, user_id)
    if other is None:
        raise HTTPException(status_code=404, detail="Not found.")
    rows = db.scalars(
        select(Message).where(_pair(me.id, user_id)).order_by(Message.created_at.desc()).limit(200)
    ).all()
    db.execute(
        update(Message)
        .where(
            Message.sender_id == user_id,
            Message.recipient_id == me.id,
            Message.read_at.is_(None),
        )
        .values(read_at=utcnow())
    )
    db.commit()
    return ThreadOut(
        user_id=user_id,
        name=other.display_name,
        blocked_by_me=_blocked(db, me.id, user_id),
        items=[
            MessageOut(id=m.id, body=m.body, created_at=m.created_at, mine=m.sender_id == me.id)
            for m in reversed(rows)
        ],
    )


@router.post("/{user_id}", response_model=MessageOut, status_code=201)
async def send(
    user_id: uuid.UUID,
    body: MessageIn,
    me: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> MessageOut:
    other = db.get(User, user_id)
    if other is None or not other.is_active:
        raise HTTPException(status_code=404, detail="Not found.")
    if user_id == me.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself.")
    if _blocked(db, user_id, me.id) or _blocked(db, me.id, user_id):
        raise HTTPException(status_code=403, detail="You cannot message this member.")
    if await hit_rate_limit(store, f"rl:msg:{me.id}", MESSAGES_PER_HOUR, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many messages. Please slow down.")
    m = Message(sender_id=me.id, recipient_id=user_id, body=body.body.strip())
    db.add(m)
    db.commit()
    return MessageOut(id=m.id, body=m.body, created_at=m.created_at, mine=True)


@router.post("/{user_id}/block", status_code=204)
def block(
    user_id: uuid.UUID, me: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    if user_id != me.id and not _blocked(db, me.id, user_id):
        db.add(Block(blocker_id=me.id, blocked_id=user_id))
        db.commit()


@router.delete("/{user_id}/block", status_code=204)
def unblock(
    user_id: uuid.UUID, me: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    db.execute(delete(Block).where(Block.blocker_id == me.id, Block.blocked_id == user_id))
    db.commit()
