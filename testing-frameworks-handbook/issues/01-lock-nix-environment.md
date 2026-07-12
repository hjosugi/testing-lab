# build: Nix flakeと全ecosystem lockfileを固定・検証する
<!-- labels: build,nix,reproducibility,priority-high -->

## Depends on

- #00

## Tasks

- [ ] `nix flake lock`を実行し差分をreview
- [ ] `nix flake check`相当のCI jobを作成
- [ ] npm/Cargo/Composer/Gradle/.NET dependencyをlock
- [ ] x86_64-linuxとaarch64-darwinで`STRICT=1 ./scripts/test-all.sh`
- [ ] Playwright browserとnpm packageのversion一致を固定

## Acceptance criteria

- [ ] clean machineで1 command bootstrap可能
- [ ] toolchain/version/lock更新手順がdocument化される
- [ ] Windows固有testの別runner方針がある

