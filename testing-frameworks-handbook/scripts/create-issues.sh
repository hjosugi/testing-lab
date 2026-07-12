#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mode="${1:---dry-run}"
if [[ "$mode" != "--dry-run" && "$mode" != "--apply" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
if [[ "$mode" == "--apply" ]] && ! command -v gh >/dev/null 2>&1; then
  echo "gh is required for --apply" >&2
  exit 1
fi

while IFS= read -r file; do
  title="$(sed -n '1s/^# //p' "$file")"
  labels="$(sed -n '2s/^<!-- labels: \(.*\) -->$/\1/p' "$file")"
  if [[ -z "$title" ]]; then
    echo "invalid issue file: $file" >&2
    exit 1
  fi
  if [[ "$mode" == "--dry-run" ]]; then
    echo "TITLE: $title"
    echo "LABELS: ${labels:-none}"
    echo "BODY: ${file#"$root/"}"
  else
    args=(issue create --title "$title" --body-file "$file")
    if [[ -n "$labels" ]]; then args+=(--label "$labels"); fi
    gh "${args[@]}"
  fi
done < <(find "$root/issues" -maxdepth 1 -type f -name '[0-9][0-9]-*.md' | sort)

