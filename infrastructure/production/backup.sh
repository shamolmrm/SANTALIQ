#!/usr/bin/env bash
# Nightly PostgreSQL backup for SANTALIQ (installed as /etc/cron.d/santaliq-backup by deploy.sh).
# Keeps 14 days of compressed dumps in /home/ubuntu/backups/santaliq.
# Restore: gunzip -c FILE | docker exec -i santaliq-postgres psql -U santaliq -d santaliq
set -euo pipefail

DEST=/home/ubuntu/backups/santaliq
KEEP_DAYS=14
mkdir -p "$DEST"
chmod 700 "$DEST"

file="$DEST/santaliq-$(date +%Y%m%d-%H%M%S).sql.gz"
docker exec santaliq-postgres pg_dump -U santaliq -d santaliq --no-owner --clean --if-exists | gzip -9 > "$file.tmp"
mv "$file.tmp" "$file"
chmod 600 "$file"

find "$DEST" -name 'santaliq-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $file ($(du -h "$file" | cut -f1))"
