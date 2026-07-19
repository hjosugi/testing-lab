#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

php_version="$(php -r 'echo PHP_MAJOR_VERSION, ".", PHP_MINOR_VERSION;')"
phpunit12_version="$(phpunit-12 --version)"
phpunit13_version="$(vendor/bin/phpunit --version)"

if [[ "$php_version" != "8.4" ]]; then
  echo "migration: expected PHP 8.4, got $php_version" >&2
  exit 1
fi
if [[ "$phpunit12_version" != PHPUnit\ 12.5.31* ]]; then
  echo "migration: expected PHPUnit 12.5.31, got $phpunit12_version" >&2
  exit 1
fi
if [[ "$phpunit13_version" != PHPUnit\ 13.2.4* ]]; then
  echo "migration: expected PHPUnit 13.2.4, got $phpunit13_version" >&2
  exit 1
fi

strict_args=(
  --configuration phpunit.xml
  --colors=never
  --display-all-issues
  --fail-on-all-issues
)

echo "migration baseline: $phpunit12_version"
phpunit-12 "${strict_args[@]}"

echo "migration target: $phpunit13_version"
vendor/bin/phpunit "${strict_args[@]}"

echo "migration: the same suite is issue-free on PHPUnit 12.5.31 and 13.2.4"
