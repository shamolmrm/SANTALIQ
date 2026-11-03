# SANTALIQ — Instructions for Claude

## Project
Santali-first digital ecosystem. Master plan: `docs/00-MASTER-PLAN.md`. Read it before any feature work.

## Stack
- Frontend: Next.js (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui, pnpm
- Backend: Python 3.12+ FastAPI, SQLAlchemy 2, Alembic, Pydantic
- Data: PostgreSQL (+pgvector later), Redis
- Infra: Docker Compose (local), Nginx + Linux VPS (production)
- Architecture: modular monolith — one backend, one module per domain under `backend/app/modules/`

## Working rules
- The owner communicates in Bengali/Banglish; reply in Bengali.
- Work one task at a time. Plan → implement → test → update `docs/` progress. Do not start the next task automatically.
- Never commit secrets. Only `.env.example` goes in Git.
- Never invent Santali words, translations or cultural facts. Use clearly marked placeholders; language data must be verified by native speakers.
- User-contributed language data is unverified until reviewed; it must never feed AI training directly.
- Keep the architecture simple; ask before adding new services or infrastructure.

## Git
- Two remotes: `origin` (github.com/shamolbro/SANTALIQ) and `mirror` (github.com/shamolmrm/SANTALIQ). Push to both.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
