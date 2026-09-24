# .NET 10: NUnit 4、MSTest 4、MTP、VSTest

同じCheckout behaviorをNUnitとMSTestで表現し、test framework、adapter、test platformを独立に比較するlabです。既定runnerには[ADR-0002](../../docs/adr/0002-adopt-microsoft-testing-platform.md)でMicrosoft.Testing.Platform（MTP）を採用し、VSTestは移行互換matrixとして残します。

## 実行

```bash
# Nixを使う場合
nix develop .#dotnet
cd labs/dotnet

# 既定のMTP suite
dotnet restore tests/NUnitTests/NUnitTests.csproj --locked-mode
dotnet restore tests/MSTestTests/MSTestTests.csproj --locked-mode
dotnet test --project tests/NUnitTests/NUnitTests.csproj
dotnet test --project tests/MSTestTests/MSTestTests.csproj

# NUnit/MSTest × MTP/VSTestと4つのTRX
./scripts/verify-runner-matrix.sh

# 意図的な1 failureずつを実行し、diagnostic contractを検証
./scripts/verify-failure-diagnostics.sh
```

生成reportとfailureのraw outputは`build/`配下に置き、commitしません。

## 検証済みversion matrix

2026-07-19に.NET SDK 10.0.301、`net10.0`、Linux x64で次を実行しました。すべてのNuGet graphは`packages.lock.json`で固定しています。

| Framework | Framework version | Adapter / host | Platform | Project form | Result |
|---|---:|---|---|---|---:|
| NUnit | 4.6.0 | NUnit3TestAdapter 6.2.0 | MTP 2.1.0 | executable test application | 6/6 |
| MSTest | 4.3.0 | MSTest.TestAdapter 4.3.0 | MTP 2.3.1 | `MSTest.Sdk/4.3.0` application | 9/9 |
| NUnit | 4.6.0 | NUnit3TestAdapter 6.2.0 + Microsoft.NET.Test.Sdk 18.7.0 | VSTest | test library | 6/6 |
| MSTest | 4.3.0 | MSTest.TestAdapter 4.3.0 + Microsoft.NET.Test.Sdk 18.7.0 | VSTest | test library | 9/9 |

NUnitとMSTestでcase数が違うのは、MSTest側に既存の`CartItem` 4 casesも含むためです。Checkoutの成功、重要interaction、事前cancel、非同期payment failureは両方にあります。cancelと非同期failureはいずれも例外type/messageだけでなく、失敗後にorderが保存されないことをoracleにします。

VSTest projectsはframeworkごとのMTP test sourceを`Compile Include`で共有します。test sourceの複製ではなく、platform用project wiringだけを比較しています。

## MTPとVSTestの起動・report差

| 観点 | MTP | VSTest |
|---|---|---|
| 選択 | `global.json`の`test.runner = Microsoft.Testing.Platform` | `vstest/global.json`の`test.runner = VSTest` |
| 起動 | `dotnet test --project <csproj>` | `dotnet test <csproj>` |
| artifact | runnerを組み込んだ`Exe` | adapterが発見するtest `Library` |
| TRX | `--report-trx --report-trx-filename <name>` extension | `--logger "trx;LogFileName=<name>"` |
| minimum case gate | `--minimum-expected-tests`をplatformが提供 | TRXの`Counters`をscriptが検証 |
| configuration | MTP extensionごとのoption | `.runsettings`とVSTest option |

.NET 10 SDKとMTP v2では、MTP applicationをVSTest modeの`dotnet test`へ渡す経路はsupportされません。そのためmatrixはMTP projectを誤ったrunnerで起動せず、同じsourceを読むVSTest専用projectで互換性を確認します。`verify-runner-matrix.sh`は4 reportの`total/executed/passed/failed`も検証するため、「commandがexit 0だがtest未発見」をgreenにしません。

## Assertion failureの比較

`IntentionalFailureTests.cs`は通常buildから除外し、comparison scriptだけが`IntentionalFailures=true`でcompileします。どちらも`999`を期待して実値`600`で失敗させた結果です。

| Framework | Failure signature | 読み取り |
|---|---|---|
| NUnit constraint | `Assert.That(subtotal, Is.EqualTo(999))`、`Expected: 999`、`But was: 600` | constraint式とexpected/actualが近接し、複合constraintへ拡張しやすい |
| MSTest assertion | `Assertion failed. Expected values to be equal.`、`expected: 999`、`actual: 600`、`Assert.AreEqual(999, subtotal)` | assertion methodとmessage、expected/actualを直線的に表示する |

scriptはfailure exit、test名、custom message、expected/actual、総test数、failure数を検査します。意図的failureを通常suiteへ混入させないため、終了時に通常buildへ戻します。

## xUnit.net v3 spike候補

xUnit.net v3はMTP runnerをtest applicationへ組み込めるため、次のframework比較候補にします。ただし、このIssueでは採用も依存追加もしません。spikeでは同じCheckout、cancel、async failure、intentional diagnosticを移植し、次を満たした場合だけmatrixへ追加します。

1. `.NET 10`とMTP v2でlocked restoreと全caseがgreen
2. NUnit/MSTestと同じfailure/no-save oracleを維持
3. TRX、filter、IDE discovery、VSTest移行要否を記録
4. native xUnit CLIと`UseMicrosoftTestingPlatformRunner`のoption/report差を比較
5. 追加platform laneの保守costに見合う固有価値をADRで説明

## Primary references

- [.NET: Testing with `dotnet test`](https://learn.microsoft.com/dotnet/core/testing/unit-testing-with-dotnet-test)
- [.NET: MTP v1からv2への移行](https://learn.microsoft.com/dotnet/core/testing/microsoft-testing-platform-migration-from-v1-to-v2)
- [.NET: MSTest SDK configuration](https://learn.microsoft.com/dotnet/core/testing/unit-testing-mstest-sdk)
- [NUnit and Microsoft.Testing.Platform](https://docs.nunit.org/articles/vs-test-adapter/NUnit-And-Microsoft-Test-Platform.html)
- [xUnit.net v3 Microsoft Testing Platform](https://xunit.net/docs/getting-started/v3/microsoft-testing-platform)

## Passしても保証しないこと

- NUnit/MSTestとMTP/VSTestの組合せで同じbehaviorが通ることは、他runner（xUnit.net）やIDE adapterでの挙動を保証しません。
- payment/repositoryはfakeで、実DBのtransactionやtimeoutは検証していません。
- Windows laneはpath/SDK差分の確認で、全OSでの同一性は示しません。
