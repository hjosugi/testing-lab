#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "boundary: private in-crate unit tests"
cargo test --locked --lib

echo "boundary: public API integration tests"
cargo test --locked --test checkout

echo "boundary: public API property tests"
cargo test --locked --test properties

echo "boundary: concrete Send/Sync trait-double tests"
cargo test --locked --test trait_bounds

echo "boundary: public examples and compile-fail ownership contract"
cargo test --locked --doc

echo "boundaries: unit, integration, property, trait, and doctest suites passed"
