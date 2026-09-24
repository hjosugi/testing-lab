# ADR-0003: JavaScript unit/component testの既定runnerをnode:testにする

- Status: Accepted（team diagnosis timeの実測は未実施。下記「未検証」参照）
- Date: 2026-09-25
- Decision owners: repository maintainers
- Applies to: `labs/*`のNode.js unit / in-process component test。browser E2E（Playwright）、component browser test（Vitest browser mode）、contract（Pact）は対象外

## Context

### Target layerとfailure type

対象はNode.js上のunit / in-process component testです。守りたいfailure typeは、非同期処理の取りこぼし（unawaited promise）、期待errorの型違い、parameterized caseの境界、並列実行時の共有state、failure時の診断情報不足です。

### 分類を誤らない

| 種類 | この判断での候補 | 役割 |
|---|---|---|
| runner | node:test（`node --test`）、Mocha CLI、AVA CLI | discovery、process/worker、scheduling、reporter |
| framework（API） | `node:test`、Mocha BDD interface、AVA `test()` | test定義、hook、skip/only |
| assertion | `node:assert/strict`、AVA `t.*` | 比較とdiff |
| test double | `node:test` mock、Sinon | 置換と記録 |
| specialized tool | Stryker、fast-check、Playwright | runnerではない（この判断の対象外） |

Mocha + `node:assert`、AVA + Sinonのように組合せで選ぶため、runnerの比較にassertion libraryやmock libraryの人気を混ぜません。

### 評価（同じ5 caseの実測）

[`labs/node/test/spike/`](../../labs/node/test/spike/)で、async、期待失敗（declined payment）、parameterized、並列isolation、意図的diagnostic failureの5 caseを1つの`cases.js`から3 runnerへ薄いadapterで結び、[`scripts/runner-spike.mjs`](../../labs/node/scripts/runner-spike.mjs)が結果を[`artifacts/runner-spike.json`](../../labs/node/artifacts/runner-spike.json)へ記録します（Node 24、CIで`--check`）。

| 観点 | node:test | Mocha 11.7.6 | AVA 8.0.1 |
|---|---|---|---|
| 5 case | pass | pass | pass |
| 意図的failureのexit code | 非0 | 非0 | 非0 |
| failure出力: test名 / source line / 両方の値 / structured diff | すべてあり | すべてあり | すべてあり |
| JUnit系XML | built-in `junit` reporter | built-in `xunit` reporter | なし（TAPのみ、converter必要） |
| npm依存（transitive） | 0 | 51 package | 132 package |
| Node engine | Node本体に同梱 | `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0` | `^22.20 \|\| ^24.12 \|\| >=26` |
| file内の並列 | `concurrency`指定でsubtestを並列 | file内は直列、`--parallel`でfile単位 | 既定でfile内並列、fileごとにworker |
| unawaited rejection（#7の実測） | exit 1 | exit 7 | exit 1 |

discovery・lifecycle・isolation・parallel schedulingの詳細な実測は[`labs/node/EXECUTION-MODEL.md`](../../labs/node/EXECUTION-MODEL.md)と`artifacts/execution-semantics.json`（Issue #7）にあります。

### Maintenance / security / runtime compatibility

- node:testはNode本体と同じrelease/security processに乗り、追加のsupply chainがありません。
- Mocha（51 package）とAVA（132 package）はlockfileとDependabotで管理でき、どちらも活発にreleaseされています。ただしAVA 8のengine範囲は狭く、Node LTS更新がrunner更新待ちになるriskがあります。
- CI/IDE: 3者ともVS Code等のtest explorer拡張がありますが、node:testとMochaはJUnit XMLをplugin無しで出せます。

star数、download数、最終更新日は判断材料にしていません。

## Decision

1. 新しいNode.js unit / in-process component testの既定runnerは**node:test**、assertionは`node:assert/strict`、doubleは`node:test`のmockを第一候補にする
2. Mochaの既存suiteは移行を強制しない（file単位並列、豊富なreporterが必要な場合は継続可）
3. AVAはfile内並列が既定で、共有stateを持つ既存codeでは危険側に倒れるため、新規採用しない
4. runner変更時は`runner-spike.mjs --check`と`execution-semantics.mjs --check`を再実行し、差分をreviewする

## Migration / exit strategy

- test本体はrunner非依存の`cases.js`形式（入力→`{ actual, expected }`）に寄せ、runner固有APIはadapter層だけに置く。spikeではadapterは各runner 10行前後です。
- assertionは`node:assert/strict`に統一し、AVAの`t.*`やChaiへのlock-inを避ける。
- Mocha→node:test: `describe/it`は`node:test`にも同名APIがあるため機械的に置換でき、hook（`beforeEach`等）も対応します。移行cost見積りは「file数 × adapter修正」で、reporterをJUnitへ切り替えるCI設定1箇所です。
- node:testから離れる場合も、`cases.js`形式ならadapterの書き直しだけで済みます。

## 未検証（Issue #31で継続）

- **team diagnosis time**: 同じ意図的failureのartifactだけを渡し、engineer 3名がroot causeを特定するまでの時間を測るprotocolは用意していますが、人による計測はまだ行っていません。現状の比較は「failure出力に診断要素が含まれるか」というproxyです。

## Consequences

- Positive: 依存0、JUnit built-in、Node release cadenceと同期。
- Negative: Mochaの豊富なreporter/pluginや、AVAのworker分離のような機能は自前またはNode側の進化に依存します。
- Review trigger: Node LTSの`node:test` breaking change、またはteam diagnosis time計測で劣後が判明した場合に見直します。
