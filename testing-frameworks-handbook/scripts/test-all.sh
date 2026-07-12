#!/usr/bin/env bash
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
failures=0
skips=0

run_test() {
  local name="$1"
  local command_name="$2"
  local directory="$3"
  shift 3
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "SKIP  $name: $command_name is unavailable"
    skips=$((skips + 1))
    return
  fi
  echo "RUN   $name"
  if (cd "$root/$directory" && "$@"); then
    echo "PASS  $name"
  else
    echo "FAIL  $name" >&2
    failures=$((failures + 1))
  fi
}

if command -v python3 >/dev/null 2>&1 && python3 -c 'import pytest' >/dev/null 2>&1; then
  run_test Python python3 labs/python python3 -m pytest -q
else
  echo "SKIP  Python: python3/pytest is unavailable"
  skips=$((skips + 1))
fi
run_test Node npm labs/node npm test
run_test System npm labs/system npm test
run_test Advanced npm labs/advanced npm test
run_test Java gradle labs/java gradle test
run_test NUnit dotnet labs/dotnet dotnet test tests/NUnitTests/NUnitTests.csproj
run_test MSTest dotnet labs/dotnet dotnet test tests/MSTestTests/MSTestTests.csproj
run_test C++ cmake . bash -c 'cmake -S labs/cpp -B labs/cpp/build -G Ninja && cmake --build labs/cpp/build && ctest --test-dir labs/cpp/build --output-on-failure'
run_test Go go labs/go go test ./...
run_test Rust cargo labs/rust cargo test
run_test PHP composer labs/php composer test

echo "summary: failures=$failures skips=$skips"
if (( failures > 0 )); then exit 1; fi
if [[ "${STRICT:-0}" == "1" && "$skips" -gt 0 ]]; then
  echo "STRICT=1 rejects skipped toolchains" >&2
  exit 1
fi
