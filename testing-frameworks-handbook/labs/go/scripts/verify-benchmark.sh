#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="$root/build"
output="$output_dir/benchmark.txt"
mkdir -p "$output_dir"

(
  cd "$root"
  go test \
    -mod=readonly \
    -run '^$' \
    -bench '^BenchmarkTotal100Items$' \
    -benchmem \
    -count=3 \
    .
) | tee "$output"

result_count="$(grep -c '^BenchmarkTotal100Items-' "$output")"
if [[ "$result_count" -ne 3 ]]; then
  echo "benchmark: expected 3 results, got $result_count" >&2
  exit 1
fi
if ! grep -Eq '[0-9]+[[:space:]]+B/op[[:space:]]+[0-9]+[[:space:]]+allocs/op' "$output"; then
  echo "benchmark: allocation metrics are missing" >&2
  exit 1
fi

echo "benchmark: 3 runs reported ns/op, B/op, and allocs/op"
