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

bootstrapはnpmの`npm ci`、uvの`sync --frozen`、Gradle dependency locking、NuGet locked restore、Cargo `--locked`、Composer installを使います。Playwrightはlockされたnpm package自身からChromiumを取得し、versionとrevisionを検証します。`STRICT=1`ではtoolchain不足をskipせず失敗にします。

## Lock inventory

| 対象 | 固定するfile／方法 | CIでの強制 |
|---|---|---|
| Nix/toolchain | `flake.lock` | `nix flake check --all-systems --no-build` |
| Node/Mocha/AVA | `labs/node/package-lock.json` | `npm ci` |
| Node advanced | `labs/advanced/package-lock.json` | `npm ci` |
| Pact/Storybook/Vitest/Playwright/system | `labs/system/package-lock.json` | `npm ci` + Pact 17.0.1 provider verification + Storybook 10.5.2/Vitest 4.1.10 browser test + `verify:browser-lock` |
| OpenAPI/Schemathesis | `labs/system/api-tests/uv.lock` | NixのPython 3.13/uv + `uv sync --frozen`、Schemathesis 4.23.0 |
| JVM | `labs/java/gradle.lockfile` | Gradle dependency locking |
| .NET | 各projectの`packages.lock.json` + `global.json` | `dotnet restore --locked-mode` |
| Rust | `labs/rust/Cargo.lock`、Nixのcargo-mutants | `cargo fetch/test --locked`、targeted mutation |
| PHP | `labs/php/composer.lock`、PHPUnit 12.5.31 PHARのSHA-256 | `composer install`、12.5→13 migration、PCOV mutation |
| C++ fallback | Catch2/Trompeloeil releaseの40桁commit SHA | CMake `FetchContent` |
| Go | `labs/go/go.mod` + `go.sum`、mockgen tool directive | `go mod download`、`-mod=readonly`、generated mock drift check |
| Python/Postgres | dependencyはNix、containerはdigestで固定 | pytest、Hypothesis、Psycopg 3.3.4、Testcontainers 4.14.2、Docker CLIをNixから供給し、Postgres/Ryuk image pinを検査 |

`scripts/check-lockfiles.sh`はmanifestに対応するlockの欠落、Goのmockgen tool pin、CMake fallbackのmutable tag、Python integration dependencyとcontainer image digest、Schemathesis/Pact/Storybook/Vitest/Viteのexact pin、deprecated Storybook test-runnerの再導入、Nixのuvの欠落を検出します。

## CI matrix

[`.github/workflows/reproducibility.yml`](../../.github/workflows/reproducibility.yml)は次を実行します。

- `ubuntu-24.04`で`x86_64-linux`
- `macos-14`で`aarch64-darwin`
- `windows-2025`でWindows固有の.NET lane
- `ubuntu-24.04`のclean Docker daemonでreal Postgres integration

GitHubのstandard `macos-14`はApple Silicon arm64 runnerです。runner labelのarchitectureは[GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)を正とし、job内でも`builtins.currentSystem`を照合します。

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
復元します。bootstrapが取得・照合するPlaywright ChromiumをVitest browser
providerでも使うため、system browserやglobal packageは不要です。

```bash
nix develop .#node --command make test-system-storybook
```

このtargetは5-storyのstate matrix、role/name interaction、addon-a11yを
headless Chromiumで実行します。Storybookのproduction bundleも確認するときは
同じshellで`npm --prefix labs/system run build-storybook`を実行します。

## Playwright browserの固定

`@playwright/test`、`playwright`、`playwright-core`は`package-lock.json`で同じversionへ固定します。

```bash
cd labs/system
npm ci
npm exec -- playwright install chromium
npm run verify:browser-lock
```

`verify:browser-lock`は3 packageのversion、`playwright-core/browsers.json`のChromium revision、download済み実行binaryを照合します。別versionのNix browser packageやsystem browserへ暗黙fallbackしません。

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

Playwrightを更新した場合はbrowserも再取得して`verify:browser-lock`を実行します。CMake fallbackを更新するときはrelease tagではなく、そのtagが指す40桁commit SHAを記録します。

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
- browser binaryを別downloadするtool
- Docker image tagがmutableな場合
- timezone/locale/CPU scheduling
- npm/Maven/NuGet/Composer/Cargo dependency（各lockfileで固定）

したがって、lockfileに加えてremote service、container digest、timezone、locale、architectureをtest design cardへ記録します。このrepositoryのPostgres labはimage digestとUTCを明示し、Docker daemon自体はhost側の前提として起動時に検査します。
