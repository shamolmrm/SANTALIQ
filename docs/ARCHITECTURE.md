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

## Data
- **PostgreSQL 16 + pgvector** (`santaliq-postgres`), SQLAlchemy 2, Alembic (`backend/migrations`, applied on API start).
- Language domain (`backend/app/modules/language`): `lexemes` (Ol Chiki headword, POS, dialect, status
  draft/pending/verified/rejected, source, contributor, consent) → `spellings` (per script, search key) and
  `senses` (gloss per language). Only `verified` entries are served. No data is seeded.
- **Redis** (`santaliq-redis`): per-IP rate limit (translator 20/min) and 7-day translation cache. Fails open.

## Endpoints
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/health` | liveness |
| GET | `/api/v1/health/ready` | database, Redis, model service; 503 if degraded |
| GET | `/api/v1/translate/languages` | 50+ languages |
| POST | `/api/v1/translate` | rate-limited, cached |
| GET | `/api/v1/dictionary/search?q=` | verified entries, prefix match in any script |
| POST | `/api/v1/auth/register` · `/login` · `/logout` | session cookie; rate-limited 10/min/IP |
| GET | `/api/v1/auth/me` | current user |
| GET | `/api/v1/people/{id}` | public profile: name, bio, join date, published pieces, verified words (never email/role) |
| PATCH | `/api/v1/people/me` | signed in; edit own display name + bio |
| GET | `/api/v1/write/sitemap` | published slugs for `/sitemap.xml` |
| GET/POST/DELETE | `/api/v1/heritage/...`, `/api/v1/admin/heritage` | Heritage archive ([module doc](modules/HERITAGE.md)) |
| GET/PUT/POST/DELETE | `/api/v1/voice/...`, `/api/v1/admin/voice` | Voice collection ([module doc](modules/VOICE.md)) |
| POST | `/api/v1/dictionary/entries` | signed in; creates `pending` entry (source + consent required) |
| GET | `/api/v1/dictionary/entries/mine` | own submissions with status |
| GET | `/api/v1/admin/stats` · `/admin/review` | reviewer+ |
| POST | `/api/v1/admin/review/{id}` | reviewer+; verify/reject; not own entry (unless admin) |
| GET/PATCH | `/api/v1/admin/users[/{id}]` | admin; role and active status; cannot change self |

## Users & roles
`member` (contribute) → `reviewer` (verify others' entries) → `admin` (manage users).
Sessions: random token in an HttpOnly, Secure, SameSite=Lax cookie; only its SHA-256 is stored (`sessions`).
Passwords: Argon2id. Every sensitive action is written to `audit_events`.
Operator CLI: `docker exec santaliq-api python -m app.cli set-role <email> admin|reviewer|member` · `list-users`.

## API conventions
- Prefix `/api/v1`; JSON; Pydantic validation (422 on invalid input).
- Upstream service failures → 503 (unavailable) / 502 (bad response).
