# Module: Translator

**Status:** Beta — `/tools/translator`
**Code:** `services/translate/` (model service) · `backend/app/modules/translate/` (API) · `frontend/src/components/translator.tsx` (UI)

## How it works
```
Browser ──POST /api/v1/translate──▶ santaliq-api ──▶ santaliq-translate (internal network only)
                                                       NLLB-200 distilled 600M · CTranslate2 int8 · CPU
```
- Santali input in any script is converted to Ol Chiki in the browser before sending.
- Santali output is converted in the browser to all five scripts (Ol Chiki, Roman, Bengali, Odia, Devanagari).
- 50+ languages; list in `backend/app/modules/translate/languages.py` (FLORES-200 codes).
- Text stays on SANTALIQ's server — no third-party API.

## Model
| | |
| --- | --- |
| Model | `facebook/nllb-200-distilled-600M` converted to CTranslate2 int8 at image build time |
| Santali code | `sat_Beng` (NLLB's label; its Santali data is Ol Chiki — output script is auto-detected anyway) |
| License | **CC-BY-NC-4.0 — non-commercial use only.** Any paid/commercial translation feature needs a different model or licence. |
| Resources | container limited to 2 GB RAM / 2 CPUs; one request at a time (lock), beam size 4 |

## Engines
| Engine | Where it runs | Status |
| --- | --- | --- |
| Meta NLLB-200 (`nllb`, default) | SANTALIQ server, private | live |
| Google Cloud Translation v2 (`google`) | Google — text is sent to Google | off until `GOOGLE_TRANSLATE_API_KEY` is set in the server `.env` |

`GET /api/v1/translate/engines` lists them; `POST /api/v1/translate` takes `engine`. Google receives ISO codes
from `languages.py`; Santali uses `GOOGLE_SANTALI_CODE` (default `sat`) — confirm against Google's
supported-languages list when the key is added. Cache keys include the engine.

## Listen & speak
Browser Web Speech API: 🔊 text-to-speech for input and output, 🎤 speech input (Chrome/Edge/Safari).
Uses the voices installed on the device; buttons explain when a voice is missing. No browser offers
Santali voice or recognition yet — SANTALIQ Voice (Phase 4) will provide it.

## Limits & safety
- 2000 characters per request; unknown language codes rejected (422).
- API returns 503 when the model service is down or still loading.

## Next steps
- Rate limiting per IP (Phase 1 hardening).
- Quality evaluation with native speakers on a fixed test set; collect corrections as verified data.
- Consider a larger NLLB model or fine-tuning on verified SANTALIQ data (Phase 3).
