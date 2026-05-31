#!/usr/bin/env bash
# scripts/init-secrets.sh
# Creates Docker secrets from .env.production values.
# Run once on a fresh server before first deploy.
# Requires: Docker Swarm (docker swarm init) OR just creates plain files.
#
# Usage: bash scripts/init-secrets.sh
set -euo pipefail

SECRETS_DIR="$(dirname "$0")/../secrets"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

prompt_secret() {
  local name="$1"
  local file="$SECRETS_DIR/$name.txt"
  if [ -f "$file" ]; then
    echo "[skip] $name already exists"
    return
  fi
  read -rsp "Enter $name: " value
  echo
  printf '%s' "$value" > "$file"
  chmod 600 "$file"
  echo "[ok]   $name written to $file"
}

echo "=== ParkNest Secret Initialisation ==="
echo "Files will be written to $SECRETS_DIR/"
echo "These are mounted as Docker secrets — never commit them to git."
echo ""

prompt_secret "db_password"
prompt_secret "redis_password"
prompt_secret "jwt_secret"
prompt_secret "minio_root_password"

echo ""
echo "=== Done. Secrets written to $SECRETS_DIR/ ==="
echo "Add $SECRETS_DIR/ to .gitignore if not already present."
