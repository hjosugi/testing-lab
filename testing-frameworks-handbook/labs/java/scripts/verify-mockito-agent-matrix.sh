#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
lab_root="$(cd "$script_dir/.." && pwd)"
handbook_root="$(cd "$lab_root/../.." && pwd)"

jdk_homes=("$@")
if ((${#jdk_homes[@]} == 0)); then
  if ! command -v nix >/dev/null 2>&1; then
    echo "nix is required when JDK homes are not supplied" >&2
    exit 1
  fi
  mapfile -t jdk_homes < <(
    nix build --no-link --print-out-paths --inputs-from "$handbook_root" \
      nixpkgs#jdk21 nixpkgs#jdk25
  )
fi

if ! command -v gradle >/dev/null 2>&1; then
  echo "gradle is required" >&2
  exit 1
fi

temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT
rows=()

for jdk_home in "${jdk_homes[@]}"; do
  java="$jdk_home/bin/java"
  if [[ ! -x "$java" ]]; then
    echo "JDK home does not contain bin/java: $jdk_home" >&2
    exit 1
  fi
  version="$("$java" -version 2>&1 | sed -n '1s/.*version "\([^"]*\)".*/\1/p')"
  explicit_log="$temporary/jdk-$version-explicit.log"
  baseline_log="$temporary/jdk-$version-baseline.log"

  (
    cd "$lab_root"
    gradle test \
      --tests handbook.checkout.MockitoAgentTest \
      -PtestJavaHome="$jdk_home" \
      --rerun-tasks --info --no-daemon
  ) >"$explicit_log" 2>&1

  if ! grep -Eq -- '-javaagent:.*mockito-core-5[.]23[.]0[.]jar' "$explicit_log"; then
    echo "JDK $version did not launch tests with the Mockito agent" >&2
    exit 1
  fi
  if grep -q 'Mockito is currently self-attaching' "$explicit_log"; then
    echo "JDK $version unexpectedly used Mockito self-attachment" >&2
    exit 1
  fi

  set +e
  (
    cd "$lab_root"
    gradle test \
      --tests handbook.checkout.MockitoAgentTest \
      -PtestJavaHome="$jdk_home" \
      -PmockitoAgent=off \
      --rerun-tasks --info --no-daemon
  ) >"$baseline_log" 2>&1
  baseline_status=$?
  set -e

  if grep -q 'Mockito is currently self-attaching' "$baseline_log"; then
    baseline="exit $baseline_status, self-attach warning"
  else
    baseline="exit $baseline_status, no self-attach warning"
  fi
  rows+=("| $version | PASS, explicit agent | $baseline |")
done

echo "| Test runtime | Explicit Mockito agent | Agent disabled baseline |"
echo "|---|---|---|"
printf '%s\n' "${rows[@]}"
