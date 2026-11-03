import hashlib
import json
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.config import get_settings
from app.modules.translate.languages import CODES, LANGUAGES

log = logging.getLogger(__name__)
router = APIRouter(prefix="/translate", tags=["translate"])

MAX_CHARS = 2000
MODEL = "nllb-200-distilled-600M"


class Language(BaseModel):
    code: str
    name: str
    native: str


class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_CHARS)
    source: str
    target: str

    @field_validator("source", "target")
    @classmethod
    def known_language(cls, v: str) -> str:
        if v not in CODES:
            raise ValueError(f"unsupported language: {v}")
        return v


class TranslateOut(BaseModel):
    translation: str
    source: str
    target: str
    model: str = MODEL
    cached: bool = False


@router.get("/languages", response_model=list[Language])
def languages() -> list[Language]:
    return [Language(code=c, name=n, native=nat) for c, n, nat in LANGUAGES]


def _cache_key(body: TranslateIn) -> str:
    digest = hashlib.sha256(f"{MODEL}|{body.source}|{body.target}|{body.text}".encode()).hexdigest()
    return f"tr:v1:{digest}"


@router.post("", response_model=TranslateOut)
async def translate(
    body: TranslateIn, request: Request, store: KeyValueStore = Depends(get_redis)
) -> TranslateOut:
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    if await hit_rate_limit(
        store, f"rl:translate:{client_ip}", settings.translate_rate_limit_per_minute
    ):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")

    key = _cache_key(body)
    try:
        hit = await store.get(key)
        if isinstance(hit, str):
            return TranslateOut(**json.loads(hit), cached=True)
    except Exception as exc:
        log.warning("translation cache read failed: %s", exc)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{settings.translate_url}/translate",
                json={"text": body.text, "source": body.source, "target": body.target},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Translation service unavailable") from exc
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Translation failed")

    out = TranslateOut(translation=r.json()["translation"], source=body.source, target=body.target)
    try:
        await store.set(
            key, out.model_dump_json(exclude={"cached"}), ex=settings.translate_cache_ttl_seconds
        )
    except Exception as exc:
        log.warning("translation cache write failed: %s", exc)
    return out
