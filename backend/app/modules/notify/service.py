import uuid

from sqlalchemy.orm import Session

from app.modules.notify.models import Notification

# kinds: follow, comment, entry_reviewed, heritage_reviewed, voice_reviewed, post_removed,
#        job_reviewed


def notify(
    db: Session, user_id: uuid.UUID | None, kind: str, *, actor_id: uuid.UUID | None = None, **data
) -> None:
    """Queue a notification for `user_id` (added to the caller's transaction).

    Nobody is notified about their own action.
    """
    if user_id is None or user_id == actor_id:
        return
    clean = {k: (str(v) if isinstance(v, uuid.UUID) else v) for k, v in data.items()}
    db.add(Notification(user_id=user_id, kind=kind, data=clean))
