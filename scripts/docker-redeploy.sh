#!/usr/bin/env bash
# Rebuild and restart the bot container. Binds ./data into the container — never deleted here.
# On Windows PowerShell, use: .\scripts\docker-redeploy.ps1
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DATA_DIR="$ROOT/data"
BACKUP_DIR="$DATA_DIR/backups"
DB_FILE="$DATA_DIR/birdweather-bot.sqlite"
KEEP_BACKUPS="${KEEP_BACKUPS:-10}"

mkdir -p "$DATA_DIR" "$BACKUP_DIR"

backup_database() {
  if [[ ! -f "$DB_FILE" ]]; then
    echo "No database at $DB_FILE — nothing to back up."
    return 0
  fi

  local stamp backup_base
  stamp="$(date +%Y%m%d-%H%M%S)"
  backup_base="$BACKUP_DIR/birdweather-bot-$stamp"

  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_FILE" ".backup '${backup_base}.sqlite'"
  else
    cp -a "$DB_FILE" "${backup_base}.sqlite"
    for suffix in -wal -shm; do
      if [[ -f "${DB_FILE}${suffix}" ]]; then
        cp -a "${DB_FILE}${suffix}" "${backup_base}.sqlite${suffix}"
      fi
    done
  fi

  echo "Backup: ${backup_base}.sqlite"

  if [[ "$KEEP_BACKUPS" =~ ^[0-9]+$ ]] && (( KEEP_BACKUPS > 0 )); then
    mapfile -t old_backups < <(ls -1t "$BACKUP_DIR"/birdweather-bot-*.sqlite 2>/dev/null || true)
    local i
    for (( i = KEEP_BACKUPS; i < ${#old_backups[@]}; i++ )); do
      rm -f "${old_backups[$i]}" "${old_backups[$i]}-wal" "${old_backups[$i]}-shm"
    done
  fi
}

echo "==> Stopping bot (./data is kept on the host)"
docker compose stop bot 2>/dev/null || true

echo "==> Backing up SQLite"
backup_database

echo "==> Rebuilding image"
docker compose build

echo "==> Starting bot"
# No -v: bind-mounted ./data must never be removed by compose.
docker compose up -d --force-recreate

echo "==> Done"
docker compose ps
echo "Logs: docker compose logs -f bot"
