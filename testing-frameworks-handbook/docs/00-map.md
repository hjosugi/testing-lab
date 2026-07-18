# 全体マップ

## まず区別する6層

| 層 | 役割 | 例 |
|---|---|---|
| Test runner | discovery、実行、並列化、report | Node test runner、JUnit Platform、MTP、`go test`、Cargo |
| Test framework | test／fixture／lifecycle の programming model | JUnit Jupiter、pytest、NUnit、Catch2 |
| Assertion library | actual と expected の差を表現 | Truth、AssertJ、Hamcrest、Node assert |
| Test-double library | stub／spy／mock／fake の生成と検証 | Mockito、Sinon、NSubstitute、`unittest.mock` |
| Specialized tool | 特定種類のテストを実行 | Pact、Playwright、Infection、Airtest |
| Test management platform | 実行管理、記録、分析 | Testsigma など |

GitHub の `test-framework` topic にはこれらが混在しています。Mocha と Infection を「どちらが優れた unit test framework か」と比較するのは、compiler と profiler を比較するようなものです。

## Team標準のtest level定義

このhandbookでは、test levelを速度やrunner名ではなく、起動するscopeと本物にするboundaryで決めます。次の定義をsuite名、test plan、CI job名、reviewで共通して使います。

| 標準名 | Team定義 |
|---|---|
| unit test | 1 process内のcoherent behaviorをscopeとし、process外portをdoubleへ置き換え、return value、state、または重要なinteractionをoracleにしてbusiness ruleかorchestrationの退行を検出するtest |
| in-process component test | applicationのcomponentと内部wiringを1 process内で本物にし、process外dependencyを置換して、公開APIから観測できる結果をoracleにmodule間の接続不良を検出するtest |
| boundary-specific integration test | `HTTP adapter`、`repository-Postgres`、`filesystem`のように名前で明示した境界を本物にし、無関係な外部systemだけを置換して、protocolとside effectをoracleに接続・設定・実装差を検出するtest |
| contract test | consumer exampleまたは公開schemaをsource of truthとし、provider/consumerの片側か両側を実行して、契約への適合をoracleに互換性の破壊を検出するtest |
| system test | deploy可能なsystemまたは選択したservice群を公開boundaryから実行し、第三者serviceだけをsandboxやdoubleにして、system requirementをoracleに構成とcross-component flowの欠陥を検出するtest |
| E2E test | browser、mobile app、CLIなどのdelivery surfaceからcritical user journeyを通し、制御困難な第三者だけをsandboxやdoubleにして、user-visible outcomeをoracleに価値提供経路の破断を検出するtest |

`system`は「どのdeployable scopeを通したか」、`E2E`は「どの利用者surfaceからjourneyを通したか」を表します。同じtestが両方の性質を持つ場合も、suite名では主目的を先に置きます。

### Suite命名規約

canonical suite名は `<subject>/<real-boundary>/<purpose>` とします。file名は少なくともsubjectとreal boundaryをkebab-caseで表し、複数behaviorを収録するfileではpurposeを個別test名へ置けます。package scriptやCI jobはworking directoryやpackage名がsubjectを一意にする場合だけsubjectを省略できますが、real boundaryは省略しません。

```text
checkout/http-adapter/create-order
checkout-http-adapter.test.js
test:http-adapter
```

- `<subject>`には観測対象を入れます。framework名だけのsuite名にはしません。
- `<real-boundary>`には `in-process-component`、`collaborator-ports`、`http-adapter`、`repository-postgres`、`browser-to-http`のように、本物にする境界を入れます。
- `<purpose>`には守るbehavior、contract、property、journey、riskを入れます。
- `integration`、`test:integration`、`integration.test.*`という無修飾名は新規作成しません。必要なら `http-adapter`、`repository-postgres`、`filesystem`、`multi-process-integration`のように境界を明示します。
- runner、framework、assertion libraryはmetadataとして記録し、test levelの代わりには使いません。

現在の実装への対応は[labsのsuite mapping](../labs/README.md#現在のsuite-taxonomy-mapping)を正とします。網羅的な分類は[全テスト種別の完全taxonomy](14-complete-testing-taxonomy.md)を参照してください。

## テストの観測対象

| 観測対象 | 主な問い | 代表的なテスト |
|---|---|---|
| return value／state | 入力後の observable state は正しいか | Classical unit test |
| collaborator interaction | 必要な message を正しい相手に送ったか | London unit test |
| boundary protocol | HTTP／message の契約を守るか | contract test |
| real boundary | DB、filesystem、network driver が接続できるか | repository-Postgres／filesystem／HTTP adapter test |
| user journey | 実ブラウザから価値を届けられるか | E2E test |
| invariant | 広い入力集合で性質が保たれるか | property test／fuzz test |
| test strength | 小さな欠陥を検出できるか | mutation test |

## 学習のゴール

完了時には次を説明・実装できる状態を目指します。

- unit の境界を class ではなく coherent behavior から決める
- solitary test と sociable test を使い分ける
- state verification と behavior verification を使い分ける
- mock が design feedback になる場合と、implementation coupling になる場合を見抜く
- framework の便利機能より、failure diagnostics、isolation、parallel safety を優先する
- CI を fast lane／integration lane／release lane に分ける
- flaky test を retry で隠さず、原因分類と隔離期限を持つ
