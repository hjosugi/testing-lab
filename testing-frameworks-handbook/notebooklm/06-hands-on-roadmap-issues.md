# 観点6 ハンズオン・ロードマップ・全Issue

> Testing Frameworks Handbook のNotebookLM取り込み用バンドル。
> 生成元: https://github.com/hjosugi/testing-lab （scripts/build-notebooklm.sh で再生成）

---

<!-- SOURCE: docs/10-interview-guide.md -->

# Google面接向け説明

## 30秒版

I separate the test runner, test framework, assertion library, and mocking library. For unit-test design, I use Classical-style state tests for domain logic and London-style interaction tests for important orchestration protocols. I avoid mocking value objects and internal methods. I add real integration tests for databases, contract tests for service compatibility, and only a small number of critical E2E tests. I measure reliability with flake rate and mutation testing, not coverage alone.

## Classical vs London

Classical TDD usually tests a group of real in-memory objects and verifies the final state or returned value. It is resilient to internal refactoring, but a failure may be less local.

London TDD usually isolates one subject and replaces collaborators with test doubles. It verifies important interactions and supports outside-in design. It gives local failures, but too many interaction checks can couple tests to implementation details.

I do not choose one school for the whole codebase. I choose by boundary and risk.

## framework選定の2分版

First, I define the test layer and failure types. A unit-test runner, a browser E2E tool, and a mutation tool solve different problems, so I do not compare them only by popularity.

Then I run a small spike with the same cases: async success, dependency failure, parameterized tests, parallel isolation, and diagnostic output.

I evaluate execution semantics, failure messages, IDE and CI support, version policy, and team debugging cost. For a new Java project, I would start with JUnit 6. For Go or Rust, I would start with the standard toolchain. For Node.js, I would evaluate the built-in test runner before adding Mocha or AVA.

Finally, I design a test portfolio. Domain rules use state and property tests. External adapters use integration tests. Service compatibility uses contract tests. Critical user journeys use a small number of E2E tests.

## follow-up questions

### Why not mock every dependency?

Mocks improve isolation, but they can lock the current call sequence. I mock only important boundaries or protocols. For stable in-memory domain objects, I prefer real objects.

### Is 100% coverage good?

It can show that every line ran, but it cannot prove that assertions detect wrong behavior. I use coverage to find gaps and mutation testing to evaluate test strength.

### How do you handle flaky tests?

I classify the cause: time, concurrency, shared state, network, UI waiting, randomness, or environment. I make the dependency deterministic. Retry is temporary and must have an owner and an expiry date.


---

<!-- SOURCE: docs/11-sources.md -->

# 公式情報源と確認日

確認日: 2026-07-19

可能な限り公式documentation、official repository、project siteを参照しています。versionは教材生成時点のものであり、実行前にlockfileとrelease noteを再確認してください。

## 思想

- Martin Fowler, Mocks Aren't Stubs: https://martinfowler.com/articles/mocksArentStubs.html
- Growing Object-Oriented Software, Guided by Tests（London schoolの代表的文献）: http://www.growing-object-oriented-software.com/
- Test Double wiki（Detroit/Londonの整理）: https://github.com/testdouble/contributing-tests/wiki/Test-Double

## JavaScript／TypeScript

- Node.js v26 test runner: https://nodejs.org/api/test.html
- Node.js HTTP: https://nodejs.org/api/http.html
- Node.js AbortController / AbortSignal: https://nodejs.org/api/globals.html#class-abortcontroller
- Mocha docs: https://mochajs.org/
- Mocha parallel mode: https://mochajs.org/#parallel-tests
- AVA: https://avajs.dev/
- fast-check core blocks: https://fast-check.dev/docs/core-blocks/
- fast-check arbitraries/shrinking: https://fast-check.dev/docs/core-blocks/arbitraries/
- fast-check configuration: https://fast-check.dev/docs/configuration/
- Playwright Test: https://playwright.dev/docs/test-intro
- Vitest browser mode: https://vitest.dev/guide/browser/
- TestCafe architecture: https://testcafe.io/documentation/402631/guides/overview/why-testcafe

確認したnpm version: Node docs 26.5.0、fast-check 4.9.0、Mocha 11.7.6、AVA 8.0.1、Sinon 22.0.0、TypeScript 7.0.2（2026-07-19 registry）。

## Python

- pytest stable docs: https://docs.pytest.org/en/stable/
- fixtures: https://docs.pytest.org/en/stable/explanation/fixtures.html
- parametrization: https://docs.pytest.org/en/stable/how-to/parametrize.html
- Psycopg 3 docs: https://www.psycopg.org/psycopg3/docs/
- Psycopg package: https://pypi.org/project/psycopg/
- Testcontainers Python: https://testcontainers-python.readthedocs.io/
- Testcontainers Python package: https://pypi.org/project/testcontainers/

確認したPython integration version: Psycopg 3.3.4、Testcontainers 4.14.2（2026-07-19 PyPI）。

## JVM

- JUnit: https://junit.org/
- JUnit 6.1.1 overview: https://docs.junit.org/6.1.1/overview.html
- JUnit 6.1.1 release notes: https://docs.junit.org/6.1.1/release-notes.html
- Truth: https://truth.dev/

JUnit 6.1.1は2026-06-28公開。JUnit 6はJava 17以上、Kotlin 2.1以上を要求します。

## .NET

- Testing in .NET: https://learn.microsoft.com/dotnet/core/testing/
- MTP overview: https://learn.microsoft.com/dotnet/core/testing/microsoft-testing-platform-intro
- MSTest overview: https://learn.microsoft.com/dotnet/core/testing/unit-testing-mstest-intro
- NUnit docs: https://docs.nunit.org/
- NUnit framework release notes: https://docs.nunit.org/articles/nunit/release-notes/framework.html

NUnit 4.6.0は2026-05-04公開。MTP資料は2026-04-27更新。

## C++

- Catch2 docs: https://catch2-temp.readthedocs.io/
- test cases and SECTION: https://catch2-temp.readthedocs.io/en/latest/test-cases-and-sections.html
- generators: https://catch2-temp.readthedocs.io/en/latest/generators.html
- CMake integration: https://github.com/catchorg/Catch2/blob/devel/docs/cmake-integration.md

## Go

- package testing: https://pkg.go.dev/testing
- testing tutorial: https://go.dev/doc/tutorial/add-a-test
- fuzzing tutorial: https://go.dev/doc/tutorial/fuzz
- coverage-guided fuzzing and corpus: https://go.dev/doc/security/fuzz/

## Rust

- Rust Book, testing: https://doc.rust-lang.org/book/ch11-00-testing.html
- test execution: https://doc.rust-lang.org/book/ch11-02-running-tests.html
- test organization: https://doc.rust-lang.org/book/ch11-03-test-organization.html
- Rust rstest crate: https://docs.rs/rstest/0.26.1/rstest/
- Proptest book: https://proptest-rs.github.io/proptest/
- cargo-mutants guide: https://mutants.rs/

## PHP

- PHPUnit 13 announcement: https://phpunit.de/announcements/phpunit-13.html
- PHPUnit 13.2 announcement: https://phpunit.de/announcements/phpunit-13.2.html
- PHPUnit 12.5 manual: https://docs.phpunit.de/en/12.5/
- supported versions: https://phpunit.de/supported-versions.html
- Infection guide: https://infection.github.io/guide/
- Infection metrics: https://infection.github.io/guide/#Metrics
- Infection command-line options: https://infection.github.io/guide/command-line-options.html

PHPUnit 13は2026-02-06公開、PHP 8.4以上。PHPUnit 13.2は2026-06-05公開。InfectionはPHP 8.3以上。

## Contract／specialized

- RFC 9457, Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457
- Schemathesis CLI: https://schemathesis.readthedocs.io/en/stable/reference/cli/
- Schemathesis checks: https://schemathesis.readthedocs.io/en/stable/reference/checks/
- Schemathesis stateful testing: https://schemathesis.readthedocs.io/en/latest/guides/stateful-testing/
- Schemathesis 4.23.0: https://pypi.org/project/schemathesis/
- Dredd: https://dredd.org/
- Dredd supported description formats: https://dredd.org/en/latest/quickstart.html
- Prism: https://github.com/stoplightio/prism
- Hurl manual: https://hurl.dev/docs/manual.html
- PactumJS API testing: https://pactumjs.github.io/api/requests/spec.html
- PactumJS fuzz testing: https://pactumjs.github.io/guides/fuzz-testing.html
- Karate: https://docs.karatelabs.io/
- Pact introduction: https://docs.pact.io/
- How Pact works: https://docs.pact.io/getting_started/how_pact_works
- Pact consumer tests: https://docs.pact.io/consumer
- Pact JS consumer API: https://docs.pact.io/implementation_guides/javascript/docs/consumer
- Pact JS provider verification: https://github.com/pact-foundation/pact-js/blob/master/docs/provider.md
- Pending pacts and WIP pacts: https://docs.pact.io/pact_broker/advanced_topics/pending_pacts
- `can-i-deploy`: https://docs.pact.io/pact_broker/can_i_deploy
- mountebank docs: https://www.mbtest.org/docs/gettingStarted

## Nix

- Nix manual: https://nix.dev/manual/nix/latest/
- `nix develop`: https://nix.dev/manual/nix/latest/command-ref/new-cli/nix3-develop
- flakes: https://nix.dev/concepts/flakes.html

## Integration／UI／mobile

- Testcontainers: https://java.testcontainers.org/
- Docker Official Image for Postgres: https://hub.docker.com/_/postgres
- PostgreSQL 18.4 release: https://www.postgresql.org/docs/release/18.4/
- Storybook testing: https://storybook.js.org/docs/writing-tests
- Storybook Vitest addon: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
- Storybook interaction testing: https://storybook.js.org/docs/writing-tests/interaction-testing
- Storybook accessibility testing: https://storybook.js.org/docs/writing-tests/accessibility-testing
- Storybook test-runner migration guide: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/migration-guide
- Storybook for Web Components with Vite: https://storybook.js.org/docs/get-started/frameworks/web-components-vite
- Schemathesis: https://schemathesis.readthedocs.io/
- Appium 3 architecture: https://appium.io/docs/en/latest/intro/appium/
- Appium driver ecosystem: https://appium.io/docs/en/latest/ecosystem/drivers/
- Appium CLI: https://appium.io/docs/en/latest/reference/cli/
- Detox architecture and synchronization: https://wix.github.io/Detox/docs/articles/how-detox-works/
- Detox artifact collection: https://wix.github.io/Detox/docs/config/artifacts/
- Detox project/device setup: https://wix.github.io/Detox/docs/introduction/project-setup/
- Apple testing in Xcode: https://developer.apple.com/documentation/xcode/testing
- XCTest result bundles: https://developer.apple.com/documentation/xcode/running-tests-and-interpreting-results
- XCTest activities and attachments: https://developer.apple.com/documentation/xctest/activities-and-attachments
- EarlGrey 2: https://github.com/google/EarlGrey/tree/earlgrey2
- Android Espresso: https://developer.android.com/training/testing/espresso
- Android build-managed devices: https://developer.android.com/studio/test/managed-devices
- Airtest/Poco docs: https://airtest.doc.io.netease.com/en/
- Cavy: https://cavy.app/docs/getting-started/running-tests
- Flutter integration tests: https://docs.flutter.dev/testing/integration-tests
- Firebase Test Lab: https://firebase.google.com/docs/test-lab
- Firebase Test Lab Android results: https://firebase.google.com/docs/test-lab/android/get-started
- Firebase Test Lab iOS device availability: https://firebase.google.com/docs/test-lab/ios/available-testing-devices
- Testing Library guiding principles: https://testing-library.com/docs/guiding-principles
- Testing Library query priority: https://testing-library.com/docs/queries/about#priority
- Playwright browsers: https://playwright.dev/docs/browsers
- Playwright projects: https://playwright.dev/docs/api/class-testproject
- Playwright browser-context isolation: https://playwright.dev/docs/browser-contexts
- Playwright auto-retrying assertions: https://playwright.dev/docs/test-assertions
- Playwright retries: https://playwright.dev/docs/test-retries
- Playwright sharding: https://playwright.dev/docs/test-sharding
- Playwright trace and screenshot options: https://playwright.dev/docs/test-use-options
- Playwright video options: https://playwright.dev/docs/videos
- Playwright custom reporter API: https://playwright.dev/docs/api/class-reporter
- Playwright best practices: https://playwright.dev/docs/best-practices

## 研究論文

論文の分類、DOI、peer-reviewed／preprintの区別、実務への含意は [13-research-and-modern-practice.md](13-research-and-modern-practice.md) にまとめています。

- Metamorphic Testing: A Review of Challenges and Opportunities: https://nottingham-repository.worktribe.com/output/925152/metamorphic-testing-a-review-of-challenges-and-opportunities

---

<!-- SOURCE: docs/12-nix-setup.md -->

# Nix setup

## 目的

`flake.nix`と`flake.lock`はOS/toolchain dependencyを固定し、各package managerのlockfileはlanguage dependency graphを固定します。どちらか片方だけではclean machineで同じ環境を再現できません。

## Clean machineの1 command bootstrap

LinuxまたはmacOSへNixを導入してflakesを有効にした後、repository rootから次の1 commandを実行します。

```bash
nix develop ./testing-frameworks-handbook --command env STRICT=1 ./testing-frameworks-handbook/scripts/bootstrap.sh
```

handbook directory内では短い形も使えます。

```bash
make bootstrap-locked
```

bootstrapはnpmの`npm ci`、uvの`sync --frozen`、Gradle dependency locking、NuGet locked restore、Cargo `--locked`、Composer installを使います。PlaywrightのChromium、Firefox、WebKitはpinned nixpkgsから供給し、npm package、Nix driver、browser revisionを照合します。`STRICT=1`ではtoolchain不足をskipせず失敗にします。

## Lock inventory

| 対象 | 固定するfile／方法 | CIでの強制 |
|---|---|---|
| Nix/toolchain | `flake.lock` | `nix flake check --all-systems --no-build` |
| Node/Mocha/AVA | `labs/node/package-lock.json` | `npm ci` |
| Node advanced | `labs/advanced/package-lock.json`、fast-check 4.9.0 exact pin | `npm ci`、5 property、distribution/shrink、metamorphic/differential |
| Pact/Storybook/Vitest/Playwright/system | `labs/system/package-lock.json` + `flake.lock`のPlaywright driver/browser | `npm ci` + Pact 17.0.1 provider verification + Storybook 10.5.2/Vitest 4.1.10 browser test + 3-engine E2E + `verify:browser-lock` |
| OpenAPI/Schemathesis | `labs/system/api-tests/uv.lock` | NixのPython 3.13/uv + `uv sync --frozen`、Schemathesis 4.23.0 |
| JVM | `labs/java/gradle.lockfile` | Gradle dependency locking |
| .NET | 各projectの`packages.lock.json` + `global.json` | `dotnet restore --locked-mode` |
| Rust | `labs/rust/Cargo.lock`、Nixのcargo-mutants | `cargo fetch/test --locked`、targeted mutation |
| PHP | `labs/php/composer.lock`、PHPUnit 12.5.31 PHARのSHA-256 | `composer install`、12.5→13 migration、PCOV mutation |
| C++ fallback | Catch2/Trompeloeil releaseの40桁commit SHA | CMake `FetchContent` |
| Go | `labs/go/go.mod` + `go.sum`、mockgen tool directive | `go mod download`、`-mod=readonly`、generated mock drift check |
| Python/Postgres | dependencyはNix、containerはdigestで固定 | pytest、Hypothesis、Psycopg 3.3.4、Testcontainers 4.14.2、Docker CLIをNixから供給し、Postgres/Ryuk image pinを検査 |

`scripts/check-lockfiles.sh`はmanifestに対応するlockの欠落、fast-check、Schemathesis、Pact、Playwright、Storybook、Vitest、Viteのexact pin、Goのmockgen tool pin、CMake fallbackのmutable tag、Python integration dependencyとcontainer image digest、deprecated Storybook test-runnerやE2E用axe重複dependencyの再導入、Nixのuvの欠落を検出します。

## CI matrix

[`.github/workflows/reproducibility.yml`](../../.github/workflows/reproducibility.yml)は次を実行します。

- `ubuntu-24.04`で`x86_64-linux`
- `macos-15`で`aarch64-darwin`
- `windows-2025`でWindows固有の.NET lane
- `ubuntu-24.04`のclean Docker daemonでreal Postgres integration

GitHubのstandard `macos-15`はApple Silicon arm64 runnerです。Playwright 1.61はmacOS 14でWebKitを凍結revision 2251へ切り替えますが、nixpkgsのdarwin WebKitはmacOS 15向けrevision 2311だけを提供するため、runnerはmacOS 15以上に固定します。Linuxではnpm版playwright-coreのapt package前提のhost checkをNix shellで無効化し、Nix storeのpatch済みbrowserだけを使います。runner labelのarchitectureは[GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)を正とし、job内でも`builtins.currentSystem`を照合します。

Linux/macOS laneはflake全systemの評価、lockだけを使うbootstrap、`STRICT=1 ./scripts/test-all.sh`、生成差分0をgateにします。通常laneはDocker不在時の明示failure契約だけをcontainerなしで確認し、real PostgresはDockerを持つLinux専用laneでrequiredにします。Windows laneはNixの代替ではなく、path、filesystem、native SDKなどWindowsでしか検出できないriskを担当します。

## Python/Postgresの1 command実行

Nix shellがPython、Psycopg、Testcontainers、Docker CLIをすべて供給します。Docker daemonはhost/runtime機能なので、Linux hostまたはCI runner側で利用可能にします。

```bash
nix develop .#python --command make test-python-postgres
```

`labs/python/container-images.env`はPostgresとRyukのversion/tag/digestを一元管理します。runnerはdaemon、pin形式、readiness、production migration、test result、container/volume cleanupを順に検証します。daemon不在をsilent skipしないことは次でcontainerなしに自己テストできます。

```bash
nix develop .#python --command make test-python-postgres-unavailable
```

## OpenAPI/Schemathesisの1 command実行

Nixの`api` shellがNode 24、Python 3.13、uvを供給し、uvは
`api-tests/uv.lock`だけからSchemathesisを復元します。host Pythonや
global npm packageは使いません。

```bash
nix develop .#api --command make test-system-api
```

seed付きpositive/negative generation、OpenAPI Linkによるstateful
POST→GET→DELETE、保存済みfailure corpus、3種類のfault-injection oracleを
一度に実行します。外部serviceやDocker daemonは不要です。

## Property / fuzz suiteの1 command実行

Nixの`generative` shellがNode.js、npm、Goを供給します。fast-check 4.9.0は
`labs/advanced/package-lock.json`から復元し、Go coverage-guided fuzzerはNixの
Go toolchainを使います。

```bash
nix develop .#generative --command npm --prefix labs/advanced ci
nix develop .#generative --command make test-generative
```

このtargetは5件のdomain invariant、generator分布、shrinker、metamorphic /
differential oracle、commit済みcounterexample、parser/APIの2 fuzz targetを
実行します。Docker、外部service、host側のNode/Goは不要です。

## Pactの1 command実行

Nixの`node` shellがNode 24を供給し、Pact JS 17.0.1とnative verifierは
`labs/system/package-lock.json`から`npm ci`で復元します。consumer contract生成、
real HTTP provider verification、破壊変更と互換な追加fieldのacceptance oracleを
次の1 commandで実行できます。

```bash
nix develop .#node --command make test-system-pact
```

local verificationにPact Broker、Docker、global npm packageは不要です。
Brokerを使うbranch/pending/WIP/deploy policyは
[`labs/system/README.md`](../labs/system/README.md)に記録しています。

## Storybook/Vitest browser componentの1 command実行

同じ`node` shellと`labs/system/package-lock.json`からStorybook 10.5.2、
Vitest 4.1.10、Vite 8.1.5、Web Components renderer、accessibility addonを
復元します。Nixが供給して`verify:browser-lock`で照合するPlaywright Chromiumを
Vitest browser providerでも使うため、system browserやglobal packageは不要です。

```bash
nix develop .#node --command make test-system-storybook
```

このtargetは5-storyのstate matrix、role/name interaction、addon-a11yを
headless Chromiumで実行します。Storybookのproduction bundleも確認するときは
同じshellで`npm --prefix labs/system run build-storybook`を実行します。

## Playwright 3 browserのNix固定

`@playwright/test`、`playwright`、`playwright-core`は
`package-lock.json`で1.61.1へ固定します。Nix側も同じversionの
`playwright-driver.browsers`を使い、shellが
`PLAYWRIGHT_BROWSERS_PATH`と`PLAYWRIGHT_NIX_DRIVER_VERSION`を設定します。

```bash
nix develop .#node --command bash -lc \
  'cd labs/system && npm ci && npm run verify:browser-lock && npm run test:e2e'
nix develop .#node --command make test-system-e2e-stability
```

`verify:browser-lock`はnpm 3 packageとNix driverのversionが一致すること、
`playwright-core/browsers.json`のChromium 1228、Firefox 1532、
WebKit 2311、およびNix store内の各実行binaryを照合します。system browserや
別versionへの暗黙fallbackはありません。Linux shellはNixのMesa EGL vendor、
DRI driver、software renderingも固定するため、WebKit/WPEをhost GPU packageに
依存させません。

Nixを使わずに`./scripts/bootstrap.sh`を直接実行した場合だけ、
`playwright install chromium firefox webkit`を同じnpm lockから実行します。
Nix shell内ではbrowser downloadを行いません。

## Lockとtoolchainの更新手順

更新はecosystemごとに行い、生成差分とrelease noteをreviewします。

```bash
# Nix/toolchain
nix flake update

# npm
(cd labs/node && npm install --package-lock-only)
(cd labs/advanced && npm install --package-lock-only)
(cd labs/system && npm install --package-lock-only)
(cd labs/system/api-tests && uv lock --upgrade)

# Rust
(cd labs/rust && cargo update)

# PHP
nix develop .#php --command composer --working-dir=labs/php update --no-install

# Gradle
nix develop .#jvm --command gradle -p labs/java dependencies --write-locks --no-daemon

# .NET
nix develop .#dotnet --command dotnet restore labs/dotnet/src/Checkout/Checkout.csproj --force-evaluate -p:RestoreLockedMode=false
nix develop .#dotnet --command dotnet restore labs/dotnet/tests/NUnitTests/NUnitTests.csproj --force-evaluate -p:RestoreLockedMode=false
nix develop .#dotnet --command dotnet restore labs/dotnet/tests/MSTestTests/MSTestTests.csproj --force-evaluate -p:RestoreLockedMode=false
nix develop .#dotnet --command dotnet restore labs/dotnet/tests/NUnitVSTestTests/NUnitVSTestTests.csproj --force-evaluate -p:RestoreLockedMode=false
nix develop .#dotnet --command dotnet restore labs/dotnet/tests/MSTestVSTestTests/MSTestVSTestTests.csproj --force-evaluate -p:RestoreLockedMode=false
```

Playwrightを更新する場合はnpm exact pinと、同じversion/revisionを持つ
`playwright-driver.browsers`を同時に更新して`verify:browser-lock`を実行します。
CMake fallbackを更新するときはrelease tagではなく、そのtagが指す40桁commit
SHAを記録します。

更新後のgate:

```bash
nix flake check --all-systems --no-build
nix develop --command env STRICT=1 ./scripts/bootstrap.sh
nix develop --command ./scripts/check-lockfiles.sh
nix develop --command env STRICT=1 ./scripts/test-all.sh
nix develop .#python --command make test-python-postgres
git diff --check
```

## Windows

NixはWindows nativeの主要workflowではありません。次のどちらかです。

1. WSL2内でNixを使う
2. Windows nativeは各SDK、CI/LinuxはNixで検証する

C#やnative UIのWindows固有testはNix shellの対象外です。共通testはLinux/macOSのNix laneでも実行し、Windows runnerではlocked NuGet restore後に.NET testを再実行します。将来のWindows path、registry、installer、UI automationもこのlaneへ追加します。

## shellを分ける

default shellは全言語を含み重いので、日常作業では個別shellを使えます。

```bash
nix develop .#python
nix develop .#api
nix develop .#generative
nix develop .#node
nix develop .#jvm
nix develop .#dotnet
nix develop .#cpp
nix develop .#go
nix develop .#rust
nix develop .#php
```

## reproducibilityの境界

Nix shellだけでは次を固定しません。

- remote test serviceのbehavior
- managed browser/device serviceのruntime image
- Docker image tagがmutableな場合
- timezone/locale/CPU scheduling
- npm/Maven/NuGet/Composer/Cargo dependency（各lockfileで固定）

したがって、lockfileに加えてremote service、container digest、timezone、locale、architectureをtest design cardへ記録します。このrepositoryのPostgres labはimage digestとUTCを明示し、Docker daemon自体はhost側の前提として起動時に検査します。

---

<!-- SOURCE: issues/README.md -->

# Issue backlog

各Issueは依存順に番号を付けています。`gh`で投入する前にrepositoryのlabelを作成してください。

```bash
./scripts/create-issues.sh --dry-run
./scripts/create-issues.sh --apply
```

## Phase

| Phase | Issues | Exit criteria |
|---|---|---|
| Foundation | 00-04 | 用語、Nix、Classical/Londonを説明可能 |
| Polyglot | 05-12 | 8言語の同一behaviorがgreen |
| Integration/UI | 13-18 | real boundary、contract、E2Eを分離 |
| Specialized | 19-27 | mobile、performance、security、data/AI等をrisk-based設計 |
| Operations/research | 28-34 | continuous verification、論文再現、品質audit |
| Deep-dive practice | 35-50 | oracle、state、concurrency、data、運用、AIまで実証 |

`blocked`、`needs-hardware`、`needs-cloud`を使い、localで完了できない検証を曖昧にcloseしないでください。

---

<!-- SOURCE: issues/00-define-test-language.md -->

# docs: test taxonomyと共通語彙をteam標準にする
<!-- labels: documentation,testing,priority-high -->

## Goal

runner、framework、assertion、double、specialized toolと、各test layerの意味を混同しない共通語彙を作る。

## Tasks

- [ ] `docs/00-map.md`と`docs/14-complete-testing-taxonomy.md`をreview
- [ ] unit/component/integration/contract/system/E2Eのteam定義を記録
- [ ] 各suite名にscope/boundaryを含める命名規約を決定
- [ ] 既存suiteをtaxonomyへmapping

## Acceptance criteria

- [ ] 各suiteについて実物、double、oracle、riskを1文で説明できる
- [ ] 「integration test」という無修飾名を新規に作らない


---

<!-- SOURCE: issues/01-lock-nix-environment.md -->

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


---

<!-- SOURCE: issues/02-practice-classical-tdd.md -->

# learning: Classical TDDをstate-based designで完走する
<!-- labels: learning,tdd,classical -->

## Tasks

- [ ] checkoutにdiscount ruleをred-green-refactorで追加
- [ ] real domain objectとin-memory fakeでobservable outcomeを検証
- [ ] internal methodを抽出/統合しtestが壊れないことを確認
- [ ] fakeとreal adapterのcontract suite案を作る

## Acceptance criteria

- [ ] sociable unitとintegration testの違いを説明できる
- [ ] state testのfailure局所性の弱点を実例で説明できる


---

<!-- SOURCE: issues/03-practice-london-tdd.md -->

# learning: London TDDをoutside-inで完走する
<!-- labels: learning,tdd,london,mocking -->

## Tasks

- [ ] notification collaboratorを未実装interfaceから追加
- [ ] mockで重要protocolを先に定義
- [ ] mock setupからresponsibility過多を検出し分割
- [ ] call orderを仕様に含める場合/含めない場合を比較

## Acceptance criteria

- [ ] solitary unit、role、messageを説明できる
- [ ] interaction couplingを起こすassertionを識別できる
- [ ] wiringを補うcomponent testを追加できる


---

<!-- SOURCE: issues/04-build-hybrid-policy.md -->

# architecture: Classical/Londonのhybrid testing policyを決める
<!-- labels: architecture,testing,decision -->

## Depends on

- #02
- #03

## Tasks

- [ ] domain/application/adapterごとのdefault styleを決定
- [ ] mock対象と禁止対象を例示
- [ ] fake contract suiteの必須条件を定義
- [ ] exceptionをADR templateへ記録

## Acceptance criteria

- [ ] schoolをrepository全体へ一律適用していない
- [ ] risk/boundaryから選べるdecision tableがある


---

<!-- SOURCE: issues/05-complete-python-lab.md -->

# lab(python): pytest fixture/parametrize/mock/propertyを完成する
<!-- labels: python,pytest,hands-on -->

## Tasks

- [ ] Classical/London testsを実行
- [ ] fixture scope違いを追加しparallel safetyを確認
- [ ] Hypothesisでtotal invariantを追加
- [ ] wrong lookup site patchを再現し修正
- [ ] branch coverageとmutation結果を比較

## Acceptance criteria

- [ ] `pytest -q` green
- [ ] autouse fixtureを使う/避ける判断を説明可能


---

<!-- SOURCE: issues/06-complete-node-lab.md -->

# lab(node): Node runner/Mocha/AVAのexecution semanticsを比較する
<!-- labels: nodejs,javascript,hands-on -->

## Tasks

- [ ] 3 runnerで同じcheckout behaviorを実行
- [ ] serial/concurrent/file isolationを計測
- [ ] Node mockとSinon spy/stubを比較
- [ ] ESM dependency injectionとmodule mockを比較
- [ ] intentional failure outputを保存

## Acceptance criteria

- [ ] framework選定をfeature数でなくexecution modelから説明できる
- [ ] unawaited async failureの再現testがある


---

<!-- SOURCE: issues/07-complete-jvm-lab.md -->

# lab(jvm): JUnit 6 Platform/Jupiter/Mockito/Truthを完成する
<!-- labels: java,junit,hands-on -->

## Tasks

- [ ] JUnit 6.1.1 testsを実行
- [ ] parameterized/dynamic/extensionの各適用例を追加
- [ ] Mockito agent要件をJDKごとに検証
- [ ] Truth custom SubjectをOrderへ実装
- [ ] Kotlin coroutine test差分をdocument化

## Acceptance criteria

- [ ] Platform、engine、Jupiter、assertion、mockを区別できる
- [ ] JUnit Vintageを新規testへ使わない


---

<!-- SOURCE: issues/08-complete-dotnet-lab.md -->

# lab(dotnet): NUnit 4とMSTest 4/MTPを比較する
<!-- labels: dotnet,csharp,nunit,mstest,hands-on -->

## Tasks

- [ ] NUnit/MSTest両suiteを.NET 10で実行
- [ ] NUnit constraintとMSTest assertionのfailureを比較
- [ ] MTP/VSTestの起動とreport差を記録
- [ ] cancellation/async failure testを追加
- [ ] xUnit.net v3をspike候補に追加

## Acceptance criteria

- [ ] framework/platform/adapterのversion matrixがgreen
- [ ] MTP採用ADRを作成


---

<!-- SOURCE: issues/09-complete-cpp-lab.md -->

# lab(cpp): Catch2 3、sanitizer、benchmarkを完成する
<!-- labels: cpp,catch2,hands-on -->

## Tasks

- [ ] SECTION/GENERATEを実行
- [ ] ASan/UBSan/TSan別jobを作成
- [ ] Catch2 benchmarkとmicrobenchmarkのnoiseを確認
- [ ] handwritten spyとmock frameworkのcompile time比較
- [ ] CTest sharding/random orderを検証

## Acceptance criteria

- [ ] clean CMake build/testがgreen
- [ ] lifetime/UB failureをsanitizerが検出するfixtureがある


---

<!-- SOURCE: issues/10-complete-go-lab.md -->

# lab(go): testing/table/race/fuzzを完成する
<!-- labels: go,fuzzing,hands-on -->

## Tasks

- [ ] `go test ./...`と`-race`を実行
- [ ] table/subtest/t.Parallelのresource isolationを確認
- [ ] fuzz failure seedをcorpusへ保存
- [ ] consumer-owned interfaceとgenerated mockを比較
- [ ] benchmark allocationを追加

## Acceptance criteria

- [ ] race、goroutine leak、order dependenceの各failureを再現可能


---

<!-- SOURCE: issues/11-complete-rust-lab.md -->

# lab(rust): cargo test、rstest、property、mutationを完成する
<!-- labels: rust,rstest,hands-on -->

## Tasks

- [ ] unit/integration/doc testを実行
- [ ] rstest fixture/caseを追加
- [ ] proptestまたはquickcheckを比較
- [ ] cargo-mutantsをhigh-risk functionへ実行
- [ ] trait doubleのSend/Sync/ownership差を記録

## Acceptance criteria

- [ ] public API testとprivate unit testの境界が明確


---

<!-- SOURCE: issues/12-complete-php-lab.md -->

# lab(php): PHPUnit 13とInfectionを完成する
<!-- labels: php,phpunit,mutation-testing,hands-on -->

## Tasks

- [ ] PHP 8.4/PHPUnit 13.2でgreen
- [ ] PHPUnit 12.5 deprecation-freeから13 migrationを再現
- [ ] Infection MSI/covered MSIを記録
- [ ] escaped mutantへassertionを追加
- [ ] equivalent mutantを分類

## Acceptance criteria

- [ ] `composer test` green
- [ ] high-risk codeで設定したmutation thresholdを満たす


---

<!-- SOURCE: issues/13-component-and-http-integration.md -->

# test: component/HTTP integrationのvertical sliceを完成する
<!-- labels: integration-testing,api,hands-on,priority-high -->

## Tasks

- [ ] in-process componentとreal HTTP testを分離
- [ ] invalid JSON、timeout、cancellation、large bodyを追加
- [ ] unique portとparallel executionを検証
- [ ] trace ID/error problem detailをassert
- [ ] test scope/boundary/double/oracleをREADMEへ記録

## Acceptance criteria

- [ ] `labs/system` HTTP adapter testが100回連続green
- [ ] test名だけで境界が分かる

---

<!-- SOURCE: issues/14-real-database-testcontainers.md -->

# test: Testcontainersでreal Postgres integrationを追加する
<!-- labels: integration-testing,testcontainers,database -->

## Depends on

- #13

## Tasks

- [x] immutable digestのPostgres imageを指定
- [x] migrationを本番と同じ経路で適用
- [x] transaction、locking、unique constraint、timezoneを検証
- [x] in-memory repositoryと同じcontract suiteを実行
- [x] container readinessとcleanupを検証

## Acceptance criteria

- [x] Docker-compatible runtimeのclean CIでgreen
- [x] container unavailable時はsilent skipせず明示failure

---

<!-- SOURCE: issues/15-api-schema-and-property.md -->

# test(api): OpenAPI schema/property/stateful testを追加する
<!-- labels: api-testing,openapi,property-testing -->

## Tasks

- [x] OpenAPI 3.1をimplementationと同期
- [x] Schemathesisでpositive/negative generation
- [x] stateful POST→GET→DELETE chainを追加
- [x] deterministic seedとfailure corpusを保存
- [x] Dredd/Prism/Hurl/Pactum/Karateの役割差を比較

## Acceptance criteria

- [x] undocumented 5xx、schema mismatch、unexpected fieldを検出

---

<!-- SOURCE: issues/16-consumer-driven-contract.md -->

# test(contract): Pact consumer/provider verificationを実装する
<!-- labels: contract-testing,pact,microservices -->

## Tasks

- [x] consumer client unit testからPactを生成
- [x] minimal matching ruleを使用
- [x] provider stateを明示
- [x] provider verificationをCIへ追加
- [x] pending/WIP pactとcan-i-deploy policyを設計
- [x] OpenAPI conformanceとの重複/差分を記録

## Acceptance criteria

- [x] breaking provider changeでprovider verificationがfail
- [x] irrelevant provider field追加ではconsumer testが壊れない

---

<!-- SOURCE: issues/17-ui-component-storybook.md -->

# test(ui): Storybook/Vitest browser component testを追加する
<!-- labels: ui-testing,storybook,accessibility -->

## Tasks

- [x] storyをstate/variant matrixとして作成
- [x] Vitest addon browser modeでinteraction test
- [x] Testing Libraryのrole/name queryを使用
- [x] accessibility addonをCI gateへ追加
- [x] deprecated Storybook test-runnerからの移行要否を確認

## Acceptance criteria

- [x] component testがreal browserでgreen
- [x] DOM class/component instanceへの不必要なcouplingがない

---

<!-- SOURCE: issues/18-playwright-critical-e2e.md -->

# test(e2e): Playwright critical journeysを完成する
<!-- labels: e2e,playwright,browser-testing,priority-high -->

## Tasks

- [x] checkout success/failureの2 journeyを追加
- [x] Chromium/Firefox/WebKit matrix
- [x] per-test contextとtest data isolation
- [x] trace/video/screenshotをfailure時だけ保存
- [x] sleepを除去しweb-first assertionを使用
- [x] retry前failureをflake metricへ送る

## Acceptance criteria

- [x] 100回shard実行でflake 0
- [x] 下位層で検出できる重複assertionを削除

---

<!-- SOURCE: issues/19-mobile-desktop-game-matrix.md -->

# test(app): mobile/desktop/game/device matrixを設計する
<!-- labels: mobile-testing,ui-testing,needs-hardware -->

## Tasks

- [x] Appium 3、Detox、XCUITest/EarlGrey、Espresso、Airtest/Pocoをsurface別比較
- [x] simulator/emulator/real device/HILの責務を定義
- [x] OS/device/input/network matrixをrisk-basedで削減
- [x] device farm artifact、video、device logを保存
- [x] React NativeはDetox/Cavy、Flutterはintegration_test候補を評価

## Acceptance criteria

- [x] WebDriver/emulation/gray-box/image recognitionを区別
- [x] hardware必須testにownerと予約手順がある

---

<!-- SOURCE: issues/20-property-fuzz-metamorphic.md -->

# test: property/fuzz/metamorphic/differential suiteを追加する
<!-- labels: property-testing,fuzzing,research -->

## Tasks

- [x] domain invariantを5件定義
- [x] generator distributionとshrinkerをreview
- [x] parser/APIへcoverage-guided fuzz
- [x] oracleが難しい機能へmetamorphic relation
- [x] 旧版/別実装とのdifferential test
- [x] seeds/counterexamplesをregression corpusへ保存

## Acceptance criteria

- [x] example testでは見つからない1 defectを発見またはsynthetic defectで実証

---

<!-- SOURCE: issues/21-mutation-by-risk.md -->

# test: risk-based mutation testingを全言語へ導入する
<!-- labels: mutation-testing,quality,ci -->

## Tasks

- [x] PIT/Stryker/Infection/cargo-mutants/Python toolをspike
- [x] billing/auth/data-loss codeを優先
- [x] changed-file laneとscheduled full laneを分離
- [x] survived/equivalent/low-value分類を記録
- [x] scoreではなくreview action rateを測る

## Acceptance criteria

- [x] PR runtime budget内
- [x] survived high-risk mutantに明示decisionがある

---

<!-- SOURCE: issues/22-performance-capacity.md -->

# test(perf): benchmark/load/stress/spike/soak/capacityを分離する
<!-- labels: performance-testing,load-testing,needs-infrastructure -->

## Tasks

- [x] SLOとworkload modelを定義
- [x] microbenchmarkとsystem loadを別suite化
- [x] k6/JMeter/Gatling候補を比較
- [x] coordinated omission、warm-up、client bottleneckを確認
- [x] p50/p95/p99、error rate、saturationを保存
- [x] soakでleak/queue buildupを検証

## Acceptance criteria

- [x] functional E2E timingを性能根拠に使わない
- [x] capacity limitとdegradation behaviorがdocument化

---

<!-- SOURCE: issues/23-security-testing.md -->

# test(sec): security verification portfolioを実装する
<!-- labels: security,testing,devsecops -->

## Tasks

- [x] SAST/SCA/secret/IaC scan
- [x] authn/authz/tenant isolationのnegative test
- [x] API fuzz/DASTをtest environmentへ実行
- [x] rate limit/abuse caseを追加
- [x] SBOM/provenance/signature verification
- [x] OWASP ASVS/WSTG requirementへtrace

## Acceptance criteria

- [x] security findingのowner/SLA/suppression期限がある
- [x] production secret/PIIをfixtureへ含めない

---

<!-- SOURCE: issues/24-resilience-deterministic-simulation.md -->

# test(resilience): fault injection/chaos/deterministic simulationを設計する
<!-- labels: resilience,chaos-engineering,distributed-systems -->

## Tasks

- [x] clock/network/disk/random/scheduler seamを棚卸し
- [x] retry/backoff/circuit breaker/idempotency test
- [x] deterministic seedでdelay/failure scheduleを再現
- [x] steady state、blast radius、abort conditionを定義
- [x] Chaos Monkey/Kubernetes chaos候補をcontrolled環境で評価
- [x] simulationとreal environmentのsemantic gapを検証

## Acceptance criteria

- [x] failureをseedから再現可能
- [x] chaos experimentが安全にabort/rollback可能

---

<!-- SOURCE: issues/25-data-ml-llm-agent-evals.md -->

# test(ai/data): data、ML、LLM、agent evaluationを実装する
<!-- labels: data-quality,ml-testing,llm-evals -->

## Tasks

- [x] schema/null/range/unique/reconciliation test
- [x] late/duplicate/out-of-order dataとidempotency
- [x] model slice/robustness/drift/fairness test
- [x] RAG retrieval recallとgroundedness dataset
- [x] prompt/agent tool contractとstate transition test
- [x] LLM-as-judgeをhuman sampleでcalibrate
- [x] model/prompt/dataset/version provenanceを保存

## Acceptance criteria

- [x] aggregate scoreだけでなくcritical slice failureをgate
- [x] nondeterminismをdistribution/seed/repeatで評価

---

<!-- SOURCE: issues/26-flake-detection-and-test-selection.md -->

# ci: systemic flakiness分析とsafe test selectionを導入する
<!-- labels: ci,flaky-tests,test-selection,priority-high -->

## Tasks

- [x] first-attempt failureを保存しretry後greenと分離
- [x] co-failureをworker/host/fixture/serviceでcluster化
- [x] random orderとseed保存
- [x] quarantine owner/expiry/原因分類
- [x] dependency-based affected testsを先に導入
- [x] predictive selectionはperiodic full runとmiss metricを併用

## Acceptance criteria

- [x] flake rate、diagnosis time、selection missをdashboard化
- [x] retryでrequired checkを常時greenに見せない

---

<!-- SOURCE: issues/27-atdd-bdd-specification-by-example.md -->

# product-test: ATDD/BDD/Specification by Exampleを導入する
<!-- labels: atdd,bdd,acceptance-testing,product -->

## Tasks

- [x] example mappingでrule/example/questionを整理
- [x] UI手順でなくbusiness behaviorをGherkin化
- [x] Cucumber/Gauge/Concordion等の実行層を比較
- [x] acceptance criteriaとlower-level testsをtrace
- [x] duplicate scenarioとslow step definitionを削減

## Acceptance criteria

- [ ] product/QA/engineerが同じexampleをreview
- [x] feature fileがimplementation detailに依存しない

---

<!-- SOURCE: issues/28-production-continuous-verification.md -->

# ops: canary/shadow/synthetic/runtime invariantを実装する
<!-- labels: continuous-testing,observability,sre -->

## Tasks

- [x] synthetic accountとidempotent cleanup
- [x] canary metric/abort/rollback
- [x] sanitized shadow traffic
- [x] runtime business invariantとSLO alert
- [x] OpenTelemetry traceでcritical flowを検証
- [x] feature flag cohort/kill switchをtest

## Acceptance criteria

- [ ] production verificationのblast radius/privacyをreview
- [x] pre-deploy testをproduction monitoringで置換しない

---

<!-- SOURCE: issues/29-reproduce-key-papers.md -->

# research: 主要論文の主張を小規模に再現する
<!-- labels: research,experiment,documentation -->

## Tasks

- [x] coverageとmutation effectivenessの相関をsample moduleで測る
- [x] property-based testingのgenerator/shrinker差を比較
- [x] flaky co-failure clusterをsynthetic datasetで再現
- [x] deterministic simulationのseed reproductionをprototype
- [ ] LLM生成testをcoverage/mutation/smell/flakeで評価

## Acceptance criteria

- [x] claim、context、evidence、threats、resultをtemplateで記録
- [x] 再現できない結果もnegative resultとして保存

---

<!-- SOURCE: issues/30-framework-selection-spike.md -->

# decision: framework/tool選定spikeとADRを完了する
<!-- labels: decision,architecture,testing-tools -->

## Tasks

- [x] target layerとfailure typeを定義
- [x] async/failure/parameterized/parallel/diagnosticの共通5caseを実装
- [x] maintenance/security/runtime compatibilityを確認
- [ ] team diagnosis timeを計測
- [x] migration/exit strategyを記録

## Acceptance criteria

- [x] star数や更新日だけで選ばない
- [x] runner/framework/assertion/double/toolを誤分類しない

---

<!-- SOURCE: issues/31-infrastructure-cloud-native-testing.md -->

# test(infra): IaC/Kubernetes/cloud emulator/upgrade testを実装する
<!-- labels: infrastructure,kubernetes,cloud-testing -->

## Tasks

- [ ] IaC syntax/policy/plan test
- [ ] LocalStack/Azurite等emulatorとreal cloud smokeを分離
- [ ] Kubernetes manifest admission/policy/ephemeral namespace
- [ ] Kuberhealthy等synthetic checkを評価
- [ ] install/upgrade/rollback/backup/restore test
- [ ] cloud quota/cost/cleanup guardrail

## Acceptance criteria

- [ ] emulatorとreal serviceのgapをdocument化
- [ ] leaked resourceを検知/cleanupできる


---

<!-- SOURCE: issues/32-visual-a11y-i18n-compatibility.md -->

# test(ui-quality): visual/accessibility/i18n/compatibilityを実装する
<!-- labels: ui-testing,accessibility,i18n,visual-regression -->

## Tasks

- [ ] reviewed visual baselineとthreshold
- [ ] font/OS/DPI/color modeを固定
- [ ] axe自動検査 + keyboard/screen-reader manual checklist
- [ ] locale/timezone/RTL/long text/pseudo-localization
- [ ] browser/device/assistive technology matrix
- [ ] WPT/standards conformanceが該当する箇所を確認

## Acceptance criteria

- [ ] snapshot一括更新を禁止
- [ ] 自動a11y greenを完全準拠と表現しない


---

<!-- SOURCE: issues/33-exploratory-manual-usability.md -->

# test(manual): exploratory/manual/usability testをportfolioへ統合する
<!-- labels: exploratory-testing,manual-testing,ux -->

## Tasks

- [ ] risk-based test charter
- [ ] session notes、evidence、bug taxonomy
- [ ] automated testでは見えないUX/ambiguityを探索
- [ ] real user usability sessionとsuccess criteria
- [ ] discovered regressionを適切な自動層へ戻す

## Acceptance criteria

- [ ] manual testingを「自動化できなかった残り」と定義しない
- [ ] learningがbacklog/testへ反映される


---

<!-- SOURCE: issues/34-final-audit-and-release.md -->

# release: 教材・code・Nix・論文・Issueの最終auditを完了する
<!-- labels: release,documentation,quality,priority-high -->

## Depends on

- #01
- #05
- #06
- #07
- #08
- #09
- #10
- #11
- #12
- #13

## Tasks

- [ ] `STRICT=1 ./scripts/test-all.sh`
- [ ] link/version/date audit
- [ ] all source code format/lint/test
- [ ] issue dry-run count/title/label audit
- [ ] licenses、third-party notices、secret scan
- [ ] ZIP manifest/checksum/reproducibility note
- [ ] READMEのcommandをclean environmentで実行

## Acceptance criteria

- [ ] `VALIDATION.md`にpass/skip/failを正直に記録
- [ ] known limitationにowner/follow-up Issueがある


---

<!-- SOURCE: issues/35-oracle-quality-review.md -->

# quality: Test oracleの強さと独立性を監査する
<!-- labels: testing,quality,oracle,priority-high -->

## Tasks

- [x] critical testごとにoracle種別とprotected failureを記録
- [x] production codeと同じalgorithmを期待値計算に使うtestを検出
- [x] assertionなし、常にtrue、過剰snapshotを検出
- [x] false positive/negativeの代表例をmutationで確認

## Acceptance criteria

- [x] critical riskに独立したoracleがある
- [x] passしても保証しないことを各suiteに記載

---

<!-- SOURCE: issues/36-model-based-state-machine.md -->

# advanced: 注文状態をmodel-based testingで検証する
<!-- labels: testing,model-based,property-based -->

## Tasks

- [ ] orderのstate/command/precondition/postconditionをmodel化
- [ ] valid/invalid command sequenceを生成
- [ ] failure seedと最小sequenceを保存
- [ ] duplicate、cancel、refund、retryを追加

## Acceptance criteria

- [ ] 少なくとも1件の手書きexampleでは見逃すmutationをkill
- [ ] 失敗を同じseedで再現可能


---

<!-- SOURCE: issues/37-combinatorial-configuration.md -->

# advanced: 設定・環境のpairwise組合せtestを設計する
<!-- labels: testing,combinatorial,configuration -->

## Tasks

- [ ] browser、locale、auth、payment、feature flagの因子/値を列挙
- [ ] invalid constraintを定義
- [ ] pairwise suiteとfull matrix costを比較
- [ ] past incident combinationを必須caseに固定

## Acceptance criteria

- [ ] coverage criterionと除外理由が説明可能
- [ ] matrixを再生成できる


---

<!-- SOURCE: issues/38-concurrency-race-liveness.md -->

# concurrency: Race・deadlock・lost updateを検証する
<!-- labels: testing,concurrency,priority-high -->

## Tasks

- [ ] shared resourceとcritical sectionをinventory
- [ ] parallel duplicate checkoutをbarrier同期で再現
- [ ] race detector/sanitizerをCIへ追加
- [ ] liveness deadlineとgoroutine/thread/task leakを検査

## Acceptance criteria

- [ ] sequential testでは見えない失敗を再現
- [ ] random sleepに依存せずfailure evidenceを保存


---

<!-- SOURCE: issues/39-messaging-delivery-semantics.md -->

# integration: Messagingの重複・順序・redeliveryを検証する
<!-- labels: integration-testing,messaging,resilience -->

## Tasks

- [ ] real brokerでpublish/consumeを確認
- [ ] duplicate、out-of-order、late、poison messageを注入
- [ ] consumer crashとredeliveryを再現
- [ ] schema evolution、DLQ、correlationを確認

## Acceptance criteria

- [ ] at-least-once下でbusiness side effectがidempotent
- [ ] eventual assertionにdeadlineとdiagnosticsがある


---

<!-- SOURCE: issues/40-migration-backup-dr.md -->

# operations: Migration・backup/restore・DRを実地検証する
<!-- labels: testing,database,disaster-recovery,needs-environment -->

## Tasks

- [ ] production-like old dataからmigration
- [ ] rollback/roll-forward strategyを検証
- [ ] backupを空環境へrestoreしreconciliation
- [ ] region/service loss game dayでRTO/RPO測定

## Acceptance criteria

- [ ] documentだけでなく実行artifactがある
- [ ] data invariant、RTO、RPOを満たす


---

<!-- SOURCE: issues/41-cli-filesystem-protocol.md -->

# integration: CLI・filesystem・process protocolを検証する
<!-- labels: integration-testing,cli,filesystem -->

## Tasks

- [ ] exit code、stdout、stderr、signalをcontract化
- [ ] permission、disk full、partial write、atomic renameを注入
- [ ] path space/Unicode/long pathを確認
- [ ] child process timeoutとcleanupを確認

## Acceptance criteria

- [ ] temp directory/processをtestごとに隔離
- [ ] OS固有差とmatrixを文書化


---

<!-- SOURCE: issues/42-observability-as-behavior.md -->

# observability: Log・metric・trace・alertをbehaviorとしてtestする
<!-- labels: testing,observability,operations -->

## Tasks

- [x] critical journeyのcorrelation ID propagationを検証
- [x] metric label/cardinalityとSLO queryを確認
- [x] failure logのactionabilityとredactionを検証
- [x] synthetic incidentでalert route/runbookを確認

## Acceptance criteria

- [x] incidentをartifactだけでtriage可能
- [x] secret/PIIをtelemetryへ出さないtestがある

---

<!-- SOURCE: issues/43-test-data-privacy.md -->

# data: Test data factory・隔離・privacyを整備する
<!-- labels: testing,test-data,privacy,security -->

## Tasks

- [ ] minimal factoryとmeaningful defaultsを作成
- [ ] unique namespace/tenantとcleanupを実装
- [ ] production data利用の禁止/匿名化policyを定義
- [ ] clock、random seed、localeをrecord

## Acceptance criteria

- [ ] parallel実行でcollisionしない
- [ ] artifactにPII/secretが残らない


---

<!-- SOURCE: issues/44-snapshot-visual-governance.md -->

# ui: Snapshot・golden・visual差分の承認運用を作る
<!-- labels: testing,snapshot,visual-testing,ui -->

## Tasks

- [ ] semantic assertionで置換できるsnapshotを整理
- [ ] font/time/animation/viewportを固定
- [ ] baseline updateにreviewerと理由を要求
- [ ] perceptual thresholdとmask領域を監査

## Acceptance criteria

- [ ] bulk updateだけで重要差分を承認できない
- [ ] failure artifactから意味のある差を判断可能


---

<!-- SOURCE: issues/45-accessibility-manual-exploratory.md -->

# quality: Accessibility・manual・exploratory test charterを実施する
<!-- labels: testing,accessibility,exploratory-testing,manual-testing -->

## Tasks

- [ ] automated axe/semantic checks
- [ ] keyboard、screen reader、zoom/contrastをmanual確認
- [ ] high-risk journeyのexploratory charterを作成
- [ ] observation、evidence、follow-upを記録

## Acceptance criteria

- [ ] automated checkの限界を明記
- [ ] 発見を再現testまたはproduct decisionへ変換


---

<!-- SOURCE: issues/46-performance-methodology.md -->

# performance: Coordinated omissionを避けたSLO testを構築する
<!-- labels: performance-testing,reliability,priority-high -->

## Tasks

- [x] workload modelとarrival processを定義
- [x] latency histogram、p95/p99、error、throughputを測定
- [x] load/stress/spike/soakを分離
- [x] response correctnessとresource saturationを同時観測

## Acceptance criteria

- [x] test environment/baseline/confidenceを保存
- [x] coordinated omissionとwarm-upを説明可能

---

<!-- SOURCE: issues/47-security-abuse-cases.md -->

# security: Threat modelからabuse-case testを実装する
<!-- labels: security,testing,priority-high -->

## Tasks

- [x] asset/trust boundary/attacker capabilityをmodel化
- [x] authorization、injection、replay、rate abuseをtest
- [x] SAST/SCA/DAST findingをriskでtriage
- [x] secret/log/artifact leakをtest

## Acceptance criteria

- [x] scanner件数ではなくexploit impactとmitigationを記録
- [x] critical abuse caseをCI/release gateへ接続

---

<!-- SOURCE: issues/48-agent-evaluation-sandbox.md -->

# ai: LLM/Agentをtool sandboxとversioned evalで検証する
<!-- labels: ai,testing,evaluation,security -->

## Tasks

- [x] deterministic parser/tool-schema tests
- [x] golden dataset、rubric、slice、adversarial casesをversion化
- [x] tool emulatorでfailure/timeout/permissionを注入
- [x] trajectory、final outcome、cost、latencyを分離評価
- [x] judgeをhuman sampleでcalibrate

## Acceptance criteria

- [x] prompt injectionで権限外tool/actionが起きない
- [x] model/prompt/tool/data versionを再現可能

---

<!-- SOURCE: issues/49-framework-internals-spike.md -->

# framework: Discovery・fixture・parallel・reporterの内部を比較する
<!-- labels: testing-framework,architecture,experiment -->

## Tasks

- [x] 候補runnerで同じ5 testを実装
- [x] discovery、lifecycle、isolation、parallel schedulingを調査
- [x] intentional failureのdiff/stack/artifactを比較
- [x] IDE/CI/XML/plugin/upgradeを評価

## Acceptance criteria

- [x] syntaxの好み以外のdecision recordがある
- [x] lock-inとmigration costを明記

---

<!-- SOURCE: issues/50-literature-reproduction-v2.md -->

# research: 研究主張を同一budget・oracleで再現する
<!-- labels: research,testing,experiment -->

## Tasks

- [x] coverage vs mutationの小実験
- [x] generated vs human testをmutation/defect/maintenanceで比較
- [x] flaky detectionとselectionのmissを測定
- [x] peer-reviewedとpreprintを区別
- [x] `templates/research-reproduction.md`で記録

## Acceptance criteria

- [x] positive/negative resultの両方を保存
- [x] 自社contextへのexternal validityを議論

---

<!-- SOURCE: issues/51-notebooklm-knowledge-base.md -->

# notebooklm: ハンドブックを観点別knowledge baseとして運用する
<!-- labels: documentation,learning,ai -->

## Tasks

- [ ] `./scripts/build-notebooklm.sh` でバンドルを再生成し、diffをreviewする
- [ ] NotebookLMに6バンドルを取り込み、ノートブックを作成する
- [ ] 日本語のAudio Overviewを観点1〜3で生成し、内容の誤りを1件以上探す
- [ ] 観点横断の質問を10個投げ、回答と引用元チャンクの対応を確認する
- [ ] docs更新時にバンドル再生成を忘れないよう、手順をREADMEかCIに記録する

## Acceptance criteria

- [ ] 6バンドルすべてが最新のdocs/issuesから再生成されている
- [ ] NotebookLMの回答がソース引用付きで7観点の質問に答えられる
- [ ] ハルシネーションを見つけた場合、元docの記述改善としてfeedbackされている
