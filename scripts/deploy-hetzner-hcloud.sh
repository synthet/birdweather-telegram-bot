#!/usr/bin/env bash
# Deploy to Hetzner: resolve host via hcloud, then run deploy-hetzner.sh.
#
# Same env as deploy-hetzner.sh, plus:
#   HETZNER_SERVER_NAME, HCLOUD_BIN, HCLOUD_CONTEXT, HCLOUD_TOKEN
# If HETZNER_SERVER_HOST is already set, hcloud is not called.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export HETZNER_SERVER_HOST="$("$ROOT/scripts/resolve-hetzner-host.sh")"
exec bash "$ROOT/scripts/deploy-hetzner.sh" "$@"
