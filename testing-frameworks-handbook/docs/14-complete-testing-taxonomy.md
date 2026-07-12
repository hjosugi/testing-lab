# 全テスト種別の完全taxonomy

「unitかintegrationか」だけでは設計できません。次の5項目でtestを定義します。

```text
scope: 何を起動するか
boundary: どの境界を本物にするか
double: 何を置換するか
oracle: 何を正しいと判定するか
purpose: どのriskを検出するか
```

## 1. Build前／static verification

| 種類 | 検出対象 | Tool例 |
|---|---|---|
| compiler/type check | type、syntax、exhaustiveness | javac、tsc、rustc、mypy |
| lint/static analysis | bug pattern、style、data flow | ESLint、SpotBugs、Clippy、Semgrep |
| SAST | security weakness | CodeQL、Semgrep、language analyzers |
| SCA/license | vulnerable dependency、license | OSV-Scanner、Dependabot、SBOM tool |
| formal/spec check | invariant、state/model | TLA+、Alloy、Dafny |
| IaC policy | insecure/misconfigured infra | cfn_nag、OPA/Conftest、Checkov |

static verificationはtest runnerを起動しませんが、quality portfolioの一部です。type systemが保証することをruntime testで重複しすぎないようにします。

## 2. Developer tests

| 種類 | Scope | Oracle | 主な用途 |
|---|---|---|---|
| example-based unit | function/class/behavior | expected value/state/interaction | business rule |
| sociable unit | in-memory object graph | public outcome | domain collaboration |
| solitary unit | subject + doubles | interaction/result | orchestration protocol |
| parameterized/table | 同behavior、多case | expected per case | boundary matrix |
| property-based | 多数生成input | invariant/property | broad input space |
| fuzz | malformed/random input | no crash/hang + invariant | parser/security boundary |
| concurrency/race | threads/tasks/schedules | safety/liveness | race、deadlock |
| mutation | modified production variants | tests must fail | suite strength |
| characterization | legacy behavior | captured current behavior | safe refactor |
| regression | past defect | defect must not recur | incident prevention |
| snapshot/golden | structured/rendered output | reviewed artifact | compiler/UI/serialization |
| approval | human-approved output | approved baseline | complex output |

snapshot更新を一括承認するとoracleを捨てます。差分のbusiness meaningをreviewします。

## 3. Componentとintegration

`integration test`は曖昧なので、名前に境界を入れます。

| 推奨名 | 本物 | 置換 | 検出対象 |
|---|---|---|---|
| in-process component test | application component | process外port | module wiring |
| repository-Postgres test | SQL/driver/real Postgres | 他service | schema/query/transaction |
| HTTP adapter test | router/serializer/HTTP stack | DB/remote API可 | status/header/body |
| message adapter test | serializer/broker client | downstream | routing/ack/retry |
| filesystem integration | OS/filesystem | remote | permission/path/atomicity |
| multi-process integration | app + selected dependency | remaining services | network/config/protocol |
| system integration | deployable services群 | third party可 | cross-service workflow |

Testcontainers、Docker Compose、ephemeral namespaceはreal dependencyを短命に起動します。in-memory databaseはSQL dialect、locking、transaction、index behaviorを再現しない場合があるため、本番DBの代替とみなしません。

## 4. APIとcontract

| 種類 | Source of truth | 例 |
|---|---|---|
| schema conformance | OpenAPI/JSON Schema/GraphQL schema | Dredd、Schemathesis、Prism |
| consumer-driven contract | consumer usage例 | Pact |
| provider contract | provider spec + implementation | OpenAPI validator |
| backward compatibility | old/new schema/artifact | protobuf/OpenAPI diff |
| API functional | business scenario over HTTP | REST Assured、Karate、Pactum、Hurl |
| service virtualization | programmed/recorded remote behavior | mountebank、WireMock、MockServer |

PactとPactumは名前が似ていますが別物です。Pactはconsumer-driven contract、PactumはREST API test toolです。

record/replayは便利ですが、secret/PII、stale fixture、nondeterministic field、provider driftを管理します。

## 5. Acceptance／BDD／ATDD／SBE

これらはtest layerよりcollaborationとspecificationの方法です。

- BDD: exampleでbehaviorを発見し、ubiquitous languageを作る
- ATDD: 実装前にacceptance criteriaをexecutableにする
- Specification by Example: concrete exampleでruleと例外を明確化
- Gherkin/Cucumber/Gauge: executable specificationの表現/runner

Gherkinを使うだけではBDDになりません。UI操作手順ではなくbusiness ruleを表現します。

```gherkin
Scenario: Declined payment does not confirm the order
  Given a cart total of 1200 yen
  And the payment provider will decline the charge
  When the customer checks out
  Then the order is not confirmed
  And no confirmation event is published
```

## 6. UI test

| 種類 | Scope | Tool例 | 注意 |
|---|---|---|---|
| logic unit | reducer/hook/view model | language runner | DOM不要なlogic |
| component | component + DOM/browser | Testing Library、Storybook test | user-visible query |
| interaction | rendered component story | Storybook play/browser test | component state |
| visual regression | screenshot/render tree | Playwright、Chromatic等 | font/OS/threshold固定 |
| accessibility | DOM/AX tree/rules | axe-core、Playwright | 自動検査だけで完結しない |
| browser E2E | deployed app + browser | Playwright、Cypress、TestCafe | critical journeyに限定 |
| cross-browser | Chromium/Firefox/WebKit | Playwright、WPT | engine差 |
| responsive/device | viewport/input/emulation | browser tools | emulation≠real device |

Testing Libraryの中心は「実装detailよりuserの使い方に近いquery」です。CSS classやcomponent instanceを直接検証しすぎません。

## 7. Mobile／desktop／game／embedded

| Surface | 主なtest | Tool例 |
|---|---|---|
| native iOS | unit/UI/snapshot/device | XCTest/XCUITest、EarlGrey |
| native Android | JVM/device/UI | JUnit、Robolectric、Espresso、Kakao |
| React Native | component/gray-box E2E | Testing Library、Detox、Cavy |
| cross-platform mobile | W3C WebDriver E2E | Appium |
| Windows desktop | UI Automation/WebDriver | Appium Windows driver等 |
| game/Unity | engine object/image/device | Unity Test Framework、Airtest/Poco |
| embedded/firmware | host unit/HIL/SIL | Unity/Ceedling、hardware rig |
| PLC | industrial runtime | TcUnit |

simulator/emulator、real device、hardware-in-the-loopは検出できるfailureが違います。device farmは最後だけでなく、OS/device matrixをrisk-basedで選びます。

## 8. E2E／system／release

| 種類 | 目的 |
|---|---|
| smoke | build/deployが最低限使える |
| critical journey E2E | 最重要user valueが通る |
| system test | complete system requirement |
| interoperability | version/vendor間互換 |
| installation/upgrade | install、migration、rollback |
| backup/restore | RPO/RTOとdata integrity |
| disaster recovery | region/service failure recovery |
| exploratory/manual | 未知risk、UX、曖昧なbehavior |
| usability | userが目標を達成できるか |

E2Eは「全部本物」ではありません。第三者決済のsandbox、clock control、email captureなど、制御されたtest boundaryを明記します。

## 9. Non-functional

### Performance

| 種類 | 問い |
|---|---|
| microbenchmark | function/operatorのcostは変化したか |
| benchmark | component throughput/latency |
| load | 想定trafficでSLOを満たすか |
| stress | 限界とdegradationはどうなるか |
| spike | 急増から安定/回復するか |
| soak/endurance | leak、queue buildup、劣化がないか |
| scalability | resource増加に対する伸び |
| capacity | 安全な最大負荷 |

coordinated omission、warm-up、client bottleneck、percentile集計、test data realismに注意します。functional E2E toolで性能を測らないでください。

### Security

- SAST、SCA、secret scan、IaC scan
- DAST、API security test
- fuzzing、protocol conformance
- penetration test、red team
- authn/authz/tenant isolation test
- supply-chain/SBOM/provenance verification
- abuse caseとrate limit test

OWASP ASVS/WSTGなどのstandardへtraceします。

### Resilience

- fault injection
- chaos experiment
- retry/backoff/circuit breaker test
- dependency latency/partial failure
- failover/recovery
- deterministic simulation

steady-state hypothesis、blast radius、abort condition、observabilityを先に定義します。

## 10. Data／analytics／ML／LLM

| 対象 | Test |
|---|---|
| ETL/ELT | schema、null、range、uniqueness、referential integrity |
| data pipeline | source-to-target reconciliation、late data、idempotency |
| model | offline metric、slice、robustness、drift、fairness |
| ML system | training-serving skew、feature leakage、reproducibility |
| LLM prompt/RAG | golden set、retrieval recall、groundedness、safety |
| agent | tool contract、state transition、sandbox、budget、trajectory |

LLM-as-judgeは単独oracleにせず、calibration、人手sample、inter-rater agreement、judge model/version固定、position/order biasの確認を行います。非決定的systemはthresholdだけでなくdistributionとslice別failureを見ます。

## 11. Production verification

| 種類 | 役割 |
|---|---|
| canary | 小trafficで新versionを検証 |
| shadow | responseをuserへ返さず新系へ複製 |
| synthetic | 定期的にjourney/APIを実行 |
| feature flag experiment | cohort単位で安全に有効化 |
| runtime invariant | 不正stateを検知 |
| observability assertion | trace/metric/logからSLO/flowを検証 |
| replay | sanitized production trafficを再実行 |

production testはblast radiusとdata safetyを持つ必要があります。synthetic account、idempotent cleanup、明示tagを使います。

## 12. Continuous testing

continuous testingは特定toolではなく、changeからproductionまで継続してrisk signalを返すoperating modelです。

```text
editor: focused unit/property
pre-commit: static + affected unit
PR: fast + selected integration/contract
merge: wider integration + E2E
release: migration/performance/security
production: canary + synthetic + invariant
scheduled: mutation + full fuzz + chaos + compatibility matrix
```

Wallaby.jsのようなcontinuous runner、GoCDのようなdelivery platform、Kuberhealthyのようなsynthetic operatorは別カテゴリです。

## Tool名から誤分類しないための例

| Tool | 分類 |
|---|---|
| Playwright | browser automation + test runner |
| Testcontainers | ephemeral dependency lifecycle library |
| Jest/Mocha/AVA | JS test runner/framework |
| Testing Library | user-centric UI query/test utility |
| Storybook | component workshop + testing surface |
| Pact | consumer-driven contract |
| Pactum/Karate/REST Assured/Hurl | API functional/integration |
| Dredd/Schemathesis | spec-based API testing |
| Prism | OpenAPI mock/validation proxy |
| LocalStack | cloud service emulator |
| Keploy/GoReplay | traffic capture/replay/sandbox |
| k6/JMeter | load/performance |
| Infection/Stryker/PIT | mutation |
| Detox/Appium/Airtest | mobile/app automation |
| promptfoo等 | LLM evaluation/red-team layer |

