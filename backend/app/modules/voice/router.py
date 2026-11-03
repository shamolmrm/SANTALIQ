import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.config import get_settings
from app.core.db import get_db, utcnow
from app.modules.language.models import Lexeme, Spelling, VerificationStatus
from app.modules.notify.service import notify
from app.modules.users.models import ROLE_RANK, Role, User
from app.modules.users.security import audit, current_user, current_user_optional, require_role
from app.modules.voice.models import CONSENT_VERSION, VoiceClip, VoiceSpeaker

router = APIRouter(prefix="/voice", tags=["voice"])
admin_router = APIRouter(prefix="/admin/voice", tags=["admin"])
reviewer_required = require_role(Role.reviewer)

ScriptCode = Literal["olck", "latn", "beng", "orya", "deva"]
AgeRange = Literal["under-18", "18-29", "30-44", "45-59", "60+"]


def audio_root() -> Path:
    return Path(get_settings().voice_dir)


def sniff_audio(data: bytes) -> tuple[str, str] | None:
    """Identify the container from magic bytes (never trust the client's Content-Type)."""
    if data[:4] == b"\x1aE\xdf\xa3":
        return "audio/webm", "webm"
    if data[:4] == b"OggS":
        return "audio/ogg", "ogg"
    if data[4:8] == b"ftyp":
        return "audio/mp4", "m4a"
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "audio/wav", "wav"
    return None


# ── Schemas ──


class ConsentIn(BaseModel):
    agree: bool
    consent_public: bool
    consent_research: bool
    dialect: str | None = Field(default=None, max_length=80)
    region: str | None = Field(default=None, max_length=120)
    age_range: AgeRange | None = None
    gender: str | None = Field(default=None, max_length=24)


class ConsentOut(BaseModel):
    consent_version: str
    current_version: str
    consented_at: datetime
    consent_public: bool
    consent_research: bool
    dialect: str | None
    region: str | None
    age_range: str | None
    gender: str | None


class SpeakerOut(BaseModel):
    id: uuid.UUID
    display_name: str


class ClipOut(BaseModel):
    id: uuid.UUID
    text: str
    script: str
    duration_ms: int | None
    status: VerificationStatus
    created_at: datetime | None
    review_note: str | None = None
    speaker: SpeakerOut
    dialect: str | None = None
    audio_url: str


class PromptOut(BaseModel):
    lexeme_id: uuid.UUID
    text: str
    script: str


class StatsOut(BaseModel):
    verified_clips: int
    verified_minutes: float
    speakers: int
    pending_clips: int


class ReviewIn(BaseModel):
    decision: Literal["verified", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


def consent_out(s: VoiceSpeaker) -> ConsentOut:
    return ConsentOut(
        consent_version=s.consent_version,
        current_version=CONSENT_VERSION,
        consented_at=s.consented_at,
        consent_public=s.consent_public,
        consent_research=s.consent_research,
        dialect=s.dialect,
        region=s.region,
        age_range=s.age_range,
        gender=s.gender,
    )


def clip_out(c: VoiceClip, *, dialect: str | None = None, include_note: bool = False) -> ClipOut:
    return ClipOut(
        id=c.id,
        text=c.text,
        script=c.script,
        duration_ms=c.duration_ms,
        status=c.status,
        created_at=c.created_at,
        review_note=c.review_note if include_note else None,
        speaker=SpeakerOut(id=c.speaker.id, display_name=c.speaker.display_name),
        dialect=dialect,
        audio_url=f"/api/v1/voice/clips/{c.id}/audio",
    )


def _is_reviewer(user: User | None) -> bool:
    return user is not None and ROLE_RANK[user.role] >= ROLE_RANK[Role.reviewer]


def _delete_file(clip: VoiceClip) -> None:
    (audio_root() / clip.file_name).unlink(missing_ok=True)


# ── Public ──


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)) -> StatsOut:
    verified = VoiceClip.status == VerificationStatus.verified
    count, ms, speakers = db.execute(
        select(
            func.count(VoiceClip.id),
            func.coalesce(func.sum(VoiceClip.duration_ms), 0),
            func.count(func.distinct(VoiceClip.user_id)),
        ).where(verified)
    ).one()
    pending = db.scalar(
        select(func.count(VoiceClip.id)).where(VoiceClip.status == VerificationStatus.pending)
    )
    return StatsOut(
        verified_clips=count,
        verified_minutes=round(ms / 60000, 1),
        speakers=speakers,
        pending_clips=pending or 0,
    )


@router.get("/clips", response_model=list[ClipOut])
def library(
    limit: int = Query(30, ge=1, le=60),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[ClipOut]:
    """Verified clips whose speakers allowed public listening."""
    rows = db.execute(
        select(VoiceClip, VoiceSpeaker.dialect)
        .join(VoiceSpeaker, VoiceSpeaker.user_id == VoiceClip.user_id)
        .where(
            VoiceClip.status == VerificationStatus.verified,
            VoiceSpeaker.consent_public.is_(True),
        )
        .order_by(VoiceClip.reviewed_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return [clip_out(c, dialect=d) for c, d in rows]


@router.get("/clips/{clip_id}/audio")
def audio(
    clip_id: uuid.UUID,
    user: User | None = Depends(current_user_optional),
    db: Session = Depends(get_db),
) -> FileResponse:
    clip = db.get(VoiceClip, clip_id)
    if clip is None:
        raise HTTPException(status_code=404, detail="Not found.")
    allowed = (user is not None and (clip.user_id == user.id or _is_reviewer(user))) or (
        clip.status == VerificationStatus.verified
        and bool(
            db.scalar(
                select(VoiceSpeaker.consent_public).where(VoiceSpeaker.user_id == clip.user_id)
            )
        )
    )
    path = audio_root() / clip.file_name
    if not allowed or not path.is_file():
        raise HTTPException(status_code=404, detail="Not found.")
    return FileResponse(
        path, media_type=clip.mime, headers={"Cache-Control": "private, max-age=600"}
    )


@router.get("/prompts", response_model=list[PromptOut])
def prompts(
    script: ScriptCode = "olck",
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
) -> list[PromptOut]:
    """Random words to read aloud, taken only from verified dictionary entries."""
    rows = db.execute(
        select(Spelling.lexeme_id, Spelling.text, Spelling.script)
        .join(Lexeme, Lexeme.id == Spelling.lexeme_id)
        .where(Lexeme.status == VerificationStatus.verified, Spelling.script == script)
        .order_by(func.random())
        .limit(limit)
    ).all()
    return [PromptOut(lexeme_id=i, text=t, script=s) for i, t, s in rows]


# ── Speaker ──


@router.get("/consent", response_model=ConsentOut | None)
def get_consent(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ConsentOut | None:
    s = db.get(VoiceSpeaker, user.id)
    return consent_out(s) if s else None


@router.put("/consent", response_model=ConsentOut)
def give_consent(
    body: ConsentIn,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ConsentOut:
    if not body.agree:
        raise HTTPException(status_code=422, detail="Please read and accept the voice consent.")
    s = db.get(VoiceSpeaker, user.id) or VoiceSpeaker(user_id=user.id)
    s.consent_version = CONSENT_VERSION
    s.consented_at = utcnow()
    s.consent_public = body.consent_public
    s.consent_research = body.consent_research
    s.dialect = (body.dialect or "").strip() or None
    s.region = (body.region or "").strip() or None
    s.age_range = body.age_range
    s.gender = (body.gender or "").strip() or None
    db.add(s)
    audit(
        db,
        "voice.consent",
        actor=user,
        target_type="user",
        target_id=user.id,
        detail={
            "version": CONSENT_VERSION,
            "public": body.consent_public,
            "research": body.consent_research,
        },
        request=request,
    )
    db.commit()
    return consent_out(s)


@router.delete("/me", status_code=204)
def withdraw_all(
    request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    """Delete every recording and the consent record of the signed-in member."""
    clips = db.scalars(select(VoiceClip).where(VoiceClip.user_id == user.id)).all()
    for c in clips:
        _delete_file(c)
        db.delete(c)
    speaker = db.get(VoiceSpeaker, user.id)
    if speaker:
        db.delete(speaker)
    audit(
        db,
        "voice.withdraw_all",
        actor=user,
        target_type="user",
        target_id=user.id,
        detail={"clips": len(clips)},
        request=request,
    )
    db.commit()


@router.get("/me/clips", response_model=list[ClipOut])
def my_clips(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[ClipOut]:
    rows = db.scalars(
        select(VoiceClip).where(VoiceClip.user_id == user.id).order_by(VoiceClip.created_at.desc())
    ).all()
    return [clip_out(c, include_note=True) for c in rows]


@router.post("/clips", response_model=ClipOut, status_code=201)
async def upload_clip(
    request: Request,
    audio_file: Annotated[UploadFile, File(alias="audio")],
    text: Annotated[str, Form(min_length=1, max_length=500)],
    script: Annotated[ScriptCode, Form()],
    lexeme_id: Annotated[uuid.UUID | None, Form()] = None,
    duration_ms: Annotated[int | None, Form(ge=300, le=60_000)] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> ClipOut:
    s = get_settings()
    speaker = db.get(VoiceSpeaker, user.id)
    if speaker is None:
        raise HTTPException(status_code=403, detail="Please give voice consent first.")
    if await hit_rate_limit(
        store, f"rl:voice:{user.id}", s.voice_clips_per_hour, window_seconds=3600
    ):
        raise HTTPException(status_code=429, detail="Many recordings! Please rest and try later.")
    if lexeme_id is not None:
        lex = db.get(Lexeme, lexeme_id)
        if lex is None or lex.status != VerificationStatus.verified:
            raise HTTPException(status_code=422, detail="That prompt is not a verified entry.")

    data = await audio_file.read(s.voice_max_bytes + 1)
    if len(data) > s.voice_max_bytes:
        raise HTTPException(status_code=413, detail="Recording is too long.")
    kind = sniff_audio(data)
    if len(data) < 100 or kind is None:
        raise HTTPException(status_code=422, detail="Unsupported or empty audio.")
    mime, ext = kind

    clip = VoiceClip(
        id=uuid.uuid4(),
        user_id=user.id,
        speaker=user,
        text=text.strip(),
        script=script,
        lexeme_id=lexeme_id,
        mime=mime,
        size_bytes=len(data),
        duration_ms=duration_ms,
        status=VerificationStatus.pending,
    )
    clip.file_name = f"{clip.id}.{ext}"
    root = audio_root()
    root.mkdir(parents=True, exist_ok=True)
    tmp = root / f".{clip.file_name}.part"
    tmp.write_bytes(data)
    tmp.replace(root / clip.file_name)

    db.add(clip)
    audit(
        db, "voice.upload", actor=user, target_type="voice_clip", target_id=clip.id, request=request
    )
    try:
        db.commit()
    except Exception:
        _delete_file(clip)
        raise
    return clip_out(clip, dialect=speaker.dialect, include_note=True)


@router.delete("/clips/{clip_id}", status_code=204)
def delete_clip(
    clip_id: uuid.UUID,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    clip = db.get(VoiceClip, clip_id)
    if clip is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if clip.user_id != user.id and user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only the speaker can delete this.")
    _delete_file(clip)
    audit(
        db, "voice.delete", actor=user, target_type="voice_clip", target_id=clip.id, request=request
    )
    db.delete(clip)
    db.commit()


# ── Review ──


@admin_router.get("", response_model=list[ClipOut])
def review_queue(
    status: VerificationStatus = VerificationStatus.pending,
    _: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> list[ClipOut]:
    rows = db.execute(
        select(VoiceClip, VoiceSpeaker.dialect)
        .outerjoin(VoiceSpeaker, VoiceSpeaker.user_id == VoiceClip.user_id)
        .where(VoiceClip.status == status)
        .order_by(VoiceClip.created_at)
        .limit(50)
    ).all()
    return [clip_out(c, dialect=d, include_note=True) for c, d in rows]


@admin_router.post("/{clip_id}", response_model=ClipOut)
def review_clip(
    clip_id: uuid.UUID,
    body: ReviewIn,
    request: Request,
    reviewer: User = Depends(reviewer_required),
    db: Session = Depends(get_db),
) -> ClipOut:
    clip = db.get(VoiceClip, clip_id)
    if clip is None:
        raise HTTPException(status_code=404, detail="Not found.")
    if clip.user_id == reviewer.id and reviewer.role != Role.admin:
        raise HTTPException(status_code=403, detail="You cannot review your own recording.")
    clip.status = VerificationStatus(body.decision)
    clip.reviewed_by = reviewer.id
    clip.reviewed_at = utcnow()
    clip.review_note = body.note
    notify(
        db,
        clip.user_id,
        "voice_reviewed",
        actor_id=reviewer.id,
        decision=body.decision,
        title=clip.text,
        note=body.note,
    )
    audit(
        db,
        f"voice.{body.decision}",
        actor=reviewer,
        target_type="voice_clip",
        target_id=clip.id,
        detail={"note": body.note} if body.note else None,
        request=request,
    )
    db.commit()
    return clip_out(clip, include_note=True)
