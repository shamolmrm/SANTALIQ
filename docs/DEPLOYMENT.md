# Deployment

**Live:** https://santaliq.supersoftltd.com · **Server:** Contabo VPS `144.91.74.148` (shared with other projects — never touch their containers)

## Deploy
```bash
.\scripts\push-all.ps1      # PowerShell: push to both GitHub repos
bash scripts/deploy.sh      # Git Bash: deploy committed HEAD
```
`deploy.sh` steps:
1. Upload `git archive HEAD` to a staging dir on the server.
2. Create `/home/ubuntu/docker/websites/santaliq/.env` with generated secrets (first deploy only, mode 600).
3. **Run backend lint + tests in Docker** (`backend/Dockerfile` target `test`). Failure stops the deploy before live containers are touched.
4. Swap source, build images, `docker compose up -d`. The API runs `alembic upgrade head` on start.
5. Install the nightly backup cron.
6. Smoke-test web and `/api/v1/health/ready` from inside the proxy network.

## Containers (compose project `santaliq`)
| Container | Image | Networks | Memory |
| --- | --- | --- | --- |
| `santaliq-web` | Next.js standalone | proxy | 512 MB |
| `santaliq-api` | FastAPI (2 workers) | proxy, santaliq_internal | 512 MB |
| `santaliq-translate` | NLLB-200 / CTranslate2 int8 | santaliq_internal | 2 GB, 2 CPU |
| `santaliq-postgres` | pgvector/pgvector:pg16 | santaliq_internal | 1 GB |
| `santaliq-redis` | redis:7-alpine (password, LRU 200 MB, no persistence) | santaliq_internal | 256 MB |

Database and Redis publish **no ports** — reachable only from SANTALIQ containers.
Data volume: `santaliq_pgdata` (survives redeploys; never run `down -v`).

## Backups
- `/usr/local/bin/santaliq-backup` via `/etc/cron.d/santaliq-backup` at 03:15 daily → `/home/ubuntu/backups/santaliq/*.sql.gz` (mode 600), 14-day retention. Log: `/var/log/santaliq-backup.log`.
- Restore: `gunzip -c FILE | docker exec -i santaliq-postgres psql -U santaliq -d santaliq`
- TODO: copy backups off-server (object storage) once available.

## Domain & SSL
Nginx site: `infrastructure/production/nginx/santaliq.conf` → NPM custom sites. Certificate from host certbot (webroot), auto-renewed; hook reloads the proxy.
New domain: DNS A record → add to nginx conf → `infrastructure/production/enable-domain.sh <domain>` on the VPS.

## Useful commands (on the VPS)
```bash
cd /home/ubuntu/docker/websites/santaliq
C="docker compose --env-file .env -f app/infrastructure/production/docker-compose.yml"
$C ps
$C logs -f --tail 100 api
docker exec -it santaliq-postgres psql -U santaliq -d santaliq
```
