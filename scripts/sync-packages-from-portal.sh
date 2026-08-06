#!/usr/bin/env bash
# Sync shared packages from portal → chat (interim until npm publish).
# Usage: from chat repo root: ./scripts/sync-packages-from-portal.sh [portal-path]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORTAL="${1:-$ROOT/../portal}"

if [[ ! -d "$PORTAL/packages" ]]; then
  echo "portal packages not found at: $PORTAL/packages" >&2
  exit 1
fi

PACKAGES=(
  kb-types
  kb-catalog
  agent-session-sdk
  ui-theme
  assistant-ui-theme
  chat-ui
)

mkdir -p "$ROOT/packages"

for pkg in "${PACKAGES[@]}"; do
  src="$PORTAL/packages/$pkg"
  dest="$ROOT/packages/$pkg"
  if [[ ! -d "$src" ]]; then
    echo "skip missing: $src"
    continue
  fi
  echo "sync $pkg ..."
  rm -rf "$dest"
  mkdir -p "$dest"
  # copy sources + package metadata; skip node_modules / dist
  rsync -a \
    --exclude node_modules \
    --exclude dist \
    --exclude .turbo \
    "$src/" "$dest/"
done

echo "done. Run: pnpm install && pnpm build"
