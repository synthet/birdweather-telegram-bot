#!/usr/bin/env bash
# Deploy to the Hetzner production host (tarball + .env + docker compose rebuild).
# Used by GitHub Actions and locally on Git Bash / WSL / Linux.
#
# Required env:
#   HETZNER_SERVER_HOST — server IPv4 or hostname
#
# Optional env:
#   HETZNER_SERVER_USER — SSH user (default: root)
#   HETZNER_REMOTE_DIR  — app path on server (default: /opt/birdweather-telegram-bot)
#   ENV_FILE            — local env file to upload (default: .env)
#   SYNC_DB             — set to 1 to upload ./data/birdweather-bot.sqlite when present
#
# GitHub Actions: set secrets HETZNER_SERVER_HOST, HETZNER_SSH_PRIVATE_KEY, HETZNER_ENV
# and write HETZNER_ENV to ENV_FILE before calling this script.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HOST="${HETZNER_SERVER_HOST:-}"
USER="${HETZNER_SERVER_USER:-root}"
REMOTE_DIR="${HETZNER_REMOTE_DIR:-/opt/birdweather-telegram-bot}"
ENV_FILE="${ENV_FILE:-.env}"
SYNC_DB="${SYNC_DB:-0}"

if [[ -z "$HOST" ]]; then
  echo "HETZNER_SERVER_HOST is required." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

ARCHIVE="$(mktemp /tmp/birdweather-bot-deploy.XXXXXX.tgz)"
trap 'rm -f "$ARCHIVE"' EXIT

echo "==> Packaging project"
tar -czf "$ARCHIVE" \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  --exclude=data/backups \
  --exclude=.tools \
  --exclude=.cursor \
  --exclude=coverage \
  --exclude=docs/local \
  .

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
REMOTE="${USER}@${HOST}"

echo "==> Uploading to ${REMOTE} (${REMOTE_DIR})"
scp "${SSH_OPTS[@]}" "$ARCHIVE" "${REMOTE}:/tmp/birdweather-bot-deploy.tgz"
scp "${SSH_OPTS[@]}" "$ENV_FILE" "${REMOTE}:${REMOTE_DIR}/.env"

DB_FILE="$ROOT/data/birdweather-bot.sqlite"
if [[ "$SYNC_DB" == "1" && -f "$DB_FILE" ]]; then
  echo "==> Uploading SQLite database"
  scp "${SSH_OPTS[@]}" "$DB_FILE" "${REMOTE}:${REMOTE_DIR}/data/birdweather-bot.sqlite"
fi

echo "==> Extracting and rebuilding on server"
ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
cd ${REMOTE_DIR}
tar -xzf /tmp/birdweather-bot-deploy.tgz
rm -f /tmp/birdweather-bot-deploy.tgz
if grep -q '^NODE_ENV=' .env; then sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env; else echo NODE_ENV=production >> .env; fi
docker compose up --build -d
docker compose ps"

echo "==> Done. Logs: ssh ${REMOTE} 'cd ${REMOTE_DIR} && docker compose logs -f bot'"
