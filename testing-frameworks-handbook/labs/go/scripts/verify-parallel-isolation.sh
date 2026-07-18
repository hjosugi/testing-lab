#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

go test \
  -mod=readonly \
  -race \
  -shuffle=20260719 \
  -count=20 \
  -parallel=3 \
  -run '^TestCheckoutParallelResourceIsolation$' \
  .

echo "parallel isolation: 3 subtests x 20 repetitions passed under -race"
