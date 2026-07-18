#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

cargo fmt --all --check
cargo clippy --locked --all-targets -- -D warnings

echo "quality: rustfmt and Clippy passed"
