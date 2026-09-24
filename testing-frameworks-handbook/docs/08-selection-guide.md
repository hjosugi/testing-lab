# 選定ガイド

> 実行例: [ADR-0003](adr/0003-javascript-unit-runner-selection.md)は、node:test・Mocha・AVAへ同じ5 caseを実装した[`labs/node/test/spike/`](../labs/node/test/spike/)の実測scorecard（診断要素、JUnit XML、依存数、engine範囲、並列semantics）から既定runnerを決め、migration/exit strategyとlock-inを記録した例です。

## 先に結論

| 状況 | 第一候補 | 理由 |
|---|---|---|
| 新規Node backend/library | Node test runner | 依存最小、標準mock/coverage/snapshot |
| 既存Mocha資産 | Mocha継続 | migrationよりtest quality改善を優先 |
| Nodeでfile isolationを強制 | AVA | concurrency/isolationが設計の中心 |
| Python | pytest | fixture/parametrize/pluginとdiagnostics |
| Java/Kotlin | JUnit 6 | JVM標準platform、extension、tooling |
| .NET Microsoft標準重視 | MSTest 4 + MTP | 公式統合とportable runner |
| .NET expressive constraint | NUnit 4 | constraint/data-driven model |
| C++ | Catch2 3 | idiomatic expression、SECTION、CTest統合 |
| Go | 標準testing | toolchain標準、benchmark/fuzz |
| Rust | cargo test、必要時rstest | 標準を保ちfixture重複だけ補う |
| PHP 8.4+ | PHPUnit 13 | ecosystem標準 |
| microservices compatibility | Pact | consumer-driven contract |
| browser E2E | Playwrightを基準に比較 | isolation/diagnostics/cross-browser |

## 採点テンプレート

各候補を1〜5点で評価し、重みをprojectごとに決めます。

| Criterion | Weight example |
|---|---:|
| target layer fit | 5 |
| failure diagnostics | 5 |
| deterministic isolation | 5 |
| team familiarity | 3 |
| CI/IDE integration | 4 |
| parallel scalability | 3 |
| maintenance/security | 4 |
| migration cost | 3 |
| extension ecosystem | 2 |

## 導入spike

READMEだけで決めず、同じ5ケースを候補frameworkで実装します。

1. async success
2. dependency failure injection
3. parameterized test
4. parallel実行時のresource isolation
5. 意図的failureのdiagnostic比較

frameworkの機能数より、teamがfailureを10分以内にdebugできるかを重視します。

