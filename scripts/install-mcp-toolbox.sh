#!/usr/bin/env bash
# Downloads Google MCP Toolbox for Databases (SQLite prebuilt) into .cursor/toolbox/
set -euo pipefail
VERSION="v1.2.0"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/.cursor/toolbox"
mkdir -p "$OUT_DIR"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;;
esac

BIN="$OUT_DIR/toolbox"
URL="https://storage.googleapis.com/mcp-toolbox-for-databases/${VERSION}/${OS}/${ARCH}/toolbox"
echo "Downloading MCP Toolbox ${VERSION} (${OS}/${ARCH}) ..."
curl -fsSL "$URL" -o "$BIN"
chmod +x "$BIN"
"$BIN" --version
echo "Installed: $BIN"
