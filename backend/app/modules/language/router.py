import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.language.models import Lexeme, Sense, Spelling, VerificationStatus
from app.modules.translate.languages import CODES
from app.modules.users.models import User
from app.modules.users.security import audit, current_user

router = APIRouter(prefix="/dictionary", tags=["dictionary"])

ScriptCode = Literal["olck", "latn", "beng", "orya", "deva"]


# ── Schemas ──


class SpellingOut(BaseModel):
    script: str
    text: str


class SenseOut(BaseModel):
    language: str
    gloss: str
    example: str | None


class EntryOut(BaseModel):
    id: uuid.UUID
    headword: str
    part_of_speech: str | None
    dialect: str | None
    source: str | None
    contributor: str | None
    spellings: list[SpellingOut]
    senses: list[SenseOut]


class EntryReviewOut(EntryOut):
    status: VerificationStatus
    review_note: str | None
    created_at: datetime | None
    reviewed_at: datetime | None


class SearchOut(BaseModel):
    query: str
    total: int
    results: list[EntryOut]


class SpellingIn(BaseModel):
    script: ScriptCode
    text: str = Field(min_length=1, max_length=200)


class SenseIn(BaseModel):
    language: str
    gloss: str = Field(min_length=1, max_length=2000)
    example: str | None = Field(default=None, max_length=2000)

    @field_validator("language")
    @classmethod
    def known_language(cls, v: str) -> str:
        if v not in CODES:
            raise ValueError(f"unsupported language: {v}")
        return v


class EntryIn(BaseModel):
    headword: str = Field(min_length=1, max_length=200, description="Ol Chiki form")
    part_of_speech: str | None = Field(default=None, max_length=40)
    dialect: str | None = Field(default=None, max_length=80)
    spellings: list[SpellingIn] = Field(default_factory=list, max_length=15)
    senses: list[SenseIn] = Field(min_length=1, max_length=20)
    source: str = Field(min_length=3, max_length=1000, description="Where this comes from")
    consent: bool = Field(description="Contributor confirms they have the right to share this")

    @field_validator("consent")
    @classmethod
    def must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must confirm you have the right to share this entry.")
        return v


# ── Helpers ──


def entry_out(lex: Lexeme) -> EntryOut:
    return EntryOut(
        id=lex.id,
        headword=lex.headword,
        part_of_speech=lex.part_of_speech,
        dialect=lex.dialect,
        source=lex.source,
        contributor=lex.contributor,
        spellings=[SpellingOut(script=s.script, text=s.text) for s in lex.spellings],
        senses=[
            SenseOut(language=s.language, gloss=s.gloss, example=s.example) for s in lex.senses
        ],
    )


def entry_review_out(lex: Lexeme) -> EntryReviewOut:
    return EntryReviewOut(
        **entry_out(lex).model_dump(),
        status=lex.status,
        review_note=lex.review_note,
        created_at=lex.created_at,
        reviewed_at=lex.reviewed_at,
    )


# ── Public ──


@router.get("/search", response_model=SearchOut)
def search(
    q: str = Query(min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> SearchOut:
    """Search verified entries by spelling in any script (prefix match)."""
    key = q.strip().lower()
    ids = (
        select(Spelling.lexeme_id)
        .where(Spelling.search_key.startswith(key, autoescape=True))
        .distinct()
    )
    base = select(Lexeme).where(Lexeme.id.in_(ids), Lexeme.status == VerificationStatus.verified)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(base.order_by(Lexeme.headword).limit(limit)).all()
    return SearchOut(query=q, total=total, results=[entry_out(r) for r in rows])


# ── Contributions (signed in) ──


@router.post("/entries", response_model=EntryReviewOut, status_code=201)
def submit_entry(
    body: EntryIn,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> EntryReviewOut:
    """Submit a new entry. It stays `pending` until another reviewer verifies it."""
    headword = body.headword.strip()
    spellings: dict[tuple[str, str], Spelling] = {}
    for s in [SpellingIn(script="olck", text=headword), *body.spellings]:
        text = s.text.strip()
        spellings.setdefault(
            (s.script, text), Spelling(script=s.script, text=text, search_key=text.lower())
        )
    lex = Lexeme(
        headword=headword,
        part_of_speech=body.part_of_speech,
        dialect=body.dialect,
        source=body.source.strip(),
        contributor=user.display_name,
        consent_note="Contributor confirmed the right to share this entry.",
        status=VerificationStatus.pending,
        submitted_by=user.id,
        spellings=list(spellings.values()),
        senses=[
            Sense(language=s.language, gloss=s.gloss.strip(), example=s.example)
            for s in body.senses
        ],
    )
    db.add(lex)
    db.flush()
    audit(db, "entry.submit", actor=user, target_type="lexeme", target_id=lex.id, request=request)
    db.commit()
    return entry_review_out(lex)


@router.get("/entries/mine", response_model=list[EntryReviewOut])
def my_entries(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[EntryReviewOut]:
    rows = db.scalars(
        select(Lexeme).where(Lexeme.submitted_by == user.id).order_by(Lexeme.created_at.desc())
    ).all()
    return [entry_review_out(r) for r in rows]
