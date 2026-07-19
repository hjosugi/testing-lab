#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "ERROR: $*" >&2
  exit 2
}

if ! command -v docker >/dev/null 2>&1 \
  || ! docker info >/dev/null 2>&1; then
  fail "Docker-compatible CLI and daemon are required; refusing to skip Postgres integration."
fi

# shellcheck disable=SC1091
source "$root/container-images.env"
export POSTGRES_IMAGE RYUK_CONTAINER_IMAGE
export RYUK_RECONNECTION_TIMEOUT=1s

case "${TESTCONTAINERS_RYUK_DISABLED:-false}" in
  1|true|TRUE|yes|YES)
    fail "Ryuk cleanup must remain enabled for Postgres integration."
    ;;
esac

digest_pattern='@sha256:[0-9a-f]{64}$'
[[ "$POSTGRES_IMAGE" =~ $digest_pattern ]] \
  || fail "POSTGRES_IMAGE must use an immutable sha256 digest."
[[ "$RYUK_CONTAINER_IMAGE" =~ $digest_pattern ]] \
  || fail "RYUK_CONTAINER_IMAGE must use an immutable sha256 digest."

docker pull "$POSTGRES_IMAGE"
docker pull "$RYUK_CONTAINER_IMAGE"

run_id="testing-lab-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-0}-$$"
session_file="$(mktemp)"
volume_file="$(mktemp)"
trap 'rm -f "$session_file" "$volume_file"' EXIT

export TESTING_LAB_CONTAINER_RUN_ID="$run_id"
export TESTCONTAINERS_SESSION_FILE="$session_file"
export TESTCONTAINERS_VOLUME_FILE="$volume_file"
export PYTHONPATH="$root/src${PYTHONPATH:+:$PYTHONPATH}"

cd "$root"
set +e
python -m pytest -q \
  postgres_tests/repository_postgres_contract.py \
  postgres_tests/postgres_engine_semantics.py
pytest_status=$?
set -e

session_id="$(tr -d '\n' < "$session_file")"
leaked_containers=""
leaked_ryuk=""
refresh_leaks() {
  leaked_containers="$(
    docker ps -aq --filter "label=testing-lab.run-id=$run_id"
  )"
  leaked_ryuk=""
  if [[ -n "$session_id" ]]; then
    leaked_ryuk="$(
      docker ps -aq --filter "name=testcontainers-ryuk-$session_id"
    )"
  fi
}

for ((attempt = 0; attempt < 120; attempt++)); do
  refresh_leaks
  if [[ -z "$leaked_containers" && -z "$leaked_ryuk" ]]; then
    break
  fi
  sleep 0.5
done

refresh_leaks
if [[ -n "$leaked_containers" || -n "$leaked_ryuk" ]]; then
  docker ps -a --no-trunc --filter "label=testing-lab.run-id=$run_id" >&2
  if [[ -n "$leaked_ryuk" ]]; then
    docker ps -a --no-trunc --filter "id=$leaked_ryuk" >&2
  fi
  fail "Testcontainers cleanup left a container behind."
fi

while IFS= read -r volume_name; do
  if [[ -n "$volume_name" ]] \
    && docker volume inspect "$volume_name" >/dev/null 2>&1; then
    fail "Testcontainers cleanup left volume $volume_name behind."
  fi
done < "$volume_file"

if (( pytest_status != 0 )); then
  exit "$pytest_status"
fi

echo "Postgres integration passed with no leaked containers or volumes."
