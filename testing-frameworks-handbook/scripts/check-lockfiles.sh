#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
failures=0

require_lock() {
  local manifest="$1"
  local lock="$2"
  if [[ ! -s "$root/$lock" ]]; then
    echo "MISSING  $lock (required by $manifest)" >&2
    failures=$((failures + 1))
  else
    echo "LOCKED   $manifest -> $lock"
  fi
}

require_lock flake.nix flake.lock
require_lock labs/rust/Cargo.toml labs/rust/Cargo.lock
require_lock labs/php/composer.json labs/php/composer.lock
require_lock labs/java/build.gradle.kts labs/java/gradle.lockfile

while IFS= read -r manifest; do
  directory="${manifest%/*}"
  require_lock "$manifest" "$directory/package-lock.json"
done < <(cd "$root" && find labs -mindepth 2 -maxdepth 2 -name package.json -print | LC_ALL=C sort)

while IFS= read -r manifest; do
  directory="${manifest%/*}"
  require_lock "$manifest" "$directory/packages.lock.json"
done < <(cd "$root" && find labs/dotnet -name '*.csproj' -print | LC_ALL=C sort)

if ! grep -Eq 'GIT_TAG [0-9a-f]{40}' "$root/labs/cpp/CMakeLists.txt"; then
  echo "MISSING  immutable Catch2 commit in labs/cpp/CMakeLists.txt" >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  echo "lockfile check failed: $failures problem(s)" >&2
  exit 1
fi

echo "lockfile check passed"
