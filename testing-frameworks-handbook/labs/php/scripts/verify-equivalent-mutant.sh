#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="$root/build/infection/equivalent"
summary="$output/summary.json"
log="$output/infection.log"

rm -rf "$output"
mkdir -p "$output"
cd "$root"

if ! php -r 'exit(extension_loaded("pcov") ? 0 : 1);'; then
  echo "equivalent: PCOV is required; enter the pinned Nix PHP shell" >&2
  exit 1
fi

vendor/bin/infection \
  --threads=1 \
  --mutators=CastBool \
  --min-msi=0 \
  --min-covered-msi=0 \
  --no-progress \
  --log-verbosity=all \
  --logger-text="$log" \
  --logger-summary-json="$summary" \
  mutation-fixtures/BooleanIdentity.php

if [[ ! -s "$summary" || ! -s "$log" ]]; then
  echo "equivalent: Infection reports are missing" >&2
  exit 1
fi

total="$(jq -r '.stats.totalMutantsCount' "$summary")"
escaped="$(jq -r '.stats.escapedCount' "$summary")"
coverage="$(jq -r '.stats.mutationCodeCoverage' "$summary")"
log_contents="$(<"$log")"

if [[ "$total" -ne 1 || "$escaped" -ne 1 || "$coverage" != "100" ]]; then
  echo "equivalent: expected one covered escaped mutant" >&2
  jq . "$summary" >&2
  exit 1
fi
if [[ "$log_contents" != *"CastBool"* ]]; then
  echo "equivalent: expected CastBool in the mutation report" >&2
  exit 1
fi

echo "equivalent: E-001 is one covered escaped CastBool mutant, classified by proof"
