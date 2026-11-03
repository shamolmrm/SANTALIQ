import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.core.config import get_settings
from app.modules.translate.languages import CODES, LANGUAGES

router = APIRouter(prefix="/translate", tags=["translate"])

MAX_CHARS = 2000


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
    model: str = "nllb-200-distilled-600M"


@router.get("/languages", response_model=list[Language])
def languages() -> list[Language]:
    return [Language(code=c, name=n, native=nat) for c, n, nat in LANGUAGES]


@router.post("", response_model=TranslateOut)
async def translate(body: TranslateIn) -> TranslateOut:
    settings = get_settings()
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
    return TranslateOut(translation=r.json()["translation"], source=body.source, target=body.target)
