#!/usr/bin/env bash
# Fail if staged or tracked files look like secrets, keys, or blocked private paths.
# CI: scans all tracked files. Pre-commit: scans git diff --cached when present.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAIL=0

warn() {
  echo "check-publish-safe: $*" >&2
  FAIL=1
}

is_content_excluded() {
  local f="$1"
  case "$f" in
    .env.example|.env.example.*) return 0 ;;
    src/tests/*|scripts/check-publish-safe.*) return 0 ;;
    docs/OPERATIONS.md|docs/SPEC.md|docs/ARCHITECTURE.md) return 0 ;;
  esac
  return 1
}

is_blocked_path() {
  local f="$1"
  case "$f" in
    .env.example|.env.example.*) return 1 ;;
    .env|.env.deploy|.env.local|.env.production|.env.staging) return 0 ;;
    .env.*) return 0 ;;
    data/*.sqlite|data/backups/*) return 0 ;;
    docs/local|docs/local/*) return 0 ;;
    *.pem|*.key|credentials.json|secrets.json) return 0 ;;
  esac
  return 1
}

looks_like_secret_content() {
  local f="$1"
  is_content_excluded "$f" && return 1

  if grep -qE '-----BEGIN (OPENSSH |RSA |EC )?PRIVATE KEY-----' "$f" 2>/dev/null; then
    warn "private key material in $f"
    return 0
  fi

  if grep -qE '(^|[^A-Za-z0-9_])(HCLOUD_TOKEN|HETZNER_SSH_PRIVATE_KEY|HETZNER_ENV)=[^[:space:]]+' "$f" 2>/dev/null; then
    warn "deployment credential env assignment in $f"
    return 0
  fi

  if grep -qE '[0-9]{8,10}:[A-Za-z0-9_-]{30,}' "$f" 2>/dev/null; then
    warn "possible Telegram bot token in $f"
    return 0
  fi

  if grep -qE 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.' "$f" 2>/dev/null; then
    warn "possible JWT/API token in $f"
    return 0
  fi

  return 1
}

check_path() {
  local f="$1"
  [[ -n "$f" && -f "$f" ]] || return 0

  if is_blocked_path "$f"; then
    warn "blocked path must not be committed: $f"
    return 0
  fi

  looks_like_secret_content "$f" || true
}

collect_files() {
  if [[ "${CHECK_ALL:-1}" == "1" ]]; then
    git ls-files -z | tr '\0' '\n'
    return
  fi

  local staged
  staged="$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)"
  if [[ -n "$staged" ]]; then
    printf '%s\n' "$staged"
  else
    git ls-files -z | tr '\0' '\n'
  fi
}

while IFS= read -r f; do
  check_path "$f"
done < <(collect_files)

if [[ "$FAIL" -ne 0 ]]; then
  echo "check-publish-safe: remove secrets, keys, and operator-only paths before committing." >&2
  exit 1
fi

echo "check-publish-safe: OK"
