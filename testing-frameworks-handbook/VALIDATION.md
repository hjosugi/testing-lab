# Validation report

検証日: 2026-07-19

## Reproducibility gate

ローカルの`x86_64-linux`環境で、commit対象のlockとNix shellだけを使って次を実行しました。

| Target | Result | Detail |
|---|---|---|
| Flake evaluation | PASS | `x86_64-linux`、`aarch64-linux`、`aarch64-darwin`の全dev shellを`--all-systems --no-build`で評価 |
| Clean bootstrap | PASS | npm、Gradle、NuGet、Cargo、Composerをcommit済みlockから復元 |
| Lock coverage | PASS | Nix、npm 3 project、Gradle、NuGet 5 project、Go module/tool、Cargo+proptest、Composer、Catch2/Trompeloeil commit pin |
| Playwright lock | PASS | Playwright 1.61.1とChromium revision 1228および実行binaryを照合 |
| Workflow lint | PASS | `.github/workflows/reproducibility.yml`を`actionlint`で検証 |
| Hybrid policy links | PASS | ADR/index/template/entrypointを`lychee --offline`で検証、error 0 |
| Python parallel / mutation | PASS | pytest-xdist `-n 2`、targeted mutants 6/6 killed |
| Node execution semantics | PASS | 8 scheduling/isolation scenarios、3 intentional async failures |
| Mockito agent matrix | PASS | OpenJDK 21.0.12 / 25.0.4、explicit agent、self-attachなし |
| .NET runner matrix | PASS | NUnit/MSTest × MTP/VSTest、4 TRX、intentional failure 2 cases |
| C++ sanitizer matrix | PASS | ASan heap-use-after-free、UBSan signed overflow、TSan data raceを別laneで検出 |
| Go execution matrix | PASS | 通常/race、parallel 60 executions、fuzz 100 executions、generated drift、benchmark、3 intentional failures |
| Rust execution matrix | PASS | private unit 2、public integration 6、property 256 cases、trait 1、doctest 2、mutants 7/7 |
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
| pytest | PASS | 33 tests、branch coverage 100% |
| Node built-in / module mock / Mocha / AVA | PASS | 6 + 1 + 5 + 2 tests |
| HTTP adapter / contract / property | PASS | 3 tests |
| Playwright E2E / accessibility | PASS | 2 browser tests |
| Advanced techniques | PASS | 11 tests |
| JUnit / Mockito / Truth | PASS | 13 tests、Jupiter 6.1.1 present、Vintage absent |
| NUnit 4 | PASS | 6 tests、MTP 2.1.0 / VSTest、cancel・async failure |
| MSTest 4 | PASS | 9 tests、MTP 2.3.1 / VSTest、cancel・async failure |
| Catch2 / CTest | PASS | 3 tests、SECTION/GENERATE、2 shards、fixed-seed random order |
| C++ benchmark / compile cost | PASS | 3 noise trials、handwritten spy対Trompeloeil clean build |
| Go | PASS | `-mod=readonly`、`-race`、goleak、parallel isolation、overflow corpus、GoMock drift、0 alloc benchmark |
| Rust / rstest / proptest | PASS | unit/integration/doc境界、10 runtime tests、2 doctests、7/7 targeted mutants、fmt/Clippy |
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
