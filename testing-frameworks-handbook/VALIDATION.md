# Validation report

検証日: 2026-07-19

## Reproducibility gate

ローカルの`x86_64-linux`環境で、commit対象のlockとNix shellだけを使って次を実行しました。

| Target | Result | Detail |
|---|---|---|
| Flake evaluation | PASS | `x86_64-linux`、`aarch64-linux`、`aarch64-darwin`の全dev shellを`--all-systems --no-build`で評価 |
| Clean bootstrap | PASS | npm、Gradle、NuGet、Cargo、Composerをcommit済みlockから復元 |
| Lock coverage | PASS | Nix、npm 3 project、Gradle、NuGet 3 project、Cargo、Composer、Catch2 commit pin |
| Playwright lock | PASS | Playwright 1.61.1とChromium revision 1228および実行binaryを照合 |
| Workflow lint | PASS | `.github/workflows/reproducibility.yml`を`actionlint`で検証 |
| Hybrid policy links | PASS | ADR/index/template/entrypointを`lychee --offline`で検証、error 0 |
| NotebookLM build | PASS | 6 bundleを再生成 |

実行command:

```bash
nix flake check --all-systems --no-build
nix develop --command env STRICT=1 ./scripts/bootstrap.sh
nix develop --command ./scripts/check-lockfiles.sh
nix develop --command env STRICT=1 ./scripts/test-all.sh
```

## STRICT test result

`STRICT=1 ./scripts/test-all.sh`は`failures=0 skips=0`で完了しました。

| Target | Result | Detail |
|---|---|---|
| pytest | PASS | 18 tests |
| Node built-in / Mocha / AVA | PASS | 3 + 1 + 1 tests |
| HTTP adapter / contract / property | PASS | 3 tests |
| Playwright E2E / accessibility | PASS | 2 browser tests |
| Advanced techniques | PASS | 11 tests |
| JUnit / Mockito / Truth | PASS | Gradle locked build |
| NUnit 4 | PASS | 4 tests、Microsoft.Testing.Platform |
| MSTest 4 | PASS | 4 tests、Microsoft.Testing.Platform |
| Catch2 / CTest | PASS | 2 tests、Nix clang++ |
| Go | PASS | `-mod=readonly` |
| Rust / rstest | PASS | 3 tests、`--locked` |
| PHPUnit | PASS | 3 tests、9 assertions |

## CI runtime matrix

ローカル検証に加え、PRと`main`では次のruntime gateを必須にします。

- `ubuntu-24.04`: `x86_64-linux`のstrict bootstrapと全test
- `macos-14`: `aarch64-darwin`のstrict bootstrapと全test
- `windows-2025`: locked NuGet restore後のNUnit/MSTest

Linux/macOS jobは最後に`git status --porcelain`が空であることも検証し、bootstrapやtestがlockfileまたは生成物を変更した場合は失敗します。

## Known limitations

- Docker、real Postgres、real device、cloud、load、chaosはこのgateで自動実行しません。各Issueでenvironment、safety、acceptance criteriaを定義します。
- browser、managed cloud、mobile deviceはlocal emulatorだけでproduction equivalenceを保証しません。
- performance labの時間はcharacterization情報です。正式な性能gateはcontrolled environment、warm-up、複数sample、SLOを使います。
