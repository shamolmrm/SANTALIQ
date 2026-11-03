"""Delete my account: removes the member and their personal data.

What happens:
- writing, heritage submissions, voice recordings (files too), voice consent, sessions and
  email tokens are deleted;
- verified dictionary entries stay in the open dictionary (they were published under CC BY 4.0)
  but lose every link to the person (submitter and contributor name are cleared);
- audit events and AI usage rows keep no link (actor set to NULL).
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.modules.ai.models import AIUsage
from app.modules.contact.models import ContactMessage
from app.modules.heritage.models import HeritageItem
from app.modules.language.models import Lexeme
from app.modules.users.models import AuditEvent, AuthSession, Role, User, UserToken
from app.modules.users.security import audit, current_user, verify_password
from app.modules.voice import router as voice
from app.modules.voice.models import VoiceClip, VoiceSpeaker
from app.modules.write.models import Post, PostReport

router = APIRouter(prefix="/auth", tags=["auth"])


class DeleteIn(BaseModel):
    password: str = Field(min_length=1, max_length=200)
    confirm: Literal["DELETE"]


@router.delete("/account", status_code=204)
def delete_account(
    body: DeleteIn,
    request: Request,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> Response:
    if not verify_password(user.password_hash, body.password):
        raise HTTPException(status_code=403, detail="Password is not correct.")
    if user.role == Role.admin:
        admins = db.scalar(
            select(func.count()).where(User.role == Role.admin, User.is_active.is_(True))
        )
        if (admins or 0) <= 1:
            raise HTTPException(
                status_code=409,
                detail="You are the only admin. Make someone else admin before deleting.",
            )

    uid = user.id
    clips = db.scalars(select(VoiceClip).where(VoiceClip.user_id == uid)).all()
    for c in clips:
        (voice.audio_root() / c.file_name).unlink(missing_ok=True)
    db.execute(delete(VoiceClip).where(VoiceClip.user_id == uid))
    db.execute(delete(VoiceSpeaker).where(VoiceSpeaker.user_id == uid))
    post_ids = select(Post.id).where(Post.author_id == uid)
    db.execute(delete(PostReport).where(PostReport.post_id.in_(post_ids)))
    db.execute(delete(Post).where(Post.author_id == uid))
    db.execute(update(PostReport).where(PostReport.reporter_id == uid).values(reporter_id=None))
    db.execute(delete(HeritageItem).where(HeritageItem.submitted_by == uid))
    db.execute(
        update(Lexeme).where(Lexeme.submitted_by == uid).values(submitted_by=None, contributor=None)
    )
    db.execute(update(Lexeme).where(Lexeme.reviewed_by == uid).values(reviewed_by=None))
    db.execute(update(HeritageItem).where(HeritageItem.reviewed_by == uid).values(reviewed_by=None))
    db.execute(update(VoiceClip).where(VoiceClip.reviewed_by == uid).values(reviewed_by=None))
    db.execute(update(AIUsage).where(AIUsage.user_id == uid).values(user_id=None))
    db.execute(update(ContactMessage).where(ContactMessage.user_id == uid).values(user_id=None))
    db.execute(update(AuditEvent).where(AuditEvent.actor_id == uid).values(actor_id=None))
    db.execute(delete(AuthSession).where(AuthSession.user_id == uid))
    db.execute(delete(UserToken).where(UserToken.user_id == uid))
    db.delete(user)
    audit(db, "user.delete", actor=None, target_type="user", target_id=uid, request=request)
    db.commit()

    response.delete_cookie(get_settings().session_cookie_name, path="/")
    response.status_code = 204
    return response
