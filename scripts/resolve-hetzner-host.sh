#!/usr/bin/env bash
# Print production server IPv4 via hcloud (or echo HETZNER_SERVER_HOST if already set).
#
# Env:
#   HETZNER_SERVER_HOST  — if set, print and exit (skip hcloud)
#   HETZNER_SERVER_NAME  — hcloud server name (default: birdweather-bot)
#   HCLOUD_BIN           — hcloud binary (default: hcloud on PATH, else .tools/hcloud/hcloud)
#   HCLOUD_CONTEXT       — optional; switch active context before lookup
#   HCLOUD_TOKEN         — optional; hcloud reads this when no context is active

set -euo pipefail

if [[ -n "${HETZNER_SERVER_HOST:-}" ]]; then
  echo "$HETZNER_SERVER_HOST"
  exit 0
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${HETZNER_SERVER_NAME:-birdweather-bot}"
HCLOUD="${HCLOUD_BIN:-}"

if [[ -z "$HCLOUD" ]]; then
  if command -v hcloud >/dev/null 2>&1; then
    HCLOUD=hcloud
  elif [[ -x "$ROOT/.tools/hcloud/hcloud" ]]; then
    HCLOUD="$ROOT/.tools/hcloud/hcloud"
  elif [[ -x "$ROOT/.tools/hcloud/hcloud.exe" ]]; then
    HCLOUD="$ROOT/.tools/hcloud/hcloud.exe"
  else
    echo "hcloud not found. Install CLI, set HCLOUD_BIN, or export HETZNER_SERVER_HOST." >&2
    exit 1
  fi
fi

if [[ -n "${HCLOUD_CONTEXT:-}" ]]; then
  "$HCLOUD" context use "$HCLOUD_CONTEXT" >/dev/null
fi

if ! "$HCLOUD" server describe "$NAME" >/dev/null 2>&1; then
  echo "Hetzner server not found: $NAME (check HCLOUD_TOKEN, hcloud context, or HETZNER_SERVER_NAME)." >&2
  exit 1
fi

IP="$("$HCLOUD" server ip "$NAME" | tr -d '\r\n' | head -n1)"
if [[ -z "$IP" ]]; then
  echo "No IPv4 for server $NAME." >&2
  exit 1
fi

echo "$IP"
