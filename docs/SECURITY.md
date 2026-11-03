# Security

## In place
- HTTPS only (HTTP → 301), HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Containers run as non-root users with health checks and log rotation.
- Model service is on an internal Docker network only; not reachable from the internet.
- Input validation on every API endpoint (Pydantic); translation text capped at 2000 characters.
- Secrets never committed; only `.env.example` in Git. Deploys ship committed code only (`git archive`).
- Translation text stays on SANTALIQ's server (no third-party API).

## To do before accounts/user content
- Rate limiting per IP (Redis) on `/api/v1/translate`.
- Authentication (secure sessions, password hashing, email verification), RBAC, audit logs.
- CSRF protection for cookie sessions; content moderation and abuse reporting.
- Database backups and restore drills.
