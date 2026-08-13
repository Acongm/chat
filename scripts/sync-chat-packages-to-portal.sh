#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTAL_PACKAGES="${CHAT_PORTAL_PACKAGES:-$ROOT/../portal/packages}"

PACKAGES=(
  agent-session-sdk
  chat-ui
  kb-types
  kb-catalog
  ui-theme
  assistant-ui-theme
)

if [[ ! -d "$PORTAL_PACKAGES" ]]; then
  echo "portal packages dir not found: $PORTAL_PACKAGES"
  exit 1
fi

echo "Syncing chat packages -> portal"
for pkg in "${PACKAGES[@]}"; do
  src="$ROOT/packages/$pkg"
  dest="$PORTAL_PACKAGES/$pkg"
  if [[ ! -d "$src" ]]; then
    echo "skip missing source: $src"
    continue
  fi
  mkdir -p "$dest"
  cp -a "$src/." "$dest/"
  echo "  synced $pkg"
done

echo "Done. Portal auth-client is owned by auth — run auth/scripts/sync-auth-client-to-consumers.sh separately."
