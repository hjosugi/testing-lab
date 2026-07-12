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

## テストの観測対象

| 観測対象 | 主な問い | 代表的なテスト |
|---|---|---|
| return value／state | 入力後の observable state は正しいか | Classical unit test |
| collaborator interaction | 必要な message を正しい相手に送ったか | London unit test |
| boundary protocol | HTTP／message の契約を守るか | contract test |
| real integration | DB、filesystem、network driver が接続できるか | integration test |
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

