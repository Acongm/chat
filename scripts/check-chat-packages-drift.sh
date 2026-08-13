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

fail=0

if [[ ! -d "$PORTAL_PACKAGES" ]]; then
  echo "portal packages dir not found: $PORTAL_PACKAGES"
  exit 1
fi

for pkg in "${PACKAGES[@]}"; do
  src="$ROOT/packages/$pkg"
  dest="$PORTAL_PACKAGES/$pkg"
  if [[ ! -d "$src" || ! -d "$dest" ]]; then
    echo "skip missing: $pkg"
    continue
  fi
  echo "Checking drift: chat/$pkg -> portal/$pkg"
  while IFS= read -r file; do
    rel="${file#"$src"/}"
    target="$dest/$rel"
    if [[ ! -f "$target" ]]; then
      echo "  missing in portal: $rel"
      fail=1
      continue
    fi
    if ! diff -q "$file" "$target" >/dev/null; then
      echo "  drift: $rel"
      fail=1
    fi
  done < <(find "$src" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' -o -name '*.css' \) ! -path '*/node_modules/*' | sort)
done

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "Chat package drift detected. Run ./scripts/sync-chat-packages-to-portal.sh"
  exit 1
fi

echo "Portal chat packages match chat canonical source."
