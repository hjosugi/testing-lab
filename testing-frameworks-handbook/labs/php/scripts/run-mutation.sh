#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="$root/build/infection/high-risk"
summary="$output/summary.json"

rm -rf "$output"
mkdir -p "$output"
cd "$root"

if ! php -r 'exit(extension_loaded("pcov") ? 0 : 1);'; then
  echo "mutation: PCOV is required; enter the pinned Nix PHP shell" >&2
  exit 1
fi

vendor/bin/infection \
  --threads=2 \
  --min-msi=100 \
  --min-covered-msi=100 \
  --no-progress \
  --log-verbosity=all \
  --logger-text="$output/infection.log" \
  --logger-summary-json="$summary" \
  src/Checkout.php

if [[ ! -s "$summary" ]]; then
  echo "mutation: summary.json is missing" >&2
  exit 1
fi

total="$(jq -r '.stats.totalMutantsCount' "$summary")"
killed="$(jq -r '.stats.killedCount' "$summary")"
escaped="$(jq -r '.stats.escapedCount' "$summary")"
uncovered="$(jq -r '.stats.notCoveredCount' "$summary")"
msi="$(jq -r '.stats.msi' "$summary")"
covered_msi="$(jq -r '.stats.coveredCodeMsi' "$summary")"

if [[ "$total" -ne 14 || "$killed" -ne 14 || "$escaped" -ne 0 || "$uncovered" -ne 0 ]]; then
  echo "mutation: expected 14/14 killed with no escaped or uncovered mutants" >&2
  jq . "$summary" >&2
  exit 1
fi
if [[ "$msi" != "100" || "$covered_msi" != "100" ]]; then
  echo "mutation: expected MSI=100 and covered MSI=100, got $msi/$covered_msi" >&2
  exit 1
fi

echo "mutation: killed=$killed/$total MSI=${msi}% covered-MSI=${covered_msi}%"
