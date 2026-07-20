#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_parent="$root/build/mutation"
outcomes="$output_parent/mutants.out/outcomes.json"
cache_home="${XDG_CACHE_HOME:-$HOME/.cache}"
tmp_root="${CARGO_MUTANTS_TMPDIR:-$cache_home/testing-frameworks-handbook/cargo-mutants}"

mkdir -p "$root/build" "$tmp_root"
rm -rf "$output_parent"

(
  cd "$root"
  TMPDIR="$tmp_root" cargo mutants \
    --file src/lib.rs \
    --re '(checked_subtotal|replace total)' \
    --cargo-arg=--locked \
    --copy-target=true \
    --jobs 2 \
    --no-times \
    --colors never \
    --caught \
    --output "$output_parent"
)

if [[ ! -s "$outcomes" ]]; then
  echo "mutation: outcomes.json is missing" >&2
  exit 1
fi

tested="$(jq '[.outcomes[] | select(.scenario | type == "object") | select(.scenario.Mutant != null)] | length' "$outcomes")"
caught="$(jq '[.outcomes[] | select(.summary == "CaughtMutant")] | length' "$outcomes")"
if [[ "$tested" -ne 7 || "$caught" -ne 7 ]]; then
  echo "mutation: expected 7/7 caught, got $caught/$tested" >&2
  jq -r '.outcomes[] | select(.scenario.Mutant != null) | "\(.summary): \(.scenario.Mutant.name)"' "$outcomes" >&2
  exit 1
fi

echo "mutation: 7/7 total-path mutants caught"
