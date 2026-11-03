"""Open Dataset v1: verified SANTALIQ lexicon as JSON or CSV, plus contributor credits."""

import csv
import io
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db, utcnow
from app.modules.language.models import Lexeme, VerificationStatus
from app.modules.users.models import User

router = APIRouter(tags=["dataset"])

SCRIPTS = ("olck", "latn", "beng", "orya", "deva")


class ContributorOut(BaseModel):
    id: uuid.UUID
    display_name: str
    verified_entries: int


class DatasetEntry(BaseModel):
    id: uuid.UUID
    headword: str
    part_of_speech: str | None
    dialect: str | None
    spellings: dict[str, list[str]]
    senses: list[dict[str, str | None]]
    source: str | None
    contributor: str | None
    verified_at: datetime | None


class DatasetOut(BaseModel):
    name: str
    version: str
    generated_at: datetime
    license: str
    citation: str
    count: int
    entries: list[DatasetEntry]


def _verified(db: Session) -> list[Lexeme]:
    return list(
        db.scalars(
            select(Lexeme)
            .where(Lexeme.status == VerificationStatus.verified)
            .order_by(Lexeme.headword)
        )
    )


def _entry(lex: Lexeme) -> DatasetEntry:
    spellings: dict[str, list[str]] = {s: [] for s in SCRIPTS}
    for sp in lex.spellings:
        spellings[sp.script].append(sp.text)
    return DatasetEntry(
        id=lex.id,
        headword=lex.headword,
        part_of_speech=lex.part_of_speech,
        dialect=lex.dialect,
        spellings=spellings,
        senses=[
            {"language": s.language, "gloss": s.gloss, "example": s.example} for s in lex.senses
        ],
        source=lex.source,
        contributor=lex.contributor,
        verified_at=lex.reviewed_at,
    )


@router.get("/dictionary/contributors", response_model=list[ContributorOut])
def contributors(db: Session = Depends(get_db)) -> list[ContributorOut]:
    """People whose contributions have been verified, most first."""
    rows = db.execute(
        select(User.id, User.display_name, func.count(Lexeme.id))
        .join(Lexeme, Lexeme.submitted_by == User.id)
        .where(Lexeme.status == VerificationStatus.verified, User.is_active.is_(True))
        .group_by(User.id, User.display_name)
        .order_by(func.count(Lexeme.id).desc(), User.display_name)
        .limit(50)
    ).all()
    return [ContributorOut(id=i, display_name=n, verified_entries=c) for i, n, c in rows]


@router.get("/dataset/lexicon.json", response_model=DatasetOut)
def lexicon_json(db: Session = Depends(get_db)) -> DatasetOut:
    s = get_settings()
    entries = [_entry(lex) for lex in _verified(db)]
    return DatasetOut(
        name="SANTALIQ Santali Lexicon",
        version="1",
        generated_at=utcnow(),
        license=s.dataset_license,
        citation=f"SANTALIQ Santali Lexicon, {s.public_url}/dataset",
        count=len(entries),
        entries=entries,
    )


@router.get("/dataset/lexicon.csv")
def lexicon_csv(db: Session = Depends(get_db)) -> Response:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "id",
            "headword",
            *[f"spelling_{s}" for s in SCRIPTS],
            "part_of_speech",
            "dialect",
            "sense_language",
            "gloss",
            "example",
            "source",
            "contributor",
            "verified_at",
        ]
    )
    for lex in _verified(db):
        e = _entry(lex)
        spell = [" | ".join(e.spellings[s]) for s in SCRIPTS]
        for sense in e.senses or [{"language": "", "gloss": "", "example": ""}]:
            w.writerow(
                [
                    e.id,
                    e.headword,
                    *spell,
                    e.part_of_speech or "",
                    e.dialect or "",
                    sense["language"],
                    sense["gloss"],
                    sense["example"] or "",
                    e.source or "",
                    e.contributor or "",
                    e.verified_at.isoformat() if e.verified_at else "",
                ]
            )
    return Response(
        content="﻿" + buf.getvalue(),  # BOM so Excel opens Unicode correctly
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="santaliq-lexicon-v1.csv"'},
    )
