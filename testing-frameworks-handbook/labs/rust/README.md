# Rust: cargo test and rstest

```bash
cargo fetch --locked
cargo test --locked
cargo test --locked -- --test-threads=1
```

standard test runnerを中心にし、table/fixtureの重複だけ`rstest`で補います。CIでは`Cargo.lock`の更新を許可しません。
