#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
failures=0

require_lock() {
  local manifest="$1"
  local lock="$2"
  if [[ ! -s "$root/$lock" ]]; then
    echo "MISSING  $lock (required by $manifest)" >&2
    failures=$((failures + 1))
  else
    echo "LOCKED   $manifest -> $lock"
  fi
}

require_exact_npm_pin() {
  local manifest_path="$1"
  local package="$2"
  local version="$3"
  local manifest="$root/$manifest_path"
  if ! grep -Fq "\"$package\": \"$version\"" "$manifest"; then
    echo "MISSING  exact $package $version pin in $manifest_path" >&2
    failures=$((failures + 1))
  fi
}

require_lock flake.nix flake.lock
require_lock labs/go/go.mod labs/go/go.sum
require_lock labs/rust/Cargo.toml labs/rust/Cargo.lock
require_lock labs/php/composer.json labs/php/composer.lock
require_lock labs/java/build.gradle.kts labs/java/gradle.lockfile
require_lock labs/system/api-tests/pyproject.toml labs/system/api-tests/uv.lock

while IFS= read -r manifest; do
  directory="${manifest%/*}"
  require_lock "$manifest" "$directory/package-lock.json"
done < <(cd "$root" && find labs -mindepth 2 -maxdepth 2 -name package.json -print | LC_ALL=C sort)

while IFS= read -r manifest; do
  directory="${manifest%/*}"
  require_lock "$manifest" "$directory/packages.lock.json"
done < <(cd "$root" && find labs/dotnet -name '*.csproj' -print | LC_ALL=C sort)

if ! grep -Eq 'GIT_TAG 6ee0826dcae55ed1e06b2c5701981221e979e1e6' "$root/labs/cpp/CMakeLists.txt"; then
  echo "MISSING  immutable Catch2 v3.15.0 commit in labs/cpp/CMakeLists.txt" >&2
  failures=$((failures + 1))
fi
if ! grep -Eq 'GIT_TAG eaeb89c1ce9d354b0ba7eb921fd5712cdbd78adf' "$root/labs/cpp/CMakeLists.txt"; then
  echo "MISSING  immutable Trompeloeil v49 commit in labs/cpp/CMakeLists.txt" >&2
  failures=$((failures + 1))
fi
if ! grep -Eq '^tool go\.uber\.org/mock/mockgen$' "$root/labs/go/go.mod"; then
  echo "MISSING  pinned mockgen tool in labs/go/go.mod" >&2
  failures=$((failures + 1))
fi

container_config="$root/labs/python/container-images.env"
config_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$container_config"
}

postgres_version="$(config_value POSTGRES_VERSION)"
postgres_image="$(config_value POSTGRES_IMAGE)"
ryuk_version="$(config_value RYUK_VERSION)"
ryuk_image="$(config_value RYUK_CONTAINER_IMAGE)"
digest_pattern='[0-9a-f]{64}'

if [[ ! "$postgres_image" =~ ^postgres:${postgres_version}-bookworm@sha256:${digest_pattern}$ ]]; then
  echo "MISSING  immutable Postgres image digest matching POSTGRES_VERSION" >&2
  failures=$((failures + 1))
fi
if [[ ! "$ryuk_image" =~ ^testcontainers/ryuk:${ryuk_version}@sha256:${digest_pattern}$ ]]; then
  echo "MISSING  immutable Testcontainers Ryuk image digest matching RYUK_VERSION" >&2
  failures=$((failures + 1))
fi
if ! grep -Fq 'dependencies = ["psycopg==3.3.4"]' "$root/labs/python/pyproject.toml"; then
  echo "MISSING  exact Psycopg dependency pin in labs/python/pyproject.toml" >&2
  failures=$((failures + 1))
fi
if ! grep -Fq 'postgres-test = ["testcontainers==4.14.2"]' "$root/labs/python/pyproject.toml"; then
  echo "MISSING  exact Testcontainers dependency pin in labs/python/pyproject.toml" >&2
  failures=$((failures + 1))
fi
if ! grep -Fq '"schemathesis==4.23.0"' "$root/labs/system/api-tests/pyproject.toml"; then
  echo "MISSING  exact Schemathesis dependency pin in labs/system/api-tests/pyproject.toml" >&2
  failures=$((failures + 1))
fi
require_exact_npm_pin "labs/advanced/package.json" "fast-check" "4.9.0"
require_exact_npm_pin "labs/advanced/package.json" "@stryker-mutator/core" "10.0.0"
require_exact_npm_pin "labs/advanced/package.json" "@stryker-mutator/tap-runner" "10.0.0"
require_exact_npm_pin "labs/system/package.json" "@pact-foundation/pact" "17.0.1"
require_exact_npm_pin "labs/system/package.json" "@playwright/test" "1.61.1"
require_exact_npm_pin "labs/system/package.json" "@storybook/addon-a11y" "10.5.2"
require_exact_npm_pin "labs/system/package.json" "@storybook/addon-vitest" "10.6.3"
require_exact_npm_pin "labs/system/package.json" "@storybook/web-components-vite" "10.5.2"
require_exact_npm_pin "labs/system/package.json" "@vitest/browser-playwright" "4.1.12"
require_exact_npm_pin "labs/system/package.json" "storybook" "10.6.3"
require_exact_npm_pin "labs/system/package.json" "vite" "8.3.5"
require_exact_npm_pin "labs/system/package.json" "vitest" "4.1.12"
if grep -Fq '"@storybook/test-runner"' "$root/labs/system/package.json"; then
  echo "DEPRECATED  remove @storybook/test-runner from labs/system/package.json" >&2
  failures=$((failures + 1))
fi
if grep -Fq '"@axe-core/playwright"' "$root/labs/system/package.json"; then
  echo "DUPLICATE  keep automated accessibility in the Storybook component gate" >&2
  failures=$((failures + 1))
fi
if ! grep -Fq 'pkgs.uv' "$root/flake.nix"; then
  echo "MISSING  uv in flake.nix" >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  echo "lockfile check failed: $failures problem(s)" >&2
  exit 1
fi

echo "lockfile check passed"
