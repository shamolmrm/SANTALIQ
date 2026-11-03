#!/usr/bin/env bash
# Deploy the committed HEAD of SANTALIQ to the Contabo VPS.
# Usage (Git Bash):  ./scripts/deploy.sh
# Only committed code is deployed (git archive), never local .env files.
set -euo pipefail

SERVER="${SANTALIQ_SERVER:-root@144.91.74.148}"
REMOTE_DIR="/home/ubuntu/docker/websites/santaliq"
DOMAIN="santaliq.supersoftltd.com"
COMPOSE="docker compose -f $REMOTE_DIR/app/infrastructure/production/docker-compose.yml"

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree has uncommitted changes — commit first (only HEAD is deployed)." >&2
  exit 1
fi
REV="$(git rev-parse --short HEAD)"
echo "==> Deploying $REV to $SERVER"

# 1. Upload source (fresh copy each time)
git archive --format=tar HEAD | ssh "$SERVER" "
  set -e
  rm -rf $REMOTE_DIR/app.new && mkdir -p $REMOTE_DIR/app.new
  tar -x -C $REMOTE_DIR/app.new
  echo $REV > $REMOTE_DIR/app.new/REVISION
  rm -rf $REMOTE_DIR/app.prev
  [ -d $REMOTE_DIR/app ] && mv $REMOTE_DIR/app $REMOTE_DIR/app.prev
  mv $REMOTE_DIR/app.new $REMOTE_DIR/app
"

# 2. Build and (re)start containers
ssh "$SERVER" "
  set -e
  $COMPOSE build
  $COMPOSE up -d --remove-orphans
  docker image prune -f >/dev/null
"

# 3. Smoke test from inside the proxy network
ssh "$SERVER" "
  for i in \$(seq 1 30); do
    docker exec npm sh -c 'curl -fs -o /dev/null http://santaliq-web:3000/ && curl -fs -o /dev/null http://santaliq-api:8000/api/v1/health' && break
    sleep 2
  done
  docker exec npm sh -c 'curl -s -o /dev/null -w \"web  -> HTTP %{http_code}\n\" http://santaliq-web:3000/; curl -s -w \"\napi  -> %{http_code}\n\" http://santaliq-api:8000/api/v1/health'
"
echo "==> Done: https://$DOMAIN (revision $REV)"
