#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build="${CPP_BUILD_DIR:-$root/build}"
runs="${BENCHMARK_RUNS:-3}"
artifacts="$build/benchmark-noise"

if [[ ! "$runs" =~ ^[1-9][0-9]*$ ]]; then
  echo "BENCHMARK_RUNS must be a positive integer" >&2
  exit 2
fi
if [[ ! -x "$build/checkout_tests" ]]; then
  cmake --fresh \
    -S "$root" \
    -B "$build" \
    -G Ninja \
    -DCMAKE_CXX_COMPILER=clang++
  cmake --build "$build" --target checkout_tests
fi

install -d "$artifacts"
means=()
for ((run = 1; run <= runs; ++run)); do
  output="$artifacts/run-$run.txt"
  "$build/checkout_tests" \
    "[benchmark]" \
    --benchmark-samples 20 \
    --benchmark-resamples 1000 \
    --benchmark-warmup-time 10 \
    --rng-seed 20260719 >"$output"
  for marker in \
    "sum 100 CartItem subtotals" \
    "mean" \
    "std dev" \
    "All tests passed"; do
    if ! grep -Fq "$marker" "$output"; then
      echo "benchmark output is missing: $marker" >&2
      sed -n '1,220p' "$output" >&2
      exit 1
    fi
  done
  means+=("$(
    awk '/^sum 100 CartItem subtotals/ { getline; print $1 " " $2; exit }' \
      "$output"
  )")
done

echo "benchmark noise sample passed: runs=$runs samples=20 resamples=1000"
for index in "${!means[@]}"; do
  echo "  run $((index + 1)) mean: ${means[$index]}"
done
echo "raw reports: $artifacts"
