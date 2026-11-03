# Decisions (ADR log)

| # | Date | Decision | Why |
| --- | --- | --- | --- |
| 001 | 2026-11-03 | Modular monolith (Next.js + FastAPI), not microservices | Solo/small team; simpler deploy; extract services only when load demands |
| 002 | 2026-11-03 | Host on the existing Contabo VPS behind Nginx Proxy Manager, subdomain `santaliq.supersoftltd.com` | Server already has capacity; own domain later |
| 003 | 2026-11-03 | Two private GitHub repos (shamolbro = origin, shamolmrm = mirror), push both after every change | Owner's requirement |
| 004 | 2026-11-03 | All five Santali scripts are first-class (Ol Chiki, Roman, Bengali, Odia, Devanagari) | Santali communities write in all of them |
| 005 | 2026-11-03 | Script conversion in the browser with Ol Chiki as pivot; one ISCII offset table for Indic scripts | Instant, offline-friendly; fewer mapping errors |
| 006 | 2026-11-03 | Conversion rules are drafts until native-speaker review | Never invent Santali language data |
| 007 | 2026-11-03 | Translator = self-hosted NLLB-200 distilled 600M on CTranslate2 int8 | Free, private, supports Santali; ~1 GB RAM. **CC-BY-NC — non-commercial only** |
| 009 | 2026-11-03 | Own auth (Argon2 + DB sessions + cookie), no third-party identity provider yet | One SANTALIQ account; no external dependency; simple to audit |
| 010 | 2026-11-03 | Dictionary grows only via signed-in contributions + independent review; nothing seeded | Never invent Santali data; every entry has source, consent and reviewer |
| 011 | 2026-11-03 | Write uses a small Markdown subset rendered to React elements; no HTML/rich-text editor | Zero XSS surface, works for poetry, light on slow networks |
| 012 | 2026-11-03 | Writing stores the author's original script; other scripts are converted client-side at read time | Original is never altered; conversion improves as rules are reviewed |
| 008 | 2026-11-03 | Brand palette navy `#071B2B` / emerald `#13865B` / gold `#E9B83E` / soft white `#F7F9FC`, Inter typography | Owner's design direction |
