#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
kind="${1:-}"

case "$kind" in
  address)
    diagnostic="heap-use-after-free"
    ;;
  undefined)
    diagnostic="signed integer overflow"
    ;;
  thread)
    diagnostic="data race"
    ;;
  *)
    echo "usage: $0 <address|undefined|thread>" >&2
    exit 2
    ;;
esac

build="$root/build/sanitizers/$kind"
log="$build/expected-${kind}-failure.log"

cmake --fresh \
  -S "$root" \
  -B "$build" \
  -G Ninja \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_BUILD_TYPE=Debug \
  -DHANDBOOK_SANITIZER="$kind"
cmake --build "$build" --target checkout_tests sanitizer_probe
ctest \
  --test-dir "$build" \
  --output-on-failure \
  --no-tests=error

set +e
case "$kind" in
  address)
    ASAN_OPTIONS="halt_on_error=1:detect_leaks=0" \
      "$build/sanitizer_probe" >"$log" 2>&1
    ;;
  undefined)
    UBSAN_OPTIONS="halt_on_error=1:print_stacktrace=1" \
      "$build/sanitizer_probe" >"$log" 2>&1
    ;;
  thread)
    TSAN_OPTIONS="halt_on_error=1" \
      "$build/sanitizer_probe" >"$log" 2>&1
    ;;
esac
status=$?
set -e

if (( status == 0 )); then
  echo "$kind sanitizer defect fixture unexpectedly passed" >&2
  exit 1
fi
if ! grep -Fiq "$diagnostic" "$log"; then
  echo "$kind sanitizer output is missing diagnostic: $diagnostic" >&2
  sed -n '1,220p' "$log" >&2
  exit 1
fi

echo "sanitizer lane passed: kind=$kind expected_probe_exit=$status log=$log"
