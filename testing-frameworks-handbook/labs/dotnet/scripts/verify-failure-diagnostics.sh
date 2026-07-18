#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="$root/build/failure-diagnostics"

restore_regular_builds() {
  (
    cd "$root"
    dotnet build tests/NUnitTests/NUnitTests.csproj \
      --no-restore -p:IntentionalFailures=false --nologo >/dev/null
    dotnet build tests/MSTestTests/MSTestTests.csproj \
      --no-restore -p:IntentionalFailures=false --nologo >/dev/null
  ) || true
}
trap restore_regular_builds EXIT

run_probe() {
  local framework="$1"
  local project="$2"
  local test_name="$3"
  local message="$4"
  local expected_total="$5"
  local output_file="$output_dir/${framework,,}.txt"
  local status

  set +e
  (
    cd "$root"
    dotnet test \
      --project "$project" \
      --no-restore \
      --no-progress \
      --no-ansi \
      -p:IntentionalFailures=true
  ) >"$output_file" 2>&1
  status=$?
  set -e

  if (( status == 0 )); then
    echo "$framework failure probe unexpectedly passed" >&2
    exit 1
  fi

  for expected in \
    "$test_name" \
    "$message" \
    "expected: 999" \
    "600" \
    "total: $expected_total" \
    "failed: 1"; do
    if ! grep -Fiq "$expected" "$output_file"; then
      echo "$framework failure output is missing: $expected" >&2
      sed -n '1,220p' "$output_file" >&2
      exit 1
    fi
  done

  echo "PASS  $framework intentional failure: exit=$status output=$output_file"
}

install -d "$output_dir"
run_probe \
  NUnit \
  tests/NUnitTests/NUnitTests.csproj \
  ConstraintFailureShowsExpectedAndActualValues \
  "constraint comparison probe" \
  7
run_probe \
  MSTest \
  tests/MSTestTests/MSTestTests.csproj \
  AssertionFailureShowsExpectedAndActualValues \
  "assertion comparison probe" \
  10

echo "failure diagnostic comparison passed"
