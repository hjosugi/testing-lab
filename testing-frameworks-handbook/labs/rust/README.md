# Rust: cargo test and rstest

```bash
cargo test
cargo test -- --test-threads=1
```

standard test runnerを中心にし、table/fixtureの重複だけ`rstest`で補います。

