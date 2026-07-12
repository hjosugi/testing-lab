# 2026 tool landscape

確認日: 2026-07-12

この表は「全部導入する一覧」ではありません。各riskに対して最小のtool setを選ぶための地図です。GitHub topicの更新時刻はactivity signalにすぎず、品質・互換性・security supportを保証しません。

## JavaScript／TypeScript core

| Tool | Category | 2026時点の位置づけ | 選ぶ理由 | 注意 |
|---|---|---|---|---|
| Node test runner | built-in runner | Node 26 docsでmock/coverage/snapshot/tag/random orderを提供 | dependency最小 | Node runtimeとrelease cadenceが連動 |
| Mocha 11.7.6 | runner/framework | serial default、pluggable assertion/mock | mature/自由 | dependency compositionとparallel制約 |
| AVA 8.0.1 | runner/framework | file/thread isolationとconcurrency | isolationを規約化 | 独自API/migration |
| Jest 30.4.2 | batteries-included | transform/mock/snapshot/ecosystem | broad ecosystem | ESM、transform、worker設定の複雑さ |
| Vitest 4.1.10 | Vite-native runner | Vite config再利用、browser mode | modern frontend/Vite | production bundlerとのcouplingを理解 |
| Rstest (JS) | Rspack-native runner | Rspack/Rsbuild pipelineを再利用 | Rstack project | Rust crate `rstest`と別物 |
| Jasmine | framework | batteries-included BDD style | legacy/browser資産 | 新規でのecosystem fitを比較 |
| Sinon 22 | test-double library | spies/stubs/mocks/fake timers | runner-neutral | frameworkではない |
| Chai | assertion library | BDD/TDD assertion | runner-neutral | Node assert/Jest/Vitest built-inと重複 |
| fast-check 4.9 | property-based | TypeScript向けQuickCheck style | generator/shrinker | property/oracle設計が必要 |
| Stryker 9.6 | mutation | JS/TS mutation orchestration | test strength | runtime cost、mutator差 |

2026-07-12 registryで確認したversionです。lockfile更新時はrelease notesとengine requirementを再確認します。

## Frontend／browser

| Tool | Category | Design center |
|---|---|---|
| Testing Library | UI test utility | userに近いrole/name/query、implementation detailを避ける |
| Storybook 10.5 + Vitest addon | component workshop/test | storyをbrowser modeのinteraction/a11y/visual testへ変換 |
| Playwright 1.61 | browser E2E | browser context、locator、auto-wait、trace、3 engine |
| Cypress 15.18 | browser/component E2E | in-browser command model、time-travel diagnostics |
| TestCafe | browser E2E | hybrid native/proxy automation、sandbox、auto-wait |
| Puppeteer | browser automation library | Chrome/Firefox automation primitive、runnerは別途 |
| Web Platform Tests | conformance suite | browser standard間互換、一般app E2E frameworkではない |
| axe-core | accessibility rules | automatically detectable violations、manual testを補完 |
| visual service/local diff | visual regression | reviewed baseline、render determinism |

Storybookの旧test runnerは、Vite-powered setupではVitest addonへ置き換えることが公式に推奨されています。

## API／integration／service boundary

| Tool | Category | Design center |
|---|---|---|
| Testcontainers | dependency lifecycle | throwaway real DB/broker/browser/container |
| Pact | consumer-driven contract | consumer testからcontract-by-exampleを生成 |
| Schemathesis | schema property test | OpenAPI/GraphQLからedge/stateful case生成 |
| Dredd | schema conformance | OpenAPI/API Blueprintとimplementation検証 |
| Pactum | API functional DSL | pyramid各層のREST test/mocking |
| Karate | JVM test DSL | API/mock/browser/loadをBDD styleで統合 |
| REST Assured | JVM API DSL | Java/GroovyからHTTP response assertion |
| Hurl | text HTTP test | plain text request/assertion、CLI/CI |
| Frisby | Jest REST API | Jest ecosystemでAPI test |
| Prism | schema mock/proxy | OpenAPIからmock/validation |
| mountebank | service virtualization | over-the-wire multi-protocol imposters |
| WireMock/MockServer | HTTP virtualization | programmable remote service double |
| Keploy | capture/replay/sandbox | production-like API interactionからtest/double |
| GoReplay | traffic replay | real trafficをtest environmentへreplay |
| LocalStack/Azurite | cloud emulator | selected cloud APIのlocal integration |
| Parlel等real-protocol emulator | agent verification | AI coding agent向けservice emulator。実service gap要評価 |

「real container」は「productionと同じ」を意味しません。image、config、network、managed service extensionの差を明記します。

## Mobile／native

| Tool | Category | Design center |
|---|---|---|
| Appium 3.x | cross-platform automation | W3C WebDriver server + separately installed drivers/plugins |
| Detox | React Native gray-box E2E | app synchronizationとdevice automation |
| Cavy | React Native integration | in-app testable component tree |
| XCTest/XCUITest | Apple standard | unit/performance/UI test |
| EarlGrey | iOS UI | synchronization-first gray-box/white-box approach |
| Espresso/Kakao | Android UI/DSL | instrumentation synchronization + Kotlin DSL |
| Robolectric | Android JVM | simulated Android environmentでfast component test |
| Airtest/Poco | game/native UI | image recognition + engine hierarchy inspection |
| SoloPi/HydraLab/device farm | mobile automation/platform | device orchestration/recording/cloud execution |

## .NET／JVM／native language

| Ecosystem | Default | Complement |
|---|---|---|
| JVM | JUnit 6 Platform/Jupiter | Mockito、Truth/AssertJ、Testcontainers、PIT |
| .NET | MSTest 4+MTP / NUnit 4 / xUnit.net v3 | NSubstitute/FakeItEasy、FsCheck、Coverlet |
| Python | pytest 9 | Hypothesis、Schemathesis、mutmut/cosmic-ray |
| Go | standard testing | fuzz/race/benchmark、testifyは必要時のみ |
| Rust | cargo test | rstest crate、proptest、cargo-mutants、httpmock |
| C++ | Catch2/doctest/GoogleTest | sanitizer、fuzzer、benchmark、CTest |
| PHP | PHPUnit 13 | Infection、Codeception、atoum |
| Shell/PowerShell | Bats/bash_unit/Pester | OS matrix |
| Embedded/PLC | Unity/Ceedling/TcUnit | simulator/HIL/device rig |

## Acceptance／continuous／platform

| Tool | Category | 注意 |
|---|---|---|
| Cucumber family | BDD/ATDD runner | Gherkinを書くこと自体はBDDではない |
| Gauge | Markdown acceptance | specificationとstep codeのdrift |
| LightBDD/Concordion | executable specification | business languageを維持 |
| Wallaby.js | editor continuous runner | test authoring feedback tool |
| GoCD/GitHub Actions/Jenkins等 | CI/CD orchestration | test frameworkではない |
| Kuberhealthy/canary checker | synthetic platform | production safety/cleanup |
| MeterSphere/Testsigma | test platform | authoring/management/executionを統合、lock-in評価 |
| feature flag platform | progressive delivery | testではなくexposure control、verificationと併用 |

## Non-functional／specialized

| Risk | Tool例 |
|---|---|
| performance/load | k6、JMeter、Gatling、language benchmark |
| security | CodeQL、Semgrep、OWASP ZAP、Nuclei、language fuzzers |
| TLS/protocol | tlsfuzzer、conformance suite |
| chaos/resilience | Chaos Mesh、Litmus、Chaos Monkey for Spring Boot |
| data quality | dbt tests、Great Expectations、Deequ |
| observability acceptance | OpenTelemetry test utilities、Grafana OATs |
| Kubernetes synthetic | Kuberhealthy、custom probes |
| LLM/RAG/agent eval | prompt/eval/red-team framework + custom dataset |

## Repositoryを教材に使うときのfilter

1. 公式documentationとrelease policyがある
2. current runtime/toolchainでclean installできる
3. sampleがproduction practiceを代表する
4. CIがgreenでsecurity advisoryに対応している
5. testの目的と境界が明記されている
6. deprecated API/frameworkを最新として教えていない
7. copied boilerplateではなくfailure diagnosticsを学べる

更新が止まったrepositoryも歴史的designを学ぶ価値はありますが、starter templateとしては使いません。

