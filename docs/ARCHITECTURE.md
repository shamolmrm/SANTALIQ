# Architecture

## Overview
```
Browser
  │ HTTPS
  ▼
Nginx Proxy Manager (shared VPS, ports 80/443, Let's Encrypt)
  ├── /api/*  ──▶ santaliq-api   (FastAPI, :8000) ──▶ santaliq-translate (NLLB, :8100, internal only)
  └── /*      ──▶ santaliq-web   (Next.js standalone, :3000)
```
- **Modular monolith**: one API (`backend/app`), one module per domain under `backend/app/modules/`.
  Heavy ML workloads run as separate internal services (`services/`) so they can be limited and scaled independently.
- **Networks**: `proxy` (shared, external) for web + api; `santaliq_internal` for api ↔ model services.
- **Browser-side language tools**: script conversion runs in the browser (`frontend/src/lib/script/engine.ts`) — instant and offline-friendly.

## Repository
| Path | Purpose |
| --- | --- |
| `frontend/` | Next.js 16 App Router, TypeScript strict, Tailwind v4 |
| `backend/app/core` | settings |
| `backend/app/api/v1` | versioned routers |
| `backend/app/modules/<domain>` | domain modules (current: `translate`) |
| `services/translate` | NLLB-200 model service (CTranslate2 int8) |
| `infrastructure/production` | compose stack, nginx site, domain/SSL script |
| `scripts/` | `deploy.sh`, `push-all.ps1` |

## Data (planned)
PostgreSQL 16 + pgvector, SQLAlchemy 2 + Alembic. First domains: users/auth, language data
(words, sentences, per-script renderings, dialect, source, contributor, consent, verification status).
Redis for rate limiting and caching. Not yet deployed to production.

## API conventions
- Prefix `/api/v1`; JSON; Pydantic validation (422 on invalid input).
- Upstream service failures → 503 (unavailable) / 502 (bad response).
