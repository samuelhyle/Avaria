#!/usr/bin/env bash
#
# Dumps the database to a custom-format archive. Intended for self-hosted
# deployments / scheduled cron jobs. On Neon, use the built-in PITR instead
# (and keep this as an extra copy).
#
# Usage:
#   DATABASE_URL=postgres://... ./scripts/backup-db.sh
#   BACKUP_DIR=/var/backups/averianlabs ./scripts/backup-db.sh
#
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"

FILE="$OUT_DIR/averianlabs-$(date -u +%Y%m%dT%H%M%SZ).dump"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump --format=custom --no-owner --no-privileges --dbname "$DATABASE_URL" --file "$FILE"
elif command -v docker >/dev/null 2>&1; then
  # Fall back to the pgvector image when pg_dump isn't installed locally.
  docker run --rm -i postgres:16-alpine pg_dump --format=custom --no-owner --no-privileges \
    --dbname "$DATABASE_URL" >"$FILE"
else
  echo "error: neither pg_dump nor docker is available" >&2
  exit 1
fi

echo "backup written: $FILE ($(du -h "$FILE" | cut -f1))"
