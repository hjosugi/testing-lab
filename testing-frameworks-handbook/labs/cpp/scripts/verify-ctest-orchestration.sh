#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build="${CPP_BUILD_DIR:-$root/build}"
artifacts="$build/ctest-orchestration"
seed="${CTEST_RANDOM_SEED:-20260719}"

if [[ ! -x "$build/checkout_tests" ]]; then
  cmake --fresh \
    -S "$root" \
    -B "$build" \
    -G Ninja \
    -DCMAKE_CXX_COMPILER=clang++
  cmake --build "$build" --target checkout_tests
fi

mapfile -t tests < <(
  ctest --test-dir "$build" -N |
    sed -n 's/^ *Test *#[0-9][0-9]*: //p'
)
if (( ${#tests[@]} < 3 )); then
  echo "expected at least 3 discovered CTest tests, found ${#tests[@]}" >&2
  exit 1
fi

install -d "$artifacts"
: >"$artifacts/shard-0.txt"
: >"$artifacts/shard-1.txt"
for index in "${!tests[@]}"; do
  printf '%s\n' "${tests[$index]}" >>"$artifacts/shard-$((index % 2)).txt"
done

for shard in 0 1; do
  ctest \
    --test-dir "$build" \
    --tests-from-file "$artifacts/shard-$shard.txt" \
    --output-on-failure \
    --no-tests=error \
    --output-junit "$artifacts/shard-$shard.xml"
done

run_random_order() {
  local output="$1"
  ctest \
    --test-dir "$build" \
    --schedule-random \
    --schedule-random-seed "$seed" \
    --verbose \
    --output-on-failure \
    --no-tests=error >"$output"
}

run_random_order "$artifacts/random-1.log"
run_random_order "$artifacts/random-2.log"
sed -n 's/^ *Start [0-9][0-9]*: //p' \
  "$artifacts/random-1.log" >"$artifacts/random-1.order"
sed -n 's/^ *Start [0-9][0-9]*: //p' \
  "$artifacts/random-2.log" >"$artifacts/random-2.order"

if ! cmp -s "$artifacts/random-1.order" "$artifacts/random-2.order"; then
  echo "CTest order changed for fixed seed $seed" >&2
  diff -u "$artifacts/random-1.order" "$artifacts/random-2.order" >&2 || true
  exit 1
fi
if [[ "$(wc -l <"$artifacts/random-1.order")" -ne "${#tests[@]}" ]]; then
  echo "random-order run did not execute the full test set" >&2
  exit 1
fi

echo "CTest orchestration passed: tests=${#tests[@]} shards=2 seed=$seed"
echo "fixed-seed order:"
sed 's/^/  /' "$artifacts/random-1.order"
