#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
reports="${RUNNER_MATRIX_REPORT_DIR:-$root/build/runner-matrix}"

mtp_nunit="$root/tests/NUnitTests/NUnitTests.csproj"
mtp_mstest="$root/tests/MSTestTests/MSTestTests.csproj"
vstest_nunit="$root/tests/NUnitVSTestTests/NUnitVSTestTests.csproj"
vstest_mstest="$root/tests/MSTestVSTestTests/MSTestVSTestTests.csproj"

verify_report() {
  local report="$1"
  local expected="$2"
  if [[ ! -s "$report" ]]; then
    echo "missing TRX report: $report" >&2
    exit 1
  fi
  if ! grep -Fq \
    "<Counters total=\"$expected\" executed=\"$expected\" passed=\"$expected\" failed=\"0\"" \
    "$report"; then
    echo "unexpected TRX counters: $report" >&2
    grep -o '<Counters[^>]*' "$report" >&2 || true
    exit 1
  fi
}

for project in "$mtp_nunit" "$mtp_mstest" "$vstest_nunit" "$vstest_mstest"; do
  dotnet restore "$project" --locked-mode
done

install -d \
  "$reports/mtp/nunit" \
  "$reports/mtp/mstest" \
  "$reports/vstest/nunit" \
  "$reports/vstest/mstest"
rm -f \
  "$reports/mtp/nunit/nunit-mtp.trx" \
  "$reports/mtp/mstest/mstest-mtp.trx" \
  "$reports/vstest/nunit/nunit-vstest.trx" \
  "$reports/vstest/mstest/mstest-vstest.trx"

(
  cd "$root"
  dotnet test \
    --project tests/NUnitTests/NUnitTests.csproj \
    --no-restore \
    --minimum-expected-tests 8 \
    --no-progress \
    --report-trx \
    --report-trx-filename nunit-mtp.trx \
    --results-directory "$reports/mtp/nunit"
  dotnet test \
    --project tests/MSTestTests/MSTestTests.csproj \
    --no-restore \
    --minimum-expected-tests 9 \
    --no-progress \
    --report-trx \
    --report-trx-filename mstest-mtp.trx \
    --results-directory "$reports/mtp/mstest"
)

(
  cd "$root/vstest"
  dotnet test \
    ../tests/NUnitVSTestTests/NUnitVSTestTests.csproj \
    --no-restore \
    --logger "trx;LogFileName=nunit-vstest.trx" \
    --results-directory "$reports/vstest/nunit"
  dotnet test \
    ../tests/MSTestVSTestTests/MSTestVSTestTests.csproj \
    --no-restore \
    --logger "trx;LogFileName=mstest-vstest.trx" \
    --results-directory "$reports/vstest/mstest"
)

verify_report "$reports/mtp/nunit/nunit-mtp.trx" 8
verify_report "$reports/mtp/mstest/mstest-mtp.trx" 9
verify_report "$reports/vstest/nunit/nunit-vstest.trx" 8
verify_report "$reports/vstest/mstest/mstest-vstest.trx" 9

printf '%s\n' \
  "runner matrix passed:" \
  "  NUnit  4.6.0 / MTP    2.1.0 / 6 tests" \
  "  MSTest 4.3.0 / MTP    2.3.1 / 9 tests" \
  "  NUnit  4.6.0 / VSTest 18.7.0 / 6 tests" \
  "  MSTest 4.3.0 / VSTest 18.7.0 / 9 tests" \
  "  reports: $reports"
