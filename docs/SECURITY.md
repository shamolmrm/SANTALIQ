# Security

## In place
- HTTPS only (HTTP → 301), HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Containers run as non-root users with health checks and log rotation.
- Model service is on an internal Docker network only; not reachable from the internet.
- Input validation on every API endpoint (Pydantic); translation text capped at 2000 characters.
- Secrets never committed; only `.env.example` in Git. Deploys ship committed code only (`git archive`).
- Translation text stays on SANTALIQ's server (no third-party API).

- Per-IP rate limiting on `/api/v1/translate` (20/min, Redis).
- PostgreSQL and Redis on an internal network with no published ports; generated passwords in a mode-600 `.env` on the server.
- Nightly database backups (14 days), mode 600.
- Backend lint + tests run in Docker before every deploy.

- Accounts: Argon2id password hashes; server-side sessions (token hashed at rest, HttpOnly/Secure/SameSite=Lax cookie, 30 days);
  generic login errors (no account enumeration) with equal timing; login/register rate limit 10/min/IP.
- CSRF: SameSite=Lax cookies plus an Origin check that rejects state-changing requests from other sites.
- RBAC (member / reviewer / admin) enforced server-side; reviewers cannot verify their own entries;
  admins cannot change their own role; disabling a user deletes their sessions.
- Audit log (`audit_events`) for register, login, submissions, reviews and user changes.

## To do
- Off-server backup copies.
- Email verification and password reset (needs an email sender).
- Content moderation/abuse reporting before any social features.
- Database backups and restore drills.
