# SANTALIQ

**Santali Language. AI Innovation.**

SANTALIQ is a digital home for the Santali language, people and culture — script tools, a living dictionary, grounded AI, voice, learning, heritage and community. Built Santali-first and multi-script: **Ol Chiki · বাংলা · देवनागरी · ଓଡ଼ିଆ · Roman**.

🌐 **Live:** https://santaliq.supersoftltd.com
🩺 **API health:** https://santaliq.supersoftltd.com/api/v1/health

> **Status:** public beta. Live now:
> - [Translator](https://santaliq.supersoftltd.com/tools/translator): Santali ↔ 50+ languages (self-hosted NLLB-200), with listen and speak
> - [Script Converter](https://santaliq.supersoftltd.com/tools/script-converter) and [Keyboard](https://santaliq.supersoftltd.com/tools/keyboard): Ol Chiki ↔ Roman ↔ Bengali ↔ Odia ↔ Devanagari
> - [Dictionary](https://santaliq.supersoftltd.com/tools/dictionary): community contributions with reviewer verification
> - [Write](https://santaliq.supersoftltd.com/write): articles, poetry and stories in any script, with author profiles and SEO
> - [Heritage](https://santaliq.supersoftltd.com/heritage): consented, sourced and reviewed archive of stories, songs, festivals and history
> - [Voice](https://santaliq.supersoftltd.com/voice): consented Santali voice collection with review (for future TTS / ASR)
> - [Learn](https://santaliq.supersoftltd.com/learn): Ol Chiki alphabet and quizzes
> - [Open Dataset](https://santaliq.supersoftltd.com/dataset): verified lexicon as JSON/CSV (CC BY 4.0)
> - [News](https://santaliq.supersoftltd.com/news), [Careers](https://santaliq.supersoftltd.com/careers), [Groups](https://santaliq.supersoftltd.com/groups), private messages, follows, comments, feed and notifications
> - [Market](https://santaliq.supersoftltd.com/market), [Media](https://santaliq.supersoftltd.com/media), [Digital library](https://santaliq.supersoftltd.com/library)
> - [Developer API](https://santaliq.supersoftltd.com/developers) ([OpenAPI docs](https://santaliq.supersoftltd.com/api/v1/docs))
> - Bengali interface (EN / বাংলা), installable PWA with offline tools, admin dashboard, error monitoring
> - [AI](https://santaliq.supersoftltd.com/ai): grounded search (chat is built, and stays off until an API key is set)

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Web | [Next.js 16](https://nextjs.org) (App Router) · [React 19](https://react.dev) · [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) · Noto Sans Ol Chiki / Bengali / Devanagari / Oriya · Inter · Fraunces |
| API | [Python 3.12](https://www.python.org) · [FastAPI](https://fastapi.tiangolo.com) · [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) |
| Data | [PostgreSQL 16](https://www.postgresql.org) + [pgvector](https://github.com/pgvector/pgvector) · [SQLAlchemy 2](https://www.sqlalchemy.org) · [Alembic](https://alembic.sqlalchemy.org) · [Redis](https://redis.io) |
| Translation | [NLLB-200](https://huggingface.co/facebook/nllb-200-distilled-600M) (CC-BY-NC 4.0) on [CTranslate2](https://github.com/OpenNMT/CTranslate2) |
| Tooling | [pnpm](https://pnpm.io) · ESLint · [Ruff](https://docs.astral.sh/ruff/) · [pytest](https://pytest.org) |
| Infrastructure | [Docker](https://www.docker.com) · Nginx (via Nginx Proxy Manager) · Let's Encrypt · Ubuntu 24.04 VPS |

Architecture: **modular monolith** — one API with a module per domain (`backend/app/modules/`), one web app. Services are split out only when scale demands it.

## Roadmap

| Phase | Scope |
| --- | --- |
| 1 | Foundation, script converter, Ol Chiki keyboard, dictionary — **public beta** |
| 2 | Verified language data system, SANTALIQ Write (articles, poetry, stories) |
| 3 | Grounded Santali AI (RAG with citations), translator, open dataset |
| 4 | Santali voice — consented dataset, TTS, ASR |
| 5 | Learning (Ol Chiki courses) and heritage archive |
| 6 | Community, Android app, public API, other Indigenous languages |

Full plan: [docs/00-MASTER-PLAN.md](docs/00-MASTER-PLAN.md)

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | Next.js web app |
| `backend/` | FastAPI service |
| `infrastructure/production/` | Production compose stack, nginx site, domain/SSL script |
| `scripts/` | `deploy.sh`, `push-all.ps1` |
| `docs/` | Plan, architecture, decisions, progress |
| `docker-compose.yml` | Local PostgreSQL + Redis |

## Local development

```bash
# Web — http://localhost:3000
cd frontend
pnpm install
pnpm dev            # also: pnpm lint · pnpm typecheck · pnpm build

# API — http://localhost:8000/docs
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload                     # also: pytest · ruff check .

# Database services (Docker Desktop)
docker compose up -d
```

## Deployment

```bash
./scripts/push-all.ps1     # push to both GitHub mirrors (PowerShell)
bash scripts/deploy.sh     # deploy committed HEAD to the VPS (Git Bash)
```

## Principles

- **Santali first** — every feature is designed for Santali speakers.
- **Verified data** — contributions are reviewed before publishing or AI use.
- **Community owned** — language, voice and cultural knowledge shared with consent and credited.
- **Works on slow internet** — light, fast pages.
