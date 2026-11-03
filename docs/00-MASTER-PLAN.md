# SANTALIQ — Master Plan

**Santali Language. AI Innovation.**

## Vision
A model for the digital revival of Indigenous languages — starting with Santali. SANTALIQ makes Santali a first-class digital language: verified language data, script-aware tools, grounded AI, voice, learning, heritage and community.

## Principles
1. **Santali first, multi-script** — Ol Chiki, Bengali, Devanagari, Odia, Roman.
2. **Verified data is the core asset** — every word/sentence has a verification status; unverified contributions never feed AI directly.
3. **Community data sovereignty** — consent, credit and permission for language, voice and cultural data.
4. **Low-internet first** — fast, light pages; PWA and offline dictionary later.
5. **Ship early** — a useful public beta by month 3.
6. **Open** — verified dataset under CC BY 4.0; open-source code licence still to decide.

## Signature features
| Feature | Description |
| --- | --- |
| Universal Script Switch | View any content in any supported script with one click |
| Santali Smart Keyboard | Type Roman → Ol Chiki (web first, Android later) |
| Living Dictionary | Native-speaker audio, dialect info, verification badges, community contributions |
| Grounded Santali AI | RAG answers with citations from verified SANTALIQ data |
| Open Santali Dataset | Verified data released for researchers |

## Roadmap
| Phase | Months | Scope | Outcome |
| --- | --- | --- | --- |
| 0 — Setup | wk 1–2 | Repo, docs, brand, architecture, local dev environment | Ready to build |
| 1 — Foundation + Script Engine | 1–3 | Next.js/FastAPI/Postgres base, homepage, static pages, script converter, web keyboard, dictionary v1, basic auth/profile | **Public beta** |
| 2 — Language Data + Write | 4–6 | Contribution + admin review workflow, pronunciation audio, SANTALIQ Write (articles/poetry/stories with script switch), contributor profiles | Community content |
| 3 — SANTALIQ AI | 7–9 | Translator (existing open models + verified data), RAG chat with citations, writing/grammar help, feedback loop, Open Dataset v1 | AI platform |
| 4 — Voice | 10–12 | Consented voice collection campaign, TTS, then ASR, pronunciation trainer | Santali voice |
| 5 — Learn + Heritage | 13–15 | Ol Chiki courses, quizzes, kids section; folk stories, songs, festivals, history archive (verified, consented) | Education & culture |
| 6 — Community, Mobile, Global | 16–18+ | Groups, feed, events, Android app + keyboard, public API, support for other Indigenous languages | Ecosystem |

Later (only once there are real users): marketplace, careers, video hosting, live streaming, creator monetization.

## Phase 0 — first week
| Day | Task | Status |
| --- | --- | --- |
| 1 | Git repo, folder structure, `.gitignore`, README, CLAUDE.md, this plan, GitHub (shamolbro + shamolmrm, private) | done |
| 1b | Production deploy to VPS: `santaliq-web` + `santaliq-api` containers | done (domain/SSL waits for DNS A record) |
| 2 | Requirements + architecture docs | todo |
| 3 | Initial database design | todo |
| 4 | Docker Compose: PostgreSQL + Redis | compose file written; Docker Desktop not installed yet |
| 5 | Next.js 16 setup + design system + homepage | done (lint, typecheck, build pass) |
| 6 | FastAPI setup, `/api/v1/health`, test | done (pytest, ruff pass); frontend ↔ backend wiring todo |
| 7 | Push, weekly review | todo |

## Phase 1 progress
| Task | Status |
| --- | --- |
| Script Converter — 5 scripts (Ol Chiki, Roman, Bengali, Odia, Devanagari), browser-side engine, tests | **beta live** — rules await native-speaker review ([module doc](modules/SCRIPT-CONVERTER.md)) |
| Translator — Santali ↔ 50+ languages, self-hosted NLLB-200 (CC-BY-NC) | **beta live** ([module doc](modules/TRANSLATOR.md)) |
| Multi-script keyboard | **live** (`/tools/keyboard`) |
| Dictionary v1: contributions, review, multi-script search | **live** (empty until community adds entries) |
| Accounts: register/login, roles, admin, password change; email verify/reset (off until SMTP) | **live** |
| Admin dashboard: overview, review tabs, content, users, activity log, system status | **live** ([module doc](modules/ADMIN.md)) |

## Phase 2 progress
| Task | Status |
| --- | --- |
| Language data system (contribute → review → verified) | **live** |
| SANTALIQ Write v1 — drafts, publish, reader script switch, reports & moderation | **live** ([module doc](modules/WRITE.md)) |
| Contributor profiles (`/people/{id}`, bio editing) + leaderboard (`/dataset` credits) | **live** |
| SEO for Write: server-rendered pieces, Open Graph, JSON-LD, `sitemap.xml` | **live** |
| Pronunciation audio (consented) | todo — needs object storage |

## Phase 3 progress
| Task | Status |
| --- | --- |
| Grounded retrieval over verified dictionary + Write | **live** (`/api/v1/ai/search`) |
| SANTALIQ AI chat with citations (Claude) | **built** — enabled once `ANTHROPIC_API_KEY` is set ([module doc](modules/AI.md)) |
| AI usage log + admin usage endpoint | **live** |
| Open Dataset v1 (`/dataset`, JSON + CSV of verified entries) + contributor credits | **live** — licensed **CC BY 4.0** (ADR 016) |
| Writing help in editor, pgvector retrieval | todo |

## Phase 4 progress
| Task | Status |
| --- | --- |
| Consented voice collection: consent (public / research choices), browser recorder, dictionary prompts, reviewer verification, withdrawal, public listening library | **beta live** ([module doc](modules/VOICE.md)) |
| Research export of voice data | todo (owner licence decision) |
| Santali TTS / ASR | todo (needs enough verified hours) |

## Phase 5 progress
| Task | Status |
| --- | --- |
| Learn Ol Chiki v1 — alphabet explorer, digits, marks, quizzes | **live** ([module doc](modules/LEARN.md)) |
| Heritage archive v1: consented, sourced community submissions, reviewer verification, withdraw anytime | **beta live** ([module doc](modules/HERITAGE.md)); empty until the community shares |
| Vocabulary lessons, progress tracking | todo (needs verified content) |

## Paused (no budget yet)
- SANTALIQ AI chat (`ANTHROPIC_API_KEY`), Google Translate engine (`GOOGLE_TRANSLATE_API_KEY`) — code ready, switched off.

### Local commands
- Frontend: `cd frontend` → `pnpm dev` (http://localhost:3000) · `pnpm lint` · `pnpm typecheck` · `pnpm build`
- Backend: `cd backend` → `.venv\Scripts\activate` → `uvicorn app.main:app --reload` (http://localhost:8000/docs) · `pytest` · `ruff check .`
- Services: `docker compose up -d` (needs Docker Desktop)
- Push to both GitHub accounts: `.\scripts\push-all.ps1`
- Deploy committed HEAD to VPS (Git Bash): `bash scripts/deploy.sh`
- One-time domain + SSL on VPS (after DNS): `bash /home/ubuntu/docker/websites/santaliq/app/infrastructure/production/enable-domain.sh`

## Open decisions
- [ ] Domain / subdomain and where its DNS is managed
- [ ] Production VPS (Contabo) details
- [ ] Solo or team; Santali language advisor
- [ ] Monthly budget (VPS, domain, AI APIs)
- [x] Dataset licence: CC BY 4.0 (ADR 016) · [ ] code licence
- [ ] Source of initial dictionary data (copyright-safe)
- [ ] LLM provider for in-product AI (Phase 3)
