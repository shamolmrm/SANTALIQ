# Module: SANTALIQ AI

**Status:** Beta — `/ai`. Grounded search is live; **chat is off until `ANTHROPIC_API_KEY` is set** in the server `.env`.
**Code:** `backend/app/modules/ai/` (`retrieval.py`, `llm.py`, `router.py`) · `frontend/src/app/ai/`

## How it works
```
question ──▶ retrieve()  ── verified dictionary entries (spellings in any script, glosses)
                         └─ published SANTALIQ Write pieces (title/body match, snippets)
         ──▶ numbered <sources> + question ──▶ Claude (claude-opus-5-5, effort low)
         ◀── answer with [n] citations + the source list
```
- The browser also sends the question converted to Ol Chiki (`search_hint`) so Santali typed in
  Bengali/Odia/Devanagari finds Ol Chiki headwords.
- System prompt: answer in the user's language; for anything Santali-specific use **only** the sources
  and cite them; if not found, say so and invite contributions; **never invent Santali words, translations
  or cultural facts**.
- Without an API key the same page works as **grounded search** (sources only, no model).

## Safety & cost
- Chat requires sign-in. Limits per user: 10/min and 50/day (`AI_REQUESTS_PER_MINUTE`, `AI_REQUESTS_PER_DAY`).
- Every chat request is logged in `ai_usage` (user, model, input/output tokens, number of sources) —
  **no message content is stored**. Admins: `GET /api/v1/ai/usage`.
- Model refusals are handled (`stop_reason == "refusal"`); server-side fallback is enabled
  (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).
- Claude API errors map to 429 / 503 / 502 with friendly messages.

## Configuration (server `.env`)
| Variable | Default | |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | required to enable chat |
| `AI_MODEL` | `claude-opus-5-5` | |
| `AI_EFFORT` | `low` | `low`/`medium`/`high`/`xhigh`/`max` |

## Next
- pgvector semantic retrieval once there is enough verified content.
- Writing help in the SANTALIQ Write editor (spelling suggestions grounded in the dictionary).
- Streaming responses.
