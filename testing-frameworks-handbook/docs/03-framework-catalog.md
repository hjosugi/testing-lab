# フレームワーク比較と設計思想

## 中核フレームワーク

| Tool | 種類 | 設計思想 | 強み | 注意点 | 推奨場面 |
|---|---|---|---|---|---|
| Node test runner | runner + framework | 標準ライブラリ内で test、mock、coverage、snapshot を統合 | dependency 最小、Node と同時進化 | ecosystem plugin は専用frameworkより少ない | Node library／service の新規開発 |
| Mocha 11 | framework/runner | assertion や mock を選べる小さいcore、serial default、柔軟なinterface | 成熟、async、browser、豊富なreporter | 構成選択が多い、parallel では制約 | 既存Node、自由なtool composition |
| AVA 8 | runner/framework | test file isolation と concurrency を標準化し、簡潔なAPIと明瞭なfailureを重視 | process/thread isolation、async、macro | 独自API、migration cost | 独立性を強制したいNode project |
| pytest 9 | framework/runner | plain assert、dependency injection 型fixture、plugin architecture | fixture composition、parametrize、診断 | fixture graph と autouse の濫用 | Python 全般 |
| JUnit 6 | Platform + Jupiter | launcher/engine/programming model を分離し、JVM上の複数frameworkを載せる | IDE/build統合、extension、dynamic/parameterized | extension の過剰な暗黙性 | Java/Kotlin の標準選択 |
| Truth | assertion library | domain-specific Subject による fluent で読みやすいfailure | collection/string/custom type の診断 | runnerではない | JUnit と組み合わせる |
| NUnit 4 | framework | .NET向けxUnitを attribute と constraint model で表現 | data-driven、constraint assertion、成熟 | runner/adapterとの版整合 | .NET既存資産、表現力あるassertion |
| MSTest 4 + MTP | framework + platform | Microsoft公式のcross-platform framework と埋め込み可能な軽量runner | VS/CLI/CI統合、MTP | VSTest/MTP移行差を理解する | Microsoft stack、新規enterprise .NET |
| Catch2 3 | C++ framework | C++ boolean expression と自然言語test名、SECTIONによる局所fixture | macroが簡潔、generator、benchmark | v3はcompiled library、compile cost | C++ unit/component test |
| Go testing | 標準framework | language/toolchain標準、table test と明示的dependency | dependencyなし、benchmark/fuzz同居 | assertion/mockは最小限 | Goの標準選択 |
| Rust cargo test | 標準runner/framework | type/ownership保証を補い、unit、integration、doc testをCargoで統合 | toolchain一体、並列default | elaborate fixtureは手作業 | Rustの標準選択 |
| Rust rstest | proc-macro extension | fixture と table-driven test の重複をmacroで削減 | case、fixture、async対応 | macro展開と依存増 | data matrix が多いRust test |
| PHPUnit 13 | framework/runner | xUnit lifecycle、attribute、test doubleをPHP標準として提供 | PHP ecosystem標準、coverage連携 | PHPUnit 13はPHP 8.4+ | 現行PHP project |

## 2026年に重要な補足

- JUnit 6 は現行世代で、Java 17以上が必要です。JUnit 5教材をそのまま最新扱いしません。
- Node 26 の組み込みrunnerは mocking、coverage、snapshot、tags、random order、OpenTelemetry instrumentation まで持っています。Mochaを選ぶ理由は「Nodeにrunnerがない」ではなく、既存ecosystemやinterface/reportingの選択です。
- NUnitの現行frameworkは4系です。NUnit 4.6.0は2026年5月公開です。
- .NETではframeworkだけでなく VSTest と Microsoft.Testing.Platform の違いを選定に含めます。
- PHPUnit 13はPHP 8.4以上です。PHP 8.3ではPHPUnit 12を使います。
- `rstest` という名前は、Rustのfixture crateに加えて、2026年にはRspack系JavaScript test frameworkにも使われています。検索時は文脈を確認します。

## GitHub topic に出てきた専門ツール

| Tool | 本当のカテゴリ | 中心思想／用途 | この教材での扱い |
|---|---|---|---|
| TestCafe | Web E2E | hybrid automation、auto-wait、browser sandbox | Playwrightとのarchitecture比較 |
| Airtest | image-based UI automation | game/mobile/Windowsを画像認識とscriptで操作 | native/game UI章の発展Issue |
| Poco | UI inspection automation | Unity等のengine hierarchyをinspection | Airtestと組み合わせる専門層 |
| EarlGrey | iOS UI automation | synchronizationをframeworkが担う | XCTest/EarlGrey比較Issue |
| Dredd | API contract validation | OpenAPI/API Blueprintに実装を合わせる | schema-driven contract枠 |
| Pact JS/Go | consumer-driven contract | consumer usage例からcontractを生成 | 実装ラボあり |
| Infection | mutation testing | AST mutationでtest suiteの検出力を測る | PHPラボと全言語比較 |
| mountebank | service virtualization | over-the-wire imposters | integration環境の境界fake |
| Instancio | test data generator | Java object graphを自動生成 | Object Motherとの比較Issue |
| chaos-monkey-spring-boot | chaos testing | Spring Boot内にfailureを注入 | resilience lane |
| bash_unit | shell unit test | xUnit styleをBashへ持ち込む | shell test発展Issue |
| tlsfuzzer | protocol conformance/fuzz | TLS state/protocolを検証 | security専門tool |
| LightBDD | BDD layer | xUnit/NUnit/MSTest上でscenario表現 | specification by example |
| webtau | multi-protocol test DSL | HTTP/GraphQL/WebSocket/DB/CLIを同一matcherで検証 | JVM integration/E2E |
| Portman | OpenAPI→Postman | specからcollection/testを生成 | API pipeline |
| httpmock/mockito (Rust) | HTTP mock server | process境界のHTTP responseを制御 | mock server比較 |
| Testsigma | test automation platform | authoring・execution・managementを統合 | frameworkとは別カテゴリ |
| MyTested.AspNetCore.Mvc | framework-specific test DSL | ASP.NET MVC actionをfluentに検証 | adapter型tool |
| Atata | C# Web UI DSL | Page ObjectとSelenium automation | UI abstraction比較 |
| TcUnit | PLC unit test | TwinCAT 3のindustrial code | domain-specific framework |
| QTAF／Seldom／LimApiTest | automation framework/platform | Python/Java系の業務test automation | maintenanceとfitを個別評価 |
| xtd | application framework + xUnit | C++20 cross-platform toolkit内のtest | Catch2とはscopeが異なる |
| testza | Go assertion/helper | 標準testingを補助 | 標準のみとのtradeoff |
| Japa | test runner primitives | Node/AdonisJS ecosystemのrunner core | framework author向け |
| lab | hapi ecosystem test utility | hapi向けNode test | ecosystem fitの例 |
| atoum | PHP unit framework | fluent/modern PHP test | PHPUnitとの差別化確認 |
| Pulsar | concurrent framework | test-framework topicは副次的 | test toolとして選ばない |
| MyTested.WebApi | legacy ASP.NET Web API DSL | Web API 2向け | 新規ASP.NET Coreでは対象外 |
| QTAF | Tencent automation framework | extensible QA automation | community・docs・fitを評価 |

## 選定で見るべき項目

star数や最終更新日だけでなく、次を採点します。

1. 対象test layerとの一致
2. failure outputの質
3. isolationとparallel execution model
4. async／clock／random／I/O制御
5. IDE、build、CI統合
6. extension/pluginの安定性
7. version policyとruntime互換性
8. migration cost
9. maintainershipとsecurity response
10. teamがdebugできるか

