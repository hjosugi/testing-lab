#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "fuzz: replay committed overflow regression"
go test -mod=readonly -v -run '^FuzzTotal/overflow-regression$' .

echo "fuzz: run a bounded single-worker campaign"
go test \
  -mod=readonly \
  -run '^$' \
  -fuzz '^FuzzTotal$' \
  -fuzztime=100x \
  -parallel=1 \
  .
