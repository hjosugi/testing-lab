# Validation report

検証日: 2026-07-12

## 実行済み

| Target | Result | Detail |
|---|---|---|
| Node built-in test | PASS | 3 tests |
| Mocha 11 + Sinon 22 | PASS | 1 test |
| AVA 8 | PASS | 1 test |
| system HTTP integration | PASS | real ephemeral TCP port |
| API response contract | PASS | status/header/shape/type |
| fast-check property | PASS | generated item arrays |
| advanced technique lab | PASS | 11 tests: example/property/metamorphic/differential/model/concurrency/fault/characterization/snapshot/security/performance |
| Node dependency audit | PASS | overrides適用後0 vulnerability |
| system dependency audit | PASS | 0 vulnerability |
| Playwright discovery | PASS | 2 E2E/a11y testsをload/list |
| Python source/test syntax | PASS | `compileall` |
| shell syntax | PASS | `bash -n scripts/*.sh` |
| JSON parse | PASS | npm/composer manifests |
| XML parse | PASS | csproj/phpunit config |
| Issue generation dry-run | PASS | 51 issue files、title/label/bodyをparse |
| Markdown local links | PASS | 101 Markdown files、broken link 0 |
| Advanced JavaScript syntax | PASS | production/testを`node --check` |

## 2回目の検証（2026-07-12、Arch Linux実機・Nixなし）

初回生成環境で実行できなかった項目を、実機（CachyOS、Node 22、Python 3.14、Go、Rust 1.95、GCC 16、CMake 4.4）で再検証しました。

| Target | Result | Detail |
|---|---|---|
| pytest runtime | PASS | 5 tests（classical/london） |
| Go `testing` | PASS | `go test ./...` |
| Rust `cargo test` | PASS | 3 tests（classical/london/rstest cases） |
| Catch2/CMake/CTest | PASS | 2 tests。Catch2はFetchContentフォールバックで取得 |
| Playwright E2E + axe | PASS | Chromium実ブラウザで2 tests（journey/a11y） |
| Node/Mocha/AVA再実行 | PASS | `npm ci`後にすべてgreen |
| system integration/contract/property | PASS | 失敗0 |
| advanced 11-technique lab | PASS | 全pass |
| NotebookLMバンドル生成 | PASS | 6 bundles、`bash -n`構文check |

未実行のまま: JUnit/Gradle（gradle未導入）、.NET（dotnet未導入）、PHPUnit/Infection（php未導入）、Nix評価（nix未導入）。これらはNix導入ホストでの実行手順を下表に残します。

## この環境では未実行

| Target | Reason | 実行方法 |
|---|---|---|
| pytest runtime | current hostにpytestがない | `nix develop .#python --command pytest -q labs/python` |
| JUnit 6/Gradle | current hostにJDK/Gradleがない | `nix develop .#jvm --command gradle -p labs/java test` |
| .NET/NUnit/MSTest | current hostにdotnetがない | `nix develop .#dotnet --command bash -c 'cd labs/dotnet && dotnet test ...'` |
| Catch2/CMake | current hostにCMake/compilerがない | `nix develop .#cpp`後にREADMEのcommand |
| Go | current hostにGoがない | `nix develop .#go --command go test ./labs/go/...` |
| Rust/rstest | current hostにCargoがない | `nix develop .#rust --command cargo test --manifest-path labs/rust/Cargo.toml` |
| PHPUnit/Infection | current hostにPHP/Composerがない | `nix develop .#php`後にREADMEのcommand |
| Nix evaluation | current hostにNixがない | Nix導入済みhostで`nix develop` |

## Playwright browser実行

**2026-07-12更新: 実機で`npx playwright install chromium`後に`npm run test:e2e`を実行し、E2E＋accessibilityの2 testsがpassしました（上の2回目検証表を参照）。**

初回生成環境の記録: Playwright test discoveryは成功しました。Chromium binary取得は、この生成環境のnetwork proxyが0-byte responseを返したため実行できませんでした。test codeのskipやretryで隠さず、Issue #18と#34の実環境検証として残しています。

```bash
cd labs/system
npx playwright install chromium
npm run test:e2e
```

## Known limitations

- `flake.lock`はNixがない生成環境では作れません。Issue #01でclean Nix host上に生成しreviewします。
- Docker、real Postgres、real device、cloud、load、chaosはartifact内で勝手に実行しません。各Issueにenvironment、safety、acceptance criteriaがあります。
- researchの最新preprintはpeer-reviewed resultと分けています。採用判断には再現/追加検証が必要です。
- browser、managed cloud、mobile deviceはlocal emulatorだけでproduction equivalenceを保証しません。
- performance labの時間はcharacterization情報であり、異なるhostを一律に落とす固定thresholdにはしていません。正式な性能gateはcontrolled environment、warm-up、複数sample、SLOで設定します。

## Release gate

正式なrepository releaseでは次を必須にします。

```bash
nix develop --command env STRICT=1 ./scripts/test-all.sh
```

全toolchainがgreenにならない限り、`STRICT=1`はskipを失敗扱いにします。
