#!/usr/bin/env bash
# scripts/deploy.sh
# Zero-downtime production deploy.
# Run on the server or call from GitHub Actions.
#
# Usage: IMAGE_TAG=sha-abc1234 bash scripts/deploy.sh
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_REPO="${IMAGE_REPO:-your-org/parknest}"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

log "=== ParkNest Deploy: $IMAGE_TAG ==="

export IMAGE_TAG REGISTRY IMAGE_REPO

# 1. Pull new images
log "Pulling images..."
docker compose -f "$COMPOSE_FILE" pull api worker web

# 2. Run DB migrations (idempotent, safe to run on every deploy)
log "Running DB migrations..."
docker compose -f "$COMPOSE_FILE" run --rm --no-deps api \
  sh -c 'npx prisma migrate deploy'

# 3. Rolling restart — api + workers first, web last
log "Restarting API..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps api

# Wait up to 60s for API to be healthy
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T api \
      curl -fs http://localhost:3001/health > /dev/null 2>&1; then
    log "API healthy (${i}*2s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    log "ERROR: API did not become healthy within 60s — aborting"
    exit 1
  fi
  sleep 2
done

log "Restarting workers..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale worker=2 worker

log "Restarting web..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps web

log "Reloading nginx..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

# 4. Prune old images
log "Pruning dangling images..."
docker image prune -f

log "=== Deploy complete: $IMAGE_TAG ==="
