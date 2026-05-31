#!/usr/bin/env bash
# scripts/backup.sh
# PostgreSQL backup → local file + optional upload to MinIO/S3.
# Schedule with cron: 0 2 * * * /opt/parknest/scripts/backup.sh >> /var/log/parknest-backup.log 2>&1
#
# Env vars (set in /etc/environment or .env.production):
#   POSTGRES_USER, POSTGRES_DB, BACKUP_S3_BUCKET, BACKUP_S3_ENDPOINT
set -euo pipefail

BACKUP_DIR="/opt/parknest/backups"
COMPOSE_FILE="/opt/parknest/docker-compose.prod.yml"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILENAME="parknest_${TIMESTAMP}.sql.gz"
FULL_PATH="$BACKUP_DIR/$FILENAME"
RETENTION_DAYS=14

POSTGRES_USER="${POSTGRES_USER:-parknest}"
POSTGRES_DB="${POSTGRES_DB:-parknest_db}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "$BACKUP_DIR"

log "=== Starting backup: $FILENAME ==="

# Dump inside the postgres container (password read from Docker secret)
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FULL_PATH"

SIZE=$(du -sh "$FULL_PATH" | cut -f1)
log "Backup written: $FULL_PATH ($SIZE)"

# Optional: upload to MinIO / S3 using mc (MinIO Client)
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  docker compose -f "$COMPOSE_FILE" exec -T minio \
    mc cp "/backups/$FILENAME" "local/$BACKUP_S3_BUCKET/$FILENAME" 2>/dev/null || \
  log "WARN: MinIO upload failed — keeping local copy"
  log "Uploaded to s3://$BACKUP_S3_BUCKET/$FILENAME"
fi

# Prune local backups older than RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -name "parknest_*.sql.gz" \
  -mtime +$RETENTION_DAYS -print -delete | wc -l)
log "Pruned $DELETED backup(s) older than $RETENTION_DAYS days"

log "=== Backup complete ==="
