# ADR-0002: .NET 10 testの既定platformにMTPを採用する

- Status: Accepted
- Date: 2026-07-19
- Decision owners: repository maintainers
- Applies to: `.NET 10` test project、local CLI、CI report、runner migration

## Context

.NETのtest framework（NUnit、MSTest、xUnit.net）と、testを発見・実行・reportするplatform（Microsoft.Testing.Platform、VSTest）は別の選択です。frameworkだけを指定すると、CLI option、artifact form、extension、report、IDE/CI integrationの責任が曖昧になります。

.NET 10 SDKは`global.json`で`dotnet test`のrunnerを選択できます。MTP v2 test applicationは.NET 10のVSTest modeから起動する互換経路を持たないため、暗黙のfallbackに依存できません。NUnit 4.6.0 / adapter 6.2.0とMSTest 4.3.0を両platformで実測し、同じtest sourceがMTPとVSTestでgreenになること、TRXのcase countersが一致することを確認しました。

## Decision

`.NET 10` labの既定test platformとしてMicrosoft.Testing.Platformを採用します。

1. `labs/dotnet/global.json`でSDK 10.0.301と`Microsoft.Testing.Platform` runnerを固定する
2. MTP projectはexecutable test applicationとして構成し、`dotnet test --project`で起動する
3. NUnitとMSTestのplatform/adapter versionは各`packages.lock.json`で固定する
4. CI reportはMTPのTRX extensionで生成し、test数とfailure数を検査する
5. VSTestは既定runnerにせず、同じsourceを読むlibrary projectによる互換matrixとして維持する
6. MTP projectとVSTest projectを同じsolution invocationへ混在させない
7. runner変更時はsuccessだけでなく、cancel、async failure、intentional failure diagnosticを再検証する

## Evidence

| Framework | MTP | VSTest compatibility | Shared behavior |
|---|---:|---:|---|
| NUnit 4.6.0 / adapter 6.2.0 | 6/6、MTP 2.1.0 | 6/6、Test SDK 18.7.0 | success、interaction、cancel、async failure |
| MSTest 4.3.0 / adapter 4.3.0 | 9/9、MTP 2.3.1 | 9/9、Test SDK 18.7.0 | domain rules + success、interaction、cancel、async failure |

`labs/dotnet/scripts/verify-runner-matrix.sh`が4つの実行とTRX countersを、`verify-failure-diagnostics.sh`が両frameworkのexpected/actual diagnosticを再現します。

## Considered alternatives

### VSTestを既定のままにする

既存IDE/toolとの互換性は高い一方、.NET 10で導入されたMTP native orchestration、test application、extension optionを検証できません。VSTestを互換laneへ限定することでmigration signalは残せるため、既定にはしません。

### MTPだけを残してVSTestを削除する

project構造とCLI移行は単純になりますが、adapter discovery、TRX、既存toolingとの退行を検出できません。source共有の小さい互換laneは維持costよりsignalが大きいと判断しました。

### frameworkをMSTestだけへ統一する

SDKとMTPのversion alignmentは容易ですが、NUnit constraint modelとadapter経由MTP integrationという異なる設計を比較できません。このrepositoryは選定handbookなので、framework差を残します。

## Consequences

### Positive

- frameworkとplatformを独立したversion matrixとしてreviewできる
- `.NET 10` native MTP CLIとTRXをCIで再現できる
- zero-test successをminimum countとTRX countersで拒否できる
- VSTest依存toolingの互換性を同じtest sourceで確認できる
- cancellationと非同期例外のsemantic driftもrunner変更時に検出できる

### Cost

- MTP/VSTestでproject fileとlockfileを各1組維持する
- MTP extensionとVSTest loggerでCLI optionが異なる
- NUnitとMSTestが依存するMTP minor versionは同一ではないため、framework upgradeごとにmatrix全体を再実行する

## xUnit.net v3

xUnit.net v3は採用済みframeworkではなく、次のspike候補です。MTP v2 package、native CLIとMTP CLIの差、TRX/filter/IDE discovery、既存2 frameworkに対する固有価値を同一Checkout oracleで測定し、採用時はこのADRをsupersedeまたは拡張する新ADRを作ります。

## References

- [Testing with `dotnet test`](https://learn.microsoft.com/dotnet/core/testing/unit-testing-with-dotnet-test)
- [Migrate Microsoft.Testing.Platform v1 to v2](https://learn.microsoft.com/dotnet/core/testing/microsoft-testing-platform-migration-from-v1-to-v2)
- [MSTest SDK configuration](https://learn.microsoft.com/dotnet/core/testing/unit-testing-mstest-sdk)
- [NUnit and Microsoft.Testing.Platform](https://docs.nunit.org/articles/vs-test-adapter/NUnit-And-Microsoft-Test-Platform.html)
- [xUnit.net v3 Microsoft Testing Platform](https://xunit.net/docs/getting-started/v3/microsoft-testing-platform)
