#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

replay_regression() {
  local target="$1"
  local counterexample="$2"
  echo "fuzz: replay $target/$counterexample"
  go test -mod=readonly -v -run "^${target}/${counterexample}$" .
}

run_campaign() {
  local target="$1"
  echo "fuzz: run bounded coverage-guided campaign for $target"
  go test \
    -mod=readonly \
    -run '^$' \
    -fuzz "^${target}$" \
    -fuzztime=100x \
    -parallel=1 \
    .
}

replay_regression FuzzTotal overflow-regression
replay_regression FuzzParseItemLine multi-digit-quantity
run_campaign FuzzTotal
run_campaign FuzzParseItemLine
