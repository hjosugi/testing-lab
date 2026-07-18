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

bootstrapはnpmの`npm ci`、Gradle dependency locking、NuGet locked restore、Cargo `--locked`、Composer installを使います。Playwrightはlockされたnpm package自身からChromiumを取得し、versionとrevisionを検証します。`STRICT=1`ではtoolchain不足をskipせず失敗にします。

## Lock inventory

| 対象 | 固定するfile／方法 | CIでの強制 |
|---|---|---|
| Nix/toolchain | `flake.lock` | `nix flake check --all-systems --no-build` |
| Node/Mocha/AVA | `labs/node/package-lock.json` | `npm ci` |
| Node advanced | `labs/advanced/package-lock.json` | `npm ci` |
| Playwright/system | `labs/system/package-lock.json` | `npm ci` + `verify:browser-lock` |
| JVM | `labs/java/gradle.lockfile` | Gradle dependency locking |
| .NET | 各projectの`packages.lock.json` + `global.json` | `dotnet restore --locked-mode` |
| Rust | `labs/rust/Cargo.lock` | `cargo fetch --locked` |
| PHP | `labs/php/composer.lock` | `composer install` |
| C++ fallback | Catch2/Trompeloeil releaseの40桁commit SHA | CMake `FetchContent` |
| Go | standard libraryのみのため`go.mod`のみ | `go test`。dependency追加時は`go.sum`もcommit |
| Python | test dependencyはNix側で固定 | pinned nixpkgsからpytest、pytest-cov、pytest-xdist、Hypothesisを供給 |

`scripts/check-lockfiles.sh`はmanifestに対応するlockの欠落と、CMake fallbackのmutable tagを検出します。

## CI matrix

[`.github/workflows/reproducibility.yml`](../../.github/workflows/reproducibility.yml)は次を実行します。

- `ubuntu-24.04`で`x86_64-linux`
- `macos-14`で`aarch64-darwin`
- `windows-2025`でWindows固有の.NET lane

GitHubのstandard `macos-14`はApple Silicon arm64 runnerです。runner labelのarchitectureは[GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)を正とし、job内でも`builtins.currentSystem`を照合します。

Linux/macOS laneはflake全systemの評価、lockだけを使うbootstrap、`STRICT=1 ./scripts/test-all.sh`、生成差分0をgateにします。Windows laneはNixの代替ではなく、path、filesystem、native SDKなどWindowsでしか検出できないriskを担当します。

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

したがって、lockfileに加えてremote service、container digest、timezone、locale、architectureをtest design cardへ記録します。
