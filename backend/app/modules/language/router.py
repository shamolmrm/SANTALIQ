import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.language.models import Lexeme, Spelling, VerificationStatus

router = APIRouter(prefix="/dictionary", tags=["dictionary"])


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
    spellings: list[SpellingOut]
    senses: list[SenseOut]


class SearchOut(BaseModel):
    query: str
    total: int
    results: list[EntryOut]


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
    return SearchOut(
        query=q,
        total=total,
        results=[
            EntryOut(
                id=r.id,
                headword=r.headword,
                part_of_speech=r.part_of_speech,
                dialect=r.dialect,
                source=r.source,
                spellings=[SpellingOut(script=s.script, text=s.text) for s in r.spellings],
                senses=[
                    SenseOut(language=s.language, gloss=s.gloss, example=s.example)
                    for s in r.senses
                ],
            )
            for r in rows
        ],
    )
