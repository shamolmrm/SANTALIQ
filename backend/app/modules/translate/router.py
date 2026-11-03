import hashlib
import json
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from app.core.cache import KeyValueStore, get_redis, hit_rate_limit
from app.core.config import get_settings
from app.modules.translate.languages import CODES, ISO, LANGUAGES, SANTALI

log = logging.getLogger(__name__)
router = APIRouter(prefix="/translate", tags=["translate"])

MAX_CHARS = 2000
NLLB_MODEL = "nllb-200-distilled-600M"
GOOGLE_URL = "https://translation.googleapis.com/language/translate/v2"

Engine = Literal["nllb", "google"]


class Language(BaseModel):
    code: str
    name: str
    native: str
    iso: str


class EngineOut(BaseModel):
    id: Engine
    name: str
    enabled: bool
    note: str


class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_CHARS)
    source: str
    target: str
    engine: Engine = "nllb"

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
    engine: Engine = "nllb"
    model: str = NLLB_MODEL
    cached: bool = False


def google_enabled() -> bool:
    return bool(get_settings().google_translate_api_key)


def _google_code(code: str) -> str:
    return get_settings().google_santali_code if code == SANTALI else ISO[code]


@router.get("/languages", response_model=list[Language])
def languages() -> list[Language]:
    return [Language(code=c, name=n, native=nat, iso=iso) for c, n, nat, iso in LANGUAGES]


@router.get("/engines", response_model=list[EngineOut])
def engines() -> list[EngineOut]:
    return [
        EngineOut(
            id="nllb",
            name="Meta NLLB",
            enabled=True,
            note="Open model on SANTALIQ's own server — your text stays private.",
        ),
        EngineOut(
            id="google",
            name="Google Translate",
            enabled=google_enabled(),
            note="Google Cloud Translation — text is sent to Google.",
        ),
    ]


def _cache_key(body: TranslateIn) -> str:
    raw = f"{body.engine}|{body.source}|{body.target}|{body.text}"
    return f"tr:v2:{hashlib.sha256(raw.encode()).hexdigest()}"


async def _nllb(body: TranslateIn) -> str:
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{get_settings().translate_url}/translate",
                json={"text": body.text, "source": body.source, "target": body.target},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Translation service unavailable") from exc
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Translation failed")
    return r.json()["translation"]


async def _google(body: TranslateIn) -> str:
    if not google_enabled():
        raise HTTPException(status_code=503, detail="Google Translate is not switched on yet.")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                GOOGLE_URL,
                params={"key": get_settings().google_translate_api_key},
                json={
                    "q": body.text,
                    "source": _google_code(body.source),
                    "target": _google_code(body.target),
                    "format": "text",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Google Translate unavailable") from exc
    if r.status_code != 200:
        # Never echo Google's error body (it can include the request URL with the key).
        log.error("google translate error %s", r.status_code)
        raise HTTPException(
            status_code=502, detail="Google could not translate this language pair."
        )
    return r.json()["data"]["translations"][0]["translatedText"]


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

    if body.engine == "google":
        text, model = await _google(body), "google-cloud-translation-v2"
    else:
        text, model = await _nllb(body), NLLB_MODEL

    out = TranslateOut(
        translation=text, source=body.source, target=body.target, engine=body.engine, model=model
    )
    try:
        await store.set(
            key, out.model_dump_json(exclude={"cached"}), ex=settings.translate_cache_ttl_seconds
        )
    except Exception as exc:
        log.warning("translation cache write failed: %s", exc)
    return out
