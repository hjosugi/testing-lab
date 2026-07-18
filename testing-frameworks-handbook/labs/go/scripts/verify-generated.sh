#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
generated="$root/mock_payment_gateway_test.go"
before="$(mktemp)"
trap 'rm -f "$before"' EXIT

cp "$generated" "$before"
(
  cd "$root"
  GOFLAGS=-mod=readonly go generate ./...
)

if ! cmp -s "$before" "$generated"; then
  echo "generated mock drifted; run 'go generate ./...'" >&2
  diff -u "$before" "$generated" || true
  exit 1
fi

echo "generated mock matches the pinned mockgen output"
