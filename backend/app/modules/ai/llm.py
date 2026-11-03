"""Claude API access for SANTALIQ AI. Call through the module so tests can replace `complete`."""

from dataclasses import dataclass
from functools import lru_cache

import anthropic

from app.core.config import get_settings


@dataclass
class Completion:
    text: str
    model: str
    input_tokens: int
    output_tokens: int
    refused: bool = False


def ai_enabled() -> bool:
    return bool(get_settings().anthropic_api_key)


@lru_cache
def _client() -> anthropic.AsyncAnthropic:
    s = get_settings()
    return anthropic.AsyncAnthropic(api_key=s.anthropic_api_key, timeout=90.0, max_retries=2)


async def complete(system: str, messages: list[dict]) -> Completion:
    """One grounded answer. Low effort keeps chat fast and inexpensive."""
    s = get_settings()
    response = await _client().beta.messages.create(
        model=s.ai_model,
        max_tokens=16000,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
        output_config={"effort": s.ai_effort},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    return Completion(
        text=text,
        model=response.model,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        refused=response.stop_reason == "refusal",
    )
