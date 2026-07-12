#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
failures=0

run_if() {
  local command_name="$1"
  local directory="$2"
  shift 2
  if command -v "$command_name" >/dev/null 2>&1; then
    echo "bootstrap: $directory"
    (cd "$root/$directory" && "$@") || failures=$((failures + 1))
  else
    echo "skip: $directory ($command_name is unavailable)"
  fi
}

run_if npm labs/node npm install
run_if npm labs/system npm install
run_if gradle labs/java gradle dependencies
run_if dotnet labs/dotnet dotnet restore tests/NUnitTests/NUnitTests.csproj
run_if dotnet labs/dotnet dotnet restore tests/MSTestTests/MSTestTests.csproj
run_if cargo labs/rust cargo fetch
run_if composer labs/php composer install

if (( failures > 0 )); then
  echo "bootstrap completed with $failures failure(s)" >&2
  exit 1
fi
echo "bootstrap completed"

