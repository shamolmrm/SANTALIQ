# Deployment

**Live:** https://santaliq.supersoftltd.com · **Server:** Contabo VPS `144.91.74.148` (shared with other projects — never touch their containers)

## Deploy
```bash
.\scripts\push-all.ps1      # PowerShell: push to both GitHub repos
bash scripts/deploy.sh      # Git Bash: deploy committed HEAD
```
`deploy.sh` uploads `git archive HEAD` to `/home/ubuntu/docker/websites/santaliq/app`, builds images,
runs `docker compose up -d`, and smoke-tests web and API from inside the proxy network.
A failed build leaves the running containers untouched.

## Containers (compose project `santaliq`)
| Container | Image | Networks | Limits |
| --- | --- | --- | --- |
| `santaliq-web` | Next.js standalone | proxy | — |
| `santaliq-api` | FastAPI | proxy, santaliq_internal | — |
| `santaliq-translate` | NLLB-200 / CTranslate2 | santaliq_internal | 2 GB RAM, 2 CPU |

## Domain & SSL
Nginx site: `infrastructure/production/nginx/santaliq.conf` → installed into NPM custom sites.
Certificate: host certbot (webroot), auto-renewed; renewal hook reloads the proxy.
New domain: add DNS A record → run `infrastructure/production/enable-domain.sh <domain>` on the VPS
(after adding the domain to the nginx conf).

## Useful commands (on the VPS)
```bash
cd /home/ubuntu/docker/websites/santaliq/app
docker compose -f infrastructure/production/docker-compose.yml ps
docker compose -f infrastructure/production/docker-compose.yml logs -f --tail 100 api
```
