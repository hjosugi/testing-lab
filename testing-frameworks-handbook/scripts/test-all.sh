#!/usr/bin/env bash
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
failures=0
skips=0

run_test() {
  local name="$1"
  local command_name="$2"
  local directory="$3"
  shift 3
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "SKIP  $name: $command_name is unavailable"
    skips=$((skips + 1))
    return
  fi
  echo "RUN   $name"
  if (cd "$root/$directory" && "$@"); then
    echo "PASS  $name"
  else
    echo "FAIL  $name" >&2
    failures=$((failures + 1))
  fi
}

if command -v python3 >/dev/null 2>&1 && python3 -c 'import hypothesis, psycopg, pytest, pytest_cov, testcontainers, xdist' >/dev/null 2>&1; then
  run_test Python python3 labs/python python3 -m pytest -q --cov=checkout --cov-branch --cov-fail-under=100
  run_test Python-parallel python3 labs/python python3 -m pytest -q -n 2
  run_test Python-mutation python3 labs/python python3 scripts/mutation_demo.py --require-all-killed
  run_test Python-Postgres-unavailable docker . ./labs/python/scripts/verify-postgres-unavailable.sh
else
  echo "SKIP  Python: Python test or Postgres integration dependencies are unavailable"
  skips=$((skips + 1))
fi
run_test Node npm labs/node npm test
run_test System npm labs/system npm test
run_test System-API uv labs/system npm run test:api-schema
run_test System-HTTP-stability npm labs/system npm run test:http-stability
run_test Playwright npm labs/system npm run test:e2e
run_test Advanced npm labs/advanced npm test
run_test Java gradle labs/java gradle test --no-daemon
run_test NUnit dotnet labs/dotnet dotnet test --project tests/NUnitTests/NUnitTests.csproj
run_test MSTest dotnet labs/dotnet dotnet test --project tests/MSTestTests/MSTestTests.csproj
run_test DotNet-runner-matrix dotnet labs/dotnet ./scripts/verify-runner-matrix.sh
run_test DotNet-failure-diagnostics dotnet labs/dotnet ./scripts/verify-failure-diagnostics.sh
run_test C++ cmake . bash -c 'cmake --fresh -S labs/cpp -B labs/cpp/build -G Ninja -DCMAKE_CXX_COMPILER=clang++ && cmake --build labs/cpp/build && ctest --test-dir labs/cpp/build --output-on-failure --no-tests=error'
run_test C++-CTest cmake labs/cpp ./scripts/verify-ctest-orchestration.sh
run_test C++-benchmark cmake labs/cpp ./scripts/measure-benchmark-noise.sh
run_test C++-compile-time cmake labs/cpp ./scripts/compare-compile-time.sh
run_test Go go labs/go go test -mod=readonly ./...
run_test Go-race go labs/go go test -mod=readonly -race ./...
run_test Go-parallel go labs/go ./scripts/verify-parallel-isolation.sh
run_test Go-fuzz go labs/go ./scripts/run-fuzz.sh
run_test Go-generated go labs/go ./scripts/verify-generated.sh
run_test Go-benchmark go labs/go ./scripts/verify-benchmark.sh
run_test Go-intentional-failures go labs/go ./scripts/verify-intentional-failures.sh
run_test Rust cargo labs/rust cargo test --locked
run_test Rust-boundaries cargo labs/rust ./scripts/verify-test-boundaries.sh
run_test Rust-quality cargo labs/rust ./scripts/verify-quality.sh
run_test Rust-mutation cargo-mutants labs/rust ./scripts/run-mutation.sh
run_test PHP composer labs/php composer test
run_test PHP-migration phpunit-12 labs/php ./scripts/verify-phpunit-migration.sh
run_test PHP-mutation composer labs/php ./scripts/run-mutation.sh
run_test PHP-equivalent composer labs/php ./scripts/verify-equivalent-mutant.sh

echo "summary: failures=$failures skips=$skips"
if (( failures > 0 )); then exit 1; fi
if [[ "${STRICT:-0}" == "1" && "$skips" -gt 0 ]]; then
  echo "STRICT=1 rejects skipped toolchains" >&2
  exit 1
fi
