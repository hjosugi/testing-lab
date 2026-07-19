#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="$(mktemp)"
missing_socket="$(mktemp -d)/docker.sock"
trap 'rm -f "$output"; rm -rf "$(dirname "$missing_socket")"' EXIT

if DOCKER_HOST="unix://$missing_socket" \
  "$root/scripts/run-postgres-integration.sh" >"$output" 2>&1; then
  echo "expected unavailable Docker runtime to fail" >&2
  exit 1
fi

grep -F \
  "Docker-compatible CLI and daemon are required; refusing to skip" \
  "$output" >/dev/null
echo "Postgres runner reports an unavailable container runtime as a failure."
