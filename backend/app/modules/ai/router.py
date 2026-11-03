import logging
from datetime import timedelta
from typing import Literal

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.config import get_settings
from app.core.db import get_db, utcnow
from app.modules.ai import llm
from app.modules.ai.models import AIUsage
from app.modules.ai.retrieval import Source, retrieve
from app.modules.users.models import Role, User
from app.modules.users.security import current_user, require_role

log = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai"])
admin_required = require_role(Role.admin)

SYSTEM_PROMPT = """You are SANTALIQ AI, the assistant of SANTALIQ — a digital home for the Santali \
language, people and culture.

How to answer:
- Reply in the language the user writes in (Santali, Bengali, English, Hindi, Odia, ...).
- For anything specific to Santali — words, spellings, meanings, translations, grammar, history, \
festivals, customs, people — use ONLY the numbered SANTALIQ sources provided with the question, \
and cite them inline like [1] or [2].
- If the sources do not contain the answer, say clearly that SANTALIQ does not have verified \
information on it yet, and invite the user to contribute it on SANTALIQ. Never invent Santali \
words, translations, spellings or cultural facts, and never present a guess as fact.
- General questions that are not about Santali (for example how to use a tool) may be answered \
from general knowledge, briefly.
- Be warm, clear and concise. Use short paragraphs or lists."""

MAX_TURNS = 20


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_TURNS)
    search_hint: str = Field(
        default="", max_length=2000, description="Same question converted to Ol Chiki by the client"
    )


class SourceOut(BaseModel):
    n: int
    kind: str
    title: str
    url: str
    text: str


class ChatOut(BaseModel):
    answer: str
    sources: list[SourceOut]
    model: str


class StatusOut(BaseModel):
    chat_enabled: bool
    model: str | None
    daily_limit: int


class UsageOut(BaseModel):
    requests_today: int
    requests_30d: int
    input_tokens_30d: int
    output_tokens_30d: int


def _sources_out(sources: list[Source]) -> list[SourceOut]:
    return [SourceOut(n=s.n, kind=s.kind, title=s.title, url=s.url, text=s.text) for s in sources]


def _sources_block(sources: list[Source]) -> str:
    if not sources:
        return "<sources>\n(no matching SANTALIQ sources)\n</sources>"
    items = "\n".join(
        f'<source n="{s.n}" type="{s.kind}" title="{s.title}">\n{s.text}\n</source>'
        for s in sources
    )
    return f"<sources>\n{items}\n</sources>"


@router.get("/status", response_model=StatusOut)
def status() -> StatusOut:
    s = get_settings()
    enabled = llm.ai_enabled()
    return StatusOut(
        chat_enabled=enabled,
        model=s.ai_model if enabled else None,
        daily_limit=s.ai_requests_per_day,
    )


@router.get("/search", response_model=list[SourceOut])
def search(
    q: str = Query(min_length=1, max_length=500),
    hint: str = Query("", max_length=500),
    db: Session = Depends(get_db),
) -> list[SourceOut]:
    """Grounded search across verified SANTALIQ content (no AI model involved)."""
    return _sources_out(retrieve(db, q, hint))


@router.post("/chat", response_model=ChatOut)
async def chat(
    body: ChatIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: KeyValueStore = Depends(get_redis),
) -> ChatOut:
    s = get_settings()
    if not llm.ai_enabled():
        raise HTTPException(status_code=503, detail="SANTALIQ AI chat is not switched on yet.")
    if body.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail="The last message must be from the user.")
    if await hit_rate_limit(store, f"rl:ai:min:{user.id}", s.ai_requests_per_minute):
        raise HTTPException(status_code=429, detail="Please slow down a little and try again.")
    if await hit_rate_limit(
        store, f"rl:ai:day:{user.id}", s.ai_requests_per_day, window_seconds=86400
    ):
        raise HTTPException(
            status_code=429, detail="You have reached today's AI limit. Please come back tomorrow."
        )

    question = body.messages[-1].content
    sources = retrieve(db, question, body.search_hint)
    # Earlier turns as plain text; sources attached to the latest question only.
    messages: list[dict] = [{"role": m.role, "content": m.content} for m in body.messages[:-1]]
    messages.append(
        {"role": "user", "content": f"{_sources_block(sources)}\n\nQuestion: {question}"}
    )

    try:
        result = await llm.complete(SYSTEM_PROMPT, messages)
    except anthropic.RateLimitError as exc:
        raise HTTPException(
            status_code=429, detail="The AI is busy right now. Try again shortly."
        ) from exc
    except anthropic.APIConnectionError as exc:
        raise HTTPException(status_code=503, detail="Could not reach the AI service.") from exc
    except anthropic.APIStatusError as exc:
        log.error("claude api error %s: %s", exc.status_code, exc.message)
        raise HTTPException(status_code=502, detail="The AI could not answer. Try again.") from exc

    db.add(
        AIUsage(
            user_id=user.id,
            model=result.model,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            sources=len(sources),
        )
    )
    db.commit()
    answer = (
        result.text
        if not result.refused and result.text
        else "Sorry — I can't help with that request."
    )
    return ChatOut(answer=answer, sources=_sources_out(sources), model=result.model)


@router.get("/usage", response_model=UsageOut)
def usage(_: User = Depends(admin_required), db: Session = Depends(get_db)) -> UsageOut:
    now = utcnow()
    day = now - timedelta(days=1)
    month = now - timedelta(days=30)
    today = db.scalar(select(func.count()).select_from(AIUsage).where(AIUsage.created_at >= day))
    row = db.execute(
        select(
            func.count(),
            func.coalesce(func.sum(AIUsage.input_tokens), 0),
            func.coalesce(func.sum(AIUsage.output_tokens), 0),
        ).where(AIUsage.created_at >= month)
    ).one()
    return UsageOut(
        requests_today=today or 0,
        requests_30d=row[0],
        input_tokens_30d=row[1],
        output_tokens_30d=row[2],
    )
