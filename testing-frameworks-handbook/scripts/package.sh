#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
parent="$(dirname "$root")"
name="$(basename "$root")"
output="${1:-$parent/${name}-$(date +%F).zip}"
case "$output" in /*) ;; *) output="$(pwd)/$output" ;; esac

tmpdir="$(mktemp -d)"
list="$tmpdir/files.txt"
archive="$tmpdir/archive.zip"
trap 'rm -rf "$tmpdir"' EXIT

cd "$parent"
find "$name" -type f \
  ! -path '*/node_modules/*' \
  ! -path '*/playwright-report/*' \
  ! -path '*/test-results/*' \
  ! -path '*/storybook-static/*' \
  ! -path '*/.pact-artifacts/*' \
  ! -path '*/build/*' \
  ! -path '*/target/*' \
  ! -path '*/.gradle/*' \
  ! -path '*/vendor/*' \
  ! -name '*.pyc' \
  | LC_ALL=C sort > "$list"

zip -X -q "$archive" -@ < "$list"
mkdir -p "$(dirname "$output")"
mv "$archive" "$output"
sha256sum "$output"
echo "files=$(wc -l < "$list")"
echo "archive=$output"
