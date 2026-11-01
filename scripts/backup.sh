#!/usr/bin/env bash
# Database + uploads backup. Usage: DATABASE_URL=mysql://user:pass@host:3306/db STORAGE_DIR=/srv/uploads ./scripts/backup.sh [outdir]
set -euo pipefail
OUT="${1:-backup}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$OUT"

# Parse DATABASE_URL (mysql://user:pass@host:port/db) without printing the password.
proto="${DATABASE_URL#mysql://}"
creds="${proto%%@*}"; rest="${proto#*@}"
DB_USER="${creds%%:*}"; DB_PASS="${creds#*:}"
hostport="${rest%%/*}"; DB_NAME="${rest#*/}"; DB_NAME="${DB_NAME%%\?*}"
DB_HOST="${hostport%%:*}"; DB_PORT="${hostport#*:}"; [ "$DB_PORT" = "$hostport" ] && DB_PORT=3306

MYSQL_PWD="$DB_PASS" mysqldump --single-transaction --routines --default-character-set=utf8mb4 \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" | gzip > "$OUT/db-$STAMP.sql.gz"
tar -czf "$OUT/uploads-$STAMP.tar.gz" -C "$(dirname "${STORAGE_DIR:?STORAGE_DIR required}")" "$(basename "$STORAGE_DIR")"

# Retention: keep the newest 14 of each.
for pattern in 'db-*.sql.gz' 'uploads-*.tar.gz'; do ls -1t "$OUT"/$pattern 2>/dev/null | tail -n +15 | xargs -r rm --
done
echo "Backup written to $OUT ($STAMP)"
