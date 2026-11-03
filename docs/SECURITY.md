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

## Security review — 2026-11-03
| Check | Result |
| --- | --- |
| Dependencies: `pnpm audit --prod`, `pip-audit` | No known vulnerabilities in app dependencies. The base image's `pip` 25.0.1 had advisories, so images now upgrade `pip>=26.2`. |
| **Rate-limit bypass via spoofed `X-Forwarded-For`** | **Fixed.** Twelve logins with fake XFF values were never limited. `client_ip()` now uses `X-Real-IP`, which nginx overwrites with the real address. A regression test covers it. |
| Password reset / forgot | No account enumeration (same answer either way); tokens are hashed, single-use and expire after 1 hour. |
| Registration | Reveals that an email is taken (409). This is accepted for usability and mitigated by 10/min/IP. |
| Sessions | Random 256-bit tokens, stored hashed; cookies are HttpOnly, Secure and SameSite=Lax. Changing the password signs out other sessions. |
| CSRF | Origin check on every unsafe method, plus SameSite cookies. |
| Authorization | Reviewer/admin checks on every admin route, covered by tests. Nobody can review their own contributions; the last admin cannot be deleted. |
| XSS | React escaping; Markdown subset rendered to elements (no HTML); JSON-LD `<` escaped. |
| Uploads | Audio type checked from magic bytes, 2 MB limit, served with the stored type and `nosniff`. |
| Headers | HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy (microphone self only), COOP. **CSP runs in report-only mode**, with reports going to the error monitor; enforce it once no reports appear. |
| Exposure | Postgres, Redis and the translator have no public ports; FastAPI `/docs` is not routed publicly. |
