# Validation report

検証日: 2026-07-19

## Reproducibility gate

ローカルの`x86_64-linux`環境で、commit対象のlockとNix shellだけを使って次を実行しました。

| Target | Result | Detail |
|---|---|---|
| Flake evaluation | PASS | `x86_64-linux`、`aarch64-linux`、`aarch64-darwin`の全dev shellを`--all-systems --no-build`で評価 |
| Clean bootstrap | PASS | npm、Gradle、NuGet、Cargo、Composerをcommit済みlockから復元 |
| Lock coverage | PASS | Nix、npm 3 project、fast-check 4.9.0、Pact JS 17.0.1、Storybook 10.5.2/Vitest 4.1.10/Vite 8.1.5、Schemathesis 4.23.0 + uv.lock、Gradle、NuGet 5 project、Go module/tool、Cargo+proptest、Composer、PHPUnit PHAR、C++ commit pin、Psycopg/Testcontainers exact version、Postgres/Ryuk digest |
| Playwright lock | PASS | npm/Nix Playwright 1.61.1、Chromium 1228、Firefox 1532、WebKit 2311と各Nix store実行binaryを照合 |
| Workflow lint | PASS | `.github/workflows/reproducibility.yml`を`actionlint`で検証 |
| Hybrid policy links | PASS | ADR/index/template/entrypointを`lychee --offline`で検証、error 0 |
| Python parallel / mutation | PASS | pytest-xdist `-n 2`、targeted mutants 6/6 killed |
| Python real Postgres | PASS | 共有contract 3、Postgres semantics 6、production migration、readiness、container/volume cleanup |
| Postgres unavailable diagnostic | PASS | invalid Docker socketでnon-zeroと明示messageを検証、silent skipなし |
| Node execution semantics | PASS | 8 scheduling/isolation scenarios、3 intentional async failures |
| Mockito agent matrix | PASS | OpenJDK 21.0.12 / 25.0.4、explicit agent、self-attachなし |
| .NET runner matrix | PASS | NUnit/MSTest × MTP/VSTest、4 TRX、intentional failure 2 cases |
| C++ sanitizer matrix | PASS | ASan heap-use-after-free、UBSan signed overflow、TSan data raceを別laneで検出 |
| Property / fuzz suite | PASS | fast-check 18 tests、5 invariant × 500 runs、固定seed分布監査、quantity 10 / price 1までshrink、metamorphic/differential、3 committed counterexamples |
| Risk-based mutation lanes | PASS | StrykerJS 10.0.0 86 mutant中83 killed + 3 timeout（survivor 0）、PIT 1.30.0 8/8、Python curated 7/7、Go catalog 5/5、C++ catalog 3/3、C# catalog 4/4、policy unit 14 tests、review action rate 17/19 |
| Performance profiles | PASS（CI） | model 9 tests、real HTTP profile 6 tests（load/CO/stress/spike/soak/capacity）。local共有host（load average 25〜48）ではgenerator lag p99が30ms予算を超え、profile testはinconclusive（skip）として報告。CIの専用jobは`PERF_REQUIRE_CONCLUSIVE=1`で判定 |
| Go execution matrix | PASS | 通常/race、parallel 60 executions、total/parser fuzz各100x budget、generated drift、benchmark、3 intentional failures |
| Rust execution matrix | PASS | private unit 2、public integration 6、property 256 cases、trait 1、doctest 2、mutants 7/7 |
| PHP execution matrix | PASS | PHP 8.4、PHPUnit 12.5.31→13.2.4、high-risk mutants 14/14、equivalent mutant 1 classified |
| System HTTP vertical slice | PASS | component/source contract 8、real HTTP integration 8、contract 2、property 1、HTTP integration 100/100連続green |
| System Pact contract | PASS | Pact V4 consumer 1、provider verification 3、provider state、breaking change検出、追加field互換 |
| System OpenAPI schema | PASS | OpenAPI 3.1、corpus 5、positive/negative 109、stateful 100+、API Links 5/5、fault oracle 3/3 |
| System Storybook component | PASS | Storybook 10.5.2、Vitest browser mode、real Chromium、state matrix 5、role/name interaction、既知のimage-alt defectをaddon-a11yが5/5でreject |
| System Playwright E2E | PASS | success/failure 2 journeys × Chromium/Firefox/WebKit、2 shards、100 repeats、600 attempts、first-attempt failure 0、retry 0 |
| Device matrix contract | PASS | 1764 Cartesian cellsからrisk-based 12 cellsを選択。9 tool、4 substrate、6 owned/reserved hardware scenarios、artifact/video/device logを検証 |
| NotebookLM build | PASS | 6 bundleを再生成 |

実行command:

```bash
nix flake check --all-systems --no-build
nix develop --command env STRICT=1 ./scripts/bootstrap.sh
nix develop --command ./scripts/check-lockfiles.sh
nix develop --command env STRICT=1 ./scripts/test-all.sh
nix develop .#node --command make test-system-pact
nix develop .#node --command make test-system-storybook
nix develop .#node --command make test-system-e2e-stability
nix develop .#generative --command make test-generative
nix develop --command make verify-device-matrix
nix develop .#python --command make test-python-postgres
```

## STRICT test result

`STRICT=1 ./scripts/test-all.sh`は`failures=0 skips=0`で完了しました。

| Target | Result | Detail |
|---|---|---|
| pytest | PASS | 34 tests、branch coverage 100% |
| pytest / real Postgres | PASS | Testcontainers 4.14.2、Postgres 18.4、9 tests、leak 0 |
| Node built-in / module mock / Mocha / AVA | PASS | 6 + 1 + 5 + 2 tests |
| System component/source contract / HTTP integration / contract / property | PASS | 8 + 8 + 2 + 1 tests、HTTP integration suite 100回連続green |
| System Pact consumer/provider | PASS | consumer 1 + provider 3 tests、Pact V4、minimal matcher、explicit provider state、breaking/compatible change oracle |
| System OpenAPI / Schemathesis | PASS | seed 20260719、109 generated + 100+ stateful cases、5/5 links、保存corpus 5、5xx/schema/unexpected-field oracle |
| Storybook/Vitest browser component | PASS | 5 stories、real Chromium、role/name interaction、addon-a11y、image-alt mutation 5/5 failed as expected |
| Playwright E2E / stability | PASS | 2 journeys × 3 browsers = 6 tests、100-repeat 2-shard gateは600 attempts、flake 0。accessibilityはStorybook、CSS tokenはsource component testが担当 |
| Mobile/device matrix validator | PASS | WebDriver/gray-box/image/hierarchy分類、simulator/emulator/real-device/HIL、dimension coverage、hardware owner/予約/artifact contract |
| Advanced generative techniques | PASS | 25 tests（mutation由来7件を含む）、5 invariant、固定seed `20260719`、boundary/cart-size分布、shrink、4 metamorphic relation、独立reference differential、synthetic defect corpus |
| JUnit / Mockito / Truth | PASS | 13 tests、Jupiter 6.1.1 present、Vintage absent |
| NUnit 4 | PASS | 8 tests、MTP 2.1.0 / VSTest、cancel・async failure |
| MSTest 4 | PASS | 9 tests、MTP 2.3.1 / VSTest、cancel・async failure |
| Catch2 / CTest | PASS | 3 tests、SECTION/GENERATE、2 shards、fixed-seed random order |
| C++ benchmark / compile cost | PASS | 3 noise trials、handwritten spy対Trompeloeil clean build |
| Go | PASS | `-mod=readonly`、`-race`、goleak、parallel isolation、overflow/parser corpus、2 coverage-guided fuzz targets × 100x budget、GoMock drift、0 alloc benchmark |
| Rust / rstest / proptest | PASS | unit/integration/doc境界、10 runtime tests、2 doctests、7/7 targeted mutants、fmt/Clippy |
| PHPUnit / Infection | PASS | 10 tests、28 assertions、12.5/13.2 deprecation-free、MSI/covered MSI 100% |

## CI runtime matrix

ローカル検証に加え、PRと`main`では次のruntime gateを必須にします。

- `ubuntu-24.04`: `x86_64-linux`のstrict bootstrapと全test
- `macos-15`: `aarch64-darwin`のstrict bootstrapと全test（WebKit 2311はmacOS 15以上が前提）
- `windows-2025`: locked NuGet restore後のNUnit/MSTest
- `ubuntu-24.04`: Nix Python shellとclean Docker daemonによるreal Postgres integration

Linux/macOS jobは最後に`git status --porcelain`が空であることも検証し、bootstrapやtestがlockfileまたは生成物を変更した場合は失敗します。

## Known limitations

- real device、managed cloud、load、chaosはこのgateで自動実行しません。各Issueでenvironment、safety、acceptance criteriaを定義します。
- browser、managed cloud、mobile deviceはlocal emulatorだけでproduction equivalenceを保証しません。
- performance labの時間はcharacterization情報です。正式な性能gateはcontrolled environment、warm-up、複数sample、SLOを使います。
