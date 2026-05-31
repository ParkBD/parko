#!/usr/bin/env bash
# scripts/dev.sh — Cross-platform dev launcher for Linux and macOS.
# Auto-detects OS + CPU architecture and applies the right compose override.
#
# Usage:
#   bash scripts/dev.sh            # starts all services
#   bash scripts/dev.sh up -d      # detached
#   bash scripts/dev.sh down       # stop and remove containers
#   bash scripts/dev.sh logs api   # tail logs for a service
#   bash scripts/dev.sh build      # rebuild images (e.g. after package.json change)
set -euo pipefail

OS="$(uname -s)"
ARCH="$(uname -m)"
BASE="-f docker-compose.yml"
OVERRIDE=""

# ── Detect platform ─────────────────────────────────────────────────────────
case "$OS" in
  Darwin)
    if [[ "$ARCH" == "arm64" ]]; then
      export DOCKER_DEFAULT_PLATFORM="linux/arm64"
      echo "[dev] macOS Apple Silicon detected → linux/arm64"
    else
      export DOCKER_DEFAULT_PLATFORM="linux/amd64"
      echo "[dev] macOS Intel detected → linux/amd64"
    fi
    OVERRIDE="-f docker-compose.mac.yml"
    ;;
  Linux)
    export DOCKER_DEFAULT_PLATFORM="linux/amd64"
    # Export host UID/GID so linux override maps file ownership correctly
    export UID="$(id -u)"
    export GID="$(id -g)"
    OVERRIDE="-f docker-compose.linux.yml"
    echo "[dev] Linux detected → linux/amd64 (UID=$UID GID=$GID)"
    ;;
  *)
    echo "[dev] Unknown OS: $OS — using defaults"
    ;;
esac

# ── Enable BuildKit ─────────────────────────────────────────────────────────
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

CMD="${1:-up}"
shift || true

case "$CMD" in
  up)
    echo "[dev] Starting ParkNest dev stack..."
    docker compose $BASE $OVERRIDE up "$@"
    ;;
  down)
    docker compose $BASE $OVERRIDE down "$@"
    ;;
  build)
    echo "[dev] Rebuilding images (clears node_modules volumes)..."
    docker compose $BASE $OVERRIDE build --no-cache "$@"
    ;;
  restart)
    docker compose $BASE $OVERRIDE restart "$@"
    ;;
  logs)
    docker compose $BASE $OVERRIDE logs -f "$@"
    ;;
  shell)
    SERVICE="${1:-api}"
    echo "[dev] Opening shell in $SERVICE..."
    docker compose $BASE $OVERRIDE exec "$SERVICE" sh
    ;;
  migrate)
    echo "[dev] Running Prisma migrations..."
    docker compose $BASE $OVERRIDE exec api npx prisma migrate dev
    ;;
  seed)
    echo "[dev] Running database seed..."
    docker compose $BASE $OVERRIDE exec api npx ts-node prisma/seed.ts
    ;;
  studio)
    echo "[dev] Starting Prisma Studio..."
    docker compose $BASE $OVERRIDE exec api npx prisma studio --browser none
    ;;
  reset)
    echo "[dev] Resetting database (drops all data)..."
    docker compose $BASE $OVERRIDE exec api npx prisma migrate reset --force
    ;;
  ps)
    docker compose $BASE $OVERRIDE ps
    ;;
  *)
    docker compose $BASE $OVERRIDE "$CMD" "$@"
    ;;
esac
