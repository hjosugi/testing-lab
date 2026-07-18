#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build="$root/build/compile-time"
runs="${COMPILE_TIME_RUNS:-3}"

if [[ ! "$runs" =~ ^[1-9][0-9]*$ ]]; then
  echo "COMPILE_TIME_RUNS must be a positive integer" >&2
  exit 2
fi

cmake --fresh \
  -S "$root" \
  -B "$build" \
  -G Ninja \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_BUILD_TYPE=Release

measure_target() {
  local target="$1"
  local output_file="$2"
  local samples=()
  local run output elapsed

  for ((run = 1; run <= runs; ++run)); do
    output="$(
      cmake -E time \
        cmake --build "$build" --target "$target" --clean-first 2>&1
    )"
    elapsed="$(
      printf '%s\n' "$output" |
        sed -n 's/^Elapsed time (seconds): //p' |
        tail -1
    )"
    if [[ -z "$elapsed" ]]; then
      echo "could not parse compile time for $target" >&2
      printf '%s\n' "$output" >&2
      exit 1
    fi
    "$build/$target"
    samples+=("$elapsed")
  done

  printf '%s\n' "${samples[@]}" | sort -n >"$output_file"
  sed -n "$(((runs + 1) / 2))p" "$output_file"
}

handwritten="$(
  measure_target handwritten_spy_probe "$build/handwritten-seconds.txt"
)"
framework="$(
  measure_target mock_framework_probe "$build/mock-framework-seconds.txt"
)"
ratio="$(awk -v framework="$framework" -v handwritten="$handwritten" \
  'BEGIN { if (handwritten == 0) print "n/a"; else printf "%.2f", framework / handwritten }')"

{
  echo "# Clean compile-time comparison"
  echo
  echo "| Probe | Median seconds |"
  echo "|---|---:|"
  echo "| handwritten spy | $handwritten |"
  echo "| Trompeloeil mock | $framework |"
  echo
  echo "Observed ratio (mock / handwritten): $ratio"
  echo
  echo "Informational only: machine load and cold filesystem cache affect these values."
} >"$build/comparison.md"

cat "$build/comparison.md"
