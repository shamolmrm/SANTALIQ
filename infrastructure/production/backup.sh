#!/usr/bin/env bash
# Nightly PostgreSQL backup for SANTALIQ (installed as /etc/cron.d/santaliq-backup by deploy.sh).
# Keeps 14 days of compressed dumps in /home/ubuntu/backups/santaliq.
# Restore: gunzip -c FILE | docker exec -i santaliq-postgres psql -U santaliq -d santaliq
#
# Optional off-server copy (set both in /home/ubuntu/docker/websites/santaliq/.env):
#   BACKUP_REMOTE      rclone target, e.g. ":s3,provider=Other,access_key_id=…,secret_access_key=…,endpoint=https://…:bucket/santaliq"
#   BACKUP_PASSPHRASE  long random secret; the copy is AES-256 encrypted before upload
# Decrypt: openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in FILE.enc -out FILE -pass env:BACKUP_PASSPHRASE
set -euo pipefail

DEST=/home/ubuntu/backups/santaliq
ENV_FILE=/home/ubuntu/docker/websites/santaliq/.env
KEEP_DAYS=14
mkdir -p "$DEST"
chmod 700 "$DEST"

file="$DEST/santaliq-$(date +%Y%m%d-%H%M%S).sql.gz"
docker exec santaliq-postgres pg_dump -U santaliq -d santaliq --no-owner --clean --if-exists | gzip -9 > "$file.tmp"
mv "$file.tmp" "$file"
chmod 600 "$file"
find "$DEST" -name 'santaliq-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $file ($(du -h "$file" | cut -f1))"

# ── voice recordings: local mirror (withdrawn clips are removed here too) ──
VOICE_SRC=/home/ubuntu/docker/websites/santaliq/data/voice
if [ -d "$VOICE_SRC" ]; then
  mkdir -p "$DEST/voice"
  if command -v rsync >/dev/null; then
    rsync -a --delete "$VOICE_SRC/" "$DEST/voice/"
  else
    rm -rf "$DEST/voice.tmp" && cp -a "$VOICE_SRC" "$DEST/voice.tmp" && rm -rf "$DEST/voice" && mv "$DEST/voice.tmp" "$DEST/voice"
  fi
  echo "$(date -Is) voice mirror ok ($(find "$DEST/voice" -type f | wc -l) files)"
fi

# ── optional encrypted off-server copy ──
BACKUP_REMOTE="$(grep -E '^BACKUP_REMOTE=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"
BACKUP_PASSPHRASE="$(grep -E '^BACKUP_PASSPHRASE=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"
if [ -n "$BACKUP_REMOTE" ] && [ -n "$BACKUP_PASSPHRASE" ]; then
  export BACKUP_PASSPHRASE
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -in "$file" -out "$file.enc" -pass env:BACKUP_PASSPHRASE
  docker run --rm -v "$DEST:/data:ro" rclone/rclone:1.68 copyto "/data/$(basename "$file").enc" "$BACKUP_REMOTE/$(basename "$file").enc"
  rm -f "$file.enc"
  echo "$(date -Is) off-server copy ok"
else
  echo "$(date -Is) off-server copy skipped (BACKUP_REMOTE / BACKUP_PASSPHRASE not set)"
fi
