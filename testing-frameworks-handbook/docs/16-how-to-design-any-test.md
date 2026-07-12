# あらゆるテストを設計する共通手順

テスト名を先に選ばないでください。「integration testを追加する」ではなく、「どの故障を、どの観測点で、どの時間予算内に検出するか」から設計します。

## 1. Test design card

本書のすべてのテストは次のカードで設計します。

```yaml
name: payment capture idempotency
risk:
  event: retryによる二重請求
  impact: critical
  likelihood: medium
  detectability_without_test: low
system_under_test: CheckoutApplicationService
real_components:
  - application service
  - domain model
replaced_components:
  - payment provider: controllable protocol fake
stimulus:
  - same command and idempotency key sent twice
oracle:
  - exactly one provider capture
  - same order result returned twice
controlled_nondeterminism:
  - clock
  - UUID generator
failure_classes:
  - duplicate charge
  - different result for replay
cannot_detect:
  - provider production outage
  - network TLS incompatibility
execution:
  lane: PR-fast
  timeout: 200ms
  parallel: safe, unique order id
evidence:
  - failure message contains idempotency key and calls
owner: payments-team
```

このカードが書けなければ、test codeを書く前に仕様か境界が不足しています。

## 2. Riskを具体的なfailure eventにする

「品質を上げる」はtest requirementではありません。次の形にします。

```text
Given <system state>
When <fault or action>
The system may <undesired observable consequence>
Impact is <business/technical damage>
```

例:

- 在庫が残り1個のとき、2 requestが並行すると、在庫が負になる可能性がある。
- schema migration中にold appがwriteすると、new non-null columnでrequestが失敗する可能性がある。
- consumerがfieldを必須としているのにproviderが削除すると、checkoutがdeserializeできない。
- DST切り替え時にlocal timeを使うと、subscriptionが二重請求される。

## 3. SUT boundaryを決める

SUTは必ずしもclassではありません。

| Boundary | 適する問い | 典型的な実物 |
|---|---|---|
| function/value | calculationは正しいか | pure code |
| object/aggregate | invariantを保つか | domain objects |
| application component | use caseが協調するか | service + domain + fake ports |
| adapter | protocol/serializationは正しいか | HTTP/SQL/message adapter |
| deployable service | config/wiring/runtimeは正しいか | process + selected real dependencies |
| system | user journeyが通るか | multiple services/browser |
| socio-technical process | restore/incident responseが機能するか | people + runbook + systems |

boundaryを広げるほどrealismは増えますが、原因局所性、速度、制御性が落ちます。広いtestを否定せず、そのtestでしか観測できないriskがあるかを確認します。

## 4. Observation pointを選ぶ

同じbehaviorでも観測場所でtestの意味が変わります。

| Observation | 例 | 長所 | 弱点 |
|---|---|---|---|
| return value | calculated total | 速い、局所的 | side effectを見ない |
| state | persisted order | refactorに強い | fake drift |
| interaction | payment capture call | protocolを直接検証 | implementation coupling |
| emitted event | OrderConfirmed | async contractを検証 | delivery保証は別 |
| wire bytes | HTTP/Protobuf payload | protocol精度 | business intentが読みにくい |
| UI/AX tree | accessible button/name | user interfaceを検証 | backend semanticsは限定的 |
| metrics/traces | retry count/span graph | distributed flow | instrumentation bugの影響 |
| external effect | email/device/payment sandbox | realism | cost/flake/cleanup |

最も狭く、かつriskを直接表す観測点を選びます。

## 5. Oracleを選ぶ

oracleはpass/failを決める仕組みです。expected valueだけではありません。

- exact example
- predicate/invariant
- reference implementation
- previous stable version
- independent implementation
- metamorphic relation
- model/state machine
- schema/contract
- human approval
- statistical threshold/distribution
- runtime SLO/business invariant

oracleの誤りはtest generatorの誤りより危険です。詳しくは[17-test-oracles-deep-dive.md](17-test-oracles-deep-dive.md)で扱います。

## 6. Controllabilityを設計する

テストはsystemを必要な状態へ運べなければなりません。

制御対象:

- clock/timezone/calendar
- randomness/UUID
- thread/task scheduler
- network delay/drop/duplicate/reorder
- disk full/I/O error
- external API response/rate limit
- database isolation/deadlock
- feature flag/configuration
- identity/authorization context
- device sensor/location/battery

production codeへtest-only booleanを増やすのではなく、Clock、RandomSource、port、scheduler、fault boundaryとして本番にも意味のあるabstractionを置きます。

## 7. Test dataを設計する

dataは四種類を使い分けます。

| Data | 用途 | 注意 |
|---|---|---|
| named example | business ruleの説明 | magic numberを避ける |
| boundary partition | min/max/empty/invalid | off-by-one |
| generated | 広い入力空間 | distributionとshrinking |
| production-derived | realism | PII、bias、staleness |

random dataを使うだけではproperty-based testingではありません。生成範囲、分布、seed、shrink、oracleが必要です。

## 8. Failure injectionを設計する

happy pathの反対を1件書くだけでは不十分です。

```text
before operation: dependency unavailable
during operation: timeout/partial write/disconnect
after remote success before local commit: ambiguous outcome
duplicate delivery: at-least-once
out-of-order delivery
slow success: within/outside deadline
malformed but accepted response
resource exhaustion
```

特に分散処理では「成功したか不明」が重要です。単純なexception stubだけではambiguous outcomeを表現できません。

## 9. Determinism budget

完全deterministicにできないtestもあります。非決定性を隠すのではなく予算化します。

```text
target flake rate: < 0.1%
repeat count for detection: 100
seed retention: 30 days
timeout policy: based on SLO, not arbitrary sleep
quarantine maximum: 7 days
```

## 10. Diagnostic design

test failureは調査を開始するinterfaceです。

最低限出す情報:

- scenario/test id
- inputとseed
- expected/actualのsemantic diff
- relevant state transition
- external calls with secret redaction
- virtual/real time
- worker/process/container/device id
- trace/screenshot/video only when useful

logを大量に出すこととdiagnostic qualityは同じではありません。

## 11. CI laneを選ぶ

| Lane | Feedback target | Test |
|---|---:|---|
| editor | 1秒 | focused unit/property example |
| pre-commit | 10秒 | static + affected fast tests |
| PR-fast | 5分 | unit/component/selected integration |
| PR-full | 15分 | DB/contract/browser critical |
| merge/release | 30–60分 | migration/E2E/security/performance smoke |
| scheduled | hours | mutation/full fuzz/soak/chaos/matrix |
| production | continuous | canary/synthetic/invariant |

test typeで固定せず、runtimeとriskでlaneを決めます。

## 12. Test retirement

testは追加するだけでなく削除します。

削除候補:

- 同じriskを低い層で完全に検出できる重複E2E
- obsolete behaviorを固定するcharacterization test
- assertionのないtest
- 永続quarantine
- equivalent snapshotを大量に保持
- framework migration後のduplicate suite

削除時はcoverage低下より、失うrisk signalを確認します。

## 13. Design review checklist

- [ ] failure eventが具体的
- [ ] SUT boundaryが明示
- [ ] real/doubleの一覧がある
- [ ] oracleがproduction codeのコピーではない
- [ ] testが検出できないfailureを明記
- [ ] time/random/concurrencyを制御
- [ ] parallel resource isolationがある
- [ ] failure messageから原因候補を絞れる
- [ ] CI budgetとownerがある
- [ ] retry/quarantine/retirement policyがある

