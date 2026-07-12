# Nix setup

## 目的

`flake.nix` はlanguage toolchainとtest toolを同じshellへ揃えます。package managerのlockfileは各ecosystemのdependency graph、NixはOS/toolchain dependencyを担当します。

## Linux／macOS

公式installerまたは組織で承認されたinstallerを使い、flakesを有効にします。導入後:

```bash
nix --version
nix develop
./scripts/bootstrap.sh
./scripts/test-all.sh
```

`nix develop` は初回にnixpkgs inputをlockし得ます。生成された`flake.lock`をreviewしてcommitしてください。

## Windows

NixはWindows nativeの主要workflowではありません。次のどちらかです。

1. WSL2内でNixを使う
2. Windows nativeは各SDK、CI/LinuxはNixで検証する

C#やnative UIのWindows固有testはNix shellの対象外です。Nixで共通unit testを実行し、Windows runnerでOS固有testを追加します。

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

したがって、flake.lockとlanguage lockfileの両方をcommitし、CIでclean bootstrapを定期検証します。

