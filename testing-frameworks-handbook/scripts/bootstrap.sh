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
    if [[ "${STRICT:-0}" == "1" ]]; then
      failures=$((failures + 1))
    fi
  fi
}

run_if npm labs/node npm ci
run_if npm labs/advanced npm ci
run_if npm labs/system npm ci
run_if uv labs/system/api-tests uv sync --frozen
run_if npm labs/system npm exec -- playwright install chromium
run_if npm labs/system npm run verify:browser-lock
run_if gradle labs/java gradle dependencies --no-daemon
run_if dotnet labs/dotnet dotnet restore tests/NUnitTests/NUnitTests.csproj --locked-mode
run_if dotnet labs/dotnet dotnet restore tests/MSTestTests/MSTestTests.csproj --locked-mode
run_if dotnet labs/dotnet dotnet restore tests/NUnitVSTestTests/NUnitVSTestTests.csproj --locked-mode
run_if dotnet labs/dotnet dotnet restore tests/MSTestVSTestTests/MSTestVSTestTests.csproj --locked-mode
run_if go labs/go go mod download
run_if cargo labs/rust cargo fetch --locked
run_if composer labs/php composer install --no-interaction --no-progress

if (( failures > 0 )); then
  echo "bootstrap completed with $failures failure(s)" >&2
  exit 1
fi
echo "bootstrap completed"
