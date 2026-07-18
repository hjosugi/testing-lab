#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="$root/build/intentional-failures"
mkdir -p "$output_dir"
cd "$root"

run_expected_failure() {
  local name="$1"
  local diagnostic="$2"
  shift 2
  local output="$output_dir/$name.log"
  local status

  set +e
  "$@" >"$output" 2>&1
  status=$?
  set -e

  if [[ "$status" -eq 0 ]]; then
    echo "$name: fixture unexpectedly passed" >&2
    cat "$output" >&2
    return 1
  fi
  if ! grep -Fq "$diagnostic" "$output"; then
    echo "$name: expected diagnostic '$diagnostic' was missing" >&2
    cat "$output" >&2
    return 1
  fi

  echo "$name: reproduced expected failure (exit=$status, diagnostic=$diagnostic)"
}

run_expected_failure \
  race \
  'WARNING: DATA RACE' \
  go test -mod=readonly -race -tags=intentional -count=1 -run '^TestDataRace$' ./intentional

run_expected_failure \
  goroutine-leak \
  'found unexpected goroutines' \
  go test -mod=readonly -tags=intentional -count=1 -run '^TestGoroutineLeak$' ./intentional

run_expected_failure \
  order-dependence \
  'order dependence detected' \
  go test -mod=readonly -tags=intentional -count=1 -run '^TestOrderDependent' -shuffle=1 ./intentional

echo "intentional failures: race, goroutine leak, and order dependence reproduced"
