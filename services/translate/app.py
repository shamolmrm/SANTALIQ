"""SANTALIQ translation service (internal only — not exposed to the internet).

NLLB-200 distilled 600M via CTranslate2. Called by the SANTALIQ API, never by browsers.
"""

import os
import threading

import ctranslate2
import sentencepiece as spm
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_DIR = os.environ.get("MODEL_DIR", "/model")
MAX_CHARS = 2000

translator = ctranslate2.Translator(
    MODEL_DIR,
    device="cpu",
    compute_type="int8",
    inter_threads=1,
    intra_threads=int(os.environ.get("THREADS", "2")),
)
sp = spm.SentencePieceProcessor(model_file=os.path.join(MODEL_DIR, "sentencepiece.bpe.model"))
_lock = threading.Lock()

app = FastAPI(title="SANTALIQ Translate", docs_url=None, redoc_url=None)


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_CHARS)
    source: str = Field(pattern=r"^[a-z]{3}_[A-Z][a-z]{3}$")
    target: str = Field(pattern=r"^[a-z]{3}_[A-Z][a-z]{3}$")


class TranslateResponse(BaseModel):
    translation: str


def _translate_line(line: str, source: str, target: str) -> str:
    if not line.strip():
        return line
    tokens = [source, *sp.encode(line, out_type=str), "</s>"]
    with _lock:
        result = translator.translate_batch(
            [tokens], target_prefix=[[target]], beam_size=4, max_decoding_length=512
        )
    hyp = result[0].hypotheses[0]
    if hyp and hyp[0] == target:
        hyp = hyp[1:]
    return sp.decode(hyp)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest) -> TranslateResponse:
    if req.source == req.target:
        return TranslateResponse(translation=req.text)
    try:
        lines = [_translate_line(line, req.source, req.target) for line in req.text.split("\n")]
    except Exception as exc:  # unknown language code etc.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return TranslateResponse(translation="\n".join(lines))
