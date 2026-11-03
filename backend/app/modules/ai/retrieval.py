"""Grounded retrieval over SANTALIQ's own verified content (no LLM, no external calls).

Sources: verified dictionary entries and published SANTALIQ Write pieces. Matching is lexical
(spellings in every script, glosses, titles, bodies) so it works for Santali today; vector
search (pgvector) can be added later without changing the output shape.
"""

import re
import uuid
from dataclasses import dataclass

from sqlalchemy import false, or_, select
from sqlalchemy.orm import Session

from app.modules.language.models import Lexeme, Sense, Spelling, VerificationStatus
from app.modules.write.models import Post, PostStatus

_WORD = re.compile(r"[\w᱐-᱿ऀ-ॿঀ-৿଀-୿']+", re.UNICODE)
_STOP = {
    "the",
    "and",
    "for",
    "what",
    "who",
    "how",
    "why",
    "is",
    "are",
    "was",
    "of",
    "in",
    "on",
    "to",
    "a",
    "an",
    "me",
    "my",
    "you",
    "your",
    "about",
    "tell",
    "does",
    "do",
    "word",
    "mean",
    "meaning",
    "santali",
    "please",
    "with",
    "from",
    "that",
    "this",
    "it",
    "be",
    "can",
}


@dataclass
class Source:
    n: int
    kind: str  # "dictionary" | "writing"
    id: uuid.UUID
    title: str
    url: str
    text: str


def terms(*texts: str) -> list[str]:
    seen: list[str] = []
    for t in texts:
        for w in _WORD.findall(t.lower()):
            if len(w) >= 2 and w not in _STOP and w not in seen:
                seen.append(w)
    return seen[:12]


def _snippet(body: str, words: list[str], width: int = 600) -> str:
    low = body.lower()
    pos = min((low.find(w) for w in words if w in low), default=0)
    start = max(0, pos - width // 3)
    text = body[start : start + width].strip()
    return ("…" if start > 0 else "") + text + ("…" if start + width < len(body) else "")


def retrieve(db: Session, query: str, extra: str = "", limit: int = 8) -> list[Source]:
    words = terms(query, extra)
    if not words:
        return []
    out: list[Source] = []

    # Dictionary: spelling prefix in any script, or gloss containing the word.
    spell_hits = select(Spelling.lexeme_id).where(
        or_(*[Spelling.search_key.startswith(w, autoescape=True) for w in words])
    )
    gloss_hits = select(Sense.lexeme_id).where(
        or_(*[Sense.gloss.ilike(f"%{w}%") for w in words if len(w) >= 3] or [false()])
    )
    lexemes = db.scalars(
        select(Lexeme)
        .where(
            Lexeme.status == VerificationStatus.verified,
            or_(Lexeme.id.in_(spell_hits), Lexeme.id.in_(gloss_hits)),
        )
        .order_by(Lexeme.headword)
        .limit(limit)
    ).all()
    for lex in lexemes:
        spellings = ", ".join(f"{s.script}: {s.text}" for s in lex.spellings)
        senses = "; ".join(f"[{s.language}] {s.gloss}" for s in lex.senses)
        out.append(
            Source(
                n=0,
                kind="dictionary",
                id=lex.id,
                title=lex.headword,
                url=f"/tools/dictionary?q={lex.headword}",
                text=f"Headword (Ol Chiki): {lex.headword}. Spellings: {spellings}. "
                f"Part of speech: {lex.part_of_speech or '-'}. Dialect: {lex.dialect or '-'}. "
                f"Meanings: {senses}. Source: {lex.source or '-'}.",
            )
        )

    # Writing: published pieces whose title or body mention the words, best matches first.
    candidates = db.scalars(
        select(Post)
        .where(
            Post.status == PostStatus.published,
            or_(
                *[Post.title.ilike(f"%{w}%") for w in words],
                *[Post.body.ilike(f"%{w}%") for w in words],
            ),
        )
        .order_by(Post.published_at.desc())
        .limit(30)
    ).all()

    def score(p: Post) -> int:
        hay = f"{p.title} {p.body}".lower()
        return sum(hay.count(w) for w in words) + 3 * sum(w in p.title.lower() for w in words)

    for p in sorted(candidates, key=score, reverse=True)[: max(0, limit - len(out)) or 2]:
        out.append(
            Source(
                n=0,
                kind="writing",
                id=p.id,
                title=f"{p.title} — {p.author.display_name}",
                url=f"/write/{p.slug}",
                text=_snippet(p.body, words),
            )
        )

    for i, s in enumerate(out, start=1):
        s.n = i
    return out
