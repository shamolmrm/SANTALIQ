import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.db import get_db, utcnow
from app.modules.notify.models import Notification
from app.modules.users.models import User
from app.modules.users.security import current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: uuid.UUID
    kind: str
    data: dict
    created_at: datetime
    read: bool


class NotificationsOut(BaseModel):
    unread: int
    items: list[NotificationOut]


@router.get("", response_model=NotificationsOut)
def my_notifications(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> NotificationsOut:
    unread = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id, Notification.read_at.is_(None)
        )
    )
    rows = db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    ).all()
    return NotificationsOut(
        unread=unread or 0,
        items=[
            NotificationOut(
                id=n.id,
                kind=n.kind,
                data=n.data or {},
                created_at=n.created_at,
                read=bool(n.read_at),
            )
            for n in rows
        ],
    )


@router.post("/read", status_code=204)
def mark_all_read(user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=utcnow())
    )
    db.commit()
