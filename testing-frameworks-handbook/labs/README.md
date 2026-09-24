# Hands-on labs

すべてのラボは同じcheckout behaviorを実装します。

## 進め方

1. production codeを読む
2. Classical testを実行
3. London testを実行
4. internal refactorを行い、どちらが壊れるか観察
5. payment failureを追加
6. parallel実行で共有状態がないことを確認
7. mutationを手動で入れ、testが失敗するか確認

## 共通要件

- empty cartは拒否
- totalはquantity × unit priceの合計
- payment capture成功後にconfirmed orderを保存
- payment failure時はconfirmed orderを保存しない
- domain eventはconfirmed orderに対応

## command

```bash
./scripts/test-all.sh
```

個別commandは各language directoryのREADMEを参照してください。

## 現在のsuite taxonomy mapping

canonical suite名は [`<subject>/<real-boundary>/<purpose>` 規約](../docs/00-map.md#suite命名規約)に従います。最後の列は、各suiteの実物、double、oracle、riskを1文で固定したreview用の要約です。

| Canonical suite | 実装 | Taxonomy | 実物・double・oracle・risk |
|---|---|---|---|
| `node-checkout/in-process-component/classical-state` | [`test/node/classical.test.js`](node/test/node/classical.test.js) | sociable unit / in-process component | 実物は`CheckoutService`とdomain object、doubleはfake paymentとin-memory repository、oracleはtotalと保存・決済state、riskは計算または永続化順序の退行です。 |
| `node-checkout/collaborator-ports/london-protocol` | [`test/node/london.test.js`](node/test/node/london.test.js) | solitary unit | 実物は`CheckoutService`、doubleはNode mockのpayment/repository port、oracleは引数と呼出回数、riskは決済後に注文を保存するprotocolの破壊です。 |
| `node-checkout/collaborator-ports/mocha-sinon-protocol` | [`test/mocha/london.test.js`](node/test/mocha/london.test.js) | solitary unit | 実物は`CheckoutService`、doubleはSinon stubのpayment/repository port、oracleはinteractionとconfirmed state、riskはorchestration messageの欠落や誤順序です。 |
| `node-checkout/in-process-component/ava-state` | [`test/ava/classical.test.js`](node/test/ava/classical.test.js) | sociable unit / in-process component | 実物は`CheckoutService`とdomain object、doubleはfake paymentとin-memory repository、oracleはtotalと保存state、riskはisolated worker内のdomain退行です。 |
| `python-checkout/in-process-component/classical-state` | [`tests/test_classical.py`](python/tests/test_classical.py) | sociable unit / parameterized | 実物はPythonのcheckout component、doubleはfake gatewayとin-memory repository、oracleは結果・capture・保存stateと例外、riskは計算・失敗時保存・境界caseの退行です。 |
| `python-checkout/collaborator-ports/london-protocol` | [`tests/test_london.py`](python/tests/test_london.py) | solitary unit | 実物は`CheckoutService`、doubleはautospecしたpayment/repository port、oracleはinteractionとno-interaction、riskはorchestration contractとempty-cart guardの破壊です。 |
| `python-order-repository/in-process-fake/shared-contract` | [`tests/test_repository_contract.py`](python/tests/test_repository_contract.py) | fake contract | 実物は共有contract suite、doubleはin-memory repository、oracleはsave/find/not-found/duplicate error、riskはfast fakeがconsumer contractからdriftすることです。 |
| `python-order-repository/real-postgres/contract-and-engine-semantics` | [`postgres_tests/`](python/postgres_tests/) / `make test-python-postgres` | Testcontainers integration / shared contract | 実物はPsycopg adapter、digest固定Postgres 18.4、production migration、Ryuk、doubleはなし、oracleは共有behavior・constraint・rollback・lock・UTC・cleanup、riskはfakeとSQL/driver/engine/lifecycleの差です。 |
| `jvm-checkout/in-process-component/classical-state` | [`ClassicalCheckoutTest.java`](java/src/test/java/handbook/checkout/ClassicalCheckoutTest.java) | sociable unit / parameterized | 実物はJavaのcheckout component、doubleは手書きfake paymentとin-memory repository、oracleはTruthで確認する結果とstate、riskはdomain計算と保存behaviorの退行です。 |
| `jvm-checkout/collaborator-ports/london-protocol` | [`LondonCheckoutTest.java`](java/src/test/java/handbook/checkout/LondonCheckoutTest.java) | solitary unit | 実物は`CheckoutService`、doubleはMockitoのpayment/repository port、oracleはinteractionとno-interaction、riskは重要messageとempty-cart protocolの破壊です。 |
| `dotnet-checkout/in-process-component/nunit-behavior` | [`CheckoutTests.cs`](dotnet/tests/NUnitTests/CheckoutTests.cs) | sociable unit / parameterized / spy / async failure | 実物は.NETのcheckout component、doubleはfake paymentとmemory repository、oracleはresult・記録interaction・例外・no-save、riskは計算、cancel、非同期決済失敗、collaborationの退行です。 |
| `dotnet-checkout/in-process-component/mstest-behavior` | [`CheckoutTests.cs`](dotnet/tests/MSTestTests/CheckoutTests.cs) | sociable unit / parameterized / spy / async failure | 実物は.NETのcheckout component、doubleはfake paymentとmemory repository、oracleはresult・記録interaction・例外・no-save、riskはNUnitと同じbehaviorのframework/platform間driftです。 |
| `dotnet-cart-item/in-process-unit/mstest-rules` | [`CartItemTests.cs`](dotnet/tests/MSTestTests/CartItemTests.cs) | example / parameterized unit | 実物は`CartItem` value object、doubleはなし、oracleはsubtotalのexact valueと例外type、riskは算術または入力validationの退行です。 |
| `cpp-checkout/in-process-component/catch2-behavior` | [`checkout_test.cpp`](cpp/tests/checkout_test.cpp) | sociable unit / SECTION / generated cases / spy / benchmark | 実物はC++のcheckout component、doubleはfake paymentとmemory repository、oracleはstate・記録interaction・section isolation・benchmark checksum、riskは計算、fixture、collaboration、最適化による測定消去です。 |
| `cpp-runtime/native-process/sanitizer-oracles` | [`sanitizer_probe.cpp`](cpp/tests/sanitizer_probe.cpp) | ASan / UBSan / TSan expected failure | 実物はsanitizer-instrumented process、doubleはなし、oracleはnon-zero exitと固有diagnostic、riskはheap lifetime、signed overflow、data raceを通常assertionが見逃すことです。 |
| `go-checkout/in-process-component/testing-and-fuzz` | [`checkout_test.go`](go/checkout_test.go) | sociable/solitary unit / parallel table / fuzz / benchmark | 実物はGoのcheckout componentと`Total`、doubleはcase-local fake・file repository・generated GoMock、oracleはstate・interaction・overflow corpus・allocation・leak absence、riskはresource共有、race、goroutine leak、order dependence、整数overflowです。 |
| `go-runtime/native-process/intentional-failures` | [`failures_test.go`](go/intentional/failures_test.go) | race detector / goleak / shuffled expected failure | 実物はparallel goroutineとpackage state、doubleはなし、oracleはnon-zero exitと固有diagnostic、riskは通常assertionだけでは見逃すrace・leak・実行順依存です。 |
| `rust-checkout/in-process-component/rstest-behavior` | [`checkout.rs`](rust/tests/checkout.rs) | private unit / public integration / rstest fixture+case / proptest / mutation | 実物はRust crateのprivate subtotalとpublic checkout API、doubleはcase-local fake・memory repository、oracleはexample・reference property・7/7 mutant、riskはvisibility境界、計算、overflow、order、collaboration退行です。 |
| `rust-checkout/thread-boundary/trait-ownership` | [`trait_bounds.rs`](rust/tests/trait_bounds.rs) | compile-time trait bound / thread integration / compile-fail doc | 実物はgeneric checkoutとworker thread、doubleは`Arc<Mutex<_>>` payment/repository、oracleは`Send + Sync` assertion・recorded state・`Rc<RefCell<_>>` compile failure、riskはownershipやsynchronization requirementの誤配置です。 |
| `php-checkout/in-process-component/phpunit-behavior` | [`CheckoutTest.php`](php/tests/CheckoutTest.php) | sociable / solitary unit / parameterized / 12.5→13 migration | 実物はPHPのcheckout component、doubleはfakeまたはPHPUnit mockのpayment/repository port、oracleはstate・interaction・exception・no-call、riskは計算・validation・orchestration・major upgrade退行です。 |
| `php-checkout/in-process-component/infection-adequacy` | [`run-mutation.sh`](php/scripts/run-mutation.sh) / [`MUTATION_CLASSIFICATION.md`](php/MUTATION_CLASSIFICATION.md) | targeted mutation / equivalent classification | 実物はsubtotalとcheckout、doubleはPCOV coverageだけ、oracleは14/14 killed・MSI 100%・covered MSI 100%、riskはweak assertionとthreshold gamingです。 |
| `checkout/in-process-component/behavior` | [`checkout-component.test.js`](system/test/component/checkout-component.test.js) / `npm run test:component` | in-process component | 実物はHTTPから分離したcheckout component、doubleはpayment/repository port、oracleはresult・呼出順・invalid時のno-call、riskは計算・validation・orchestration退行です。 |
| `checkout/real-http/orders-integration` | [`orders-http-integration.test.js`](system/test/http/orders-http-integration.test.js) / `npm run test:http-integration` | real HTTP integration / stability | 実物はephemeral TCP上のNode HTTP server・router・stream・JSON・client、doubleはpayment/repository portだけ、oracleはstatus・problem body・trace・abort・unique port・100連続green、riskはwire、timeout、切断、size limit、parallel isolationの破壊です。 |
| `checkout/real-http/provider-contract` | [`contract.test.js`](system/test/contract.test.js) / `npm run test:contract` | provider contract test | 実物はproviderのHTTP stackとresponse serializer、doubleは外部infrastructure、oracleは公開success/problem responseのheader・field・type、riskはconsumer互換性とtrace correlationの破壊です。 |
| `checkout/pact-v4/consumer-provider-compatibility` | [`test/pact/`](system/test/pact/) / `npm run test:pact` | consumer-driven contract | 実物はproduction client、Pact mock、生成contract、ephemeral TCP上のprovider、doubleは外部payment/repository、oracleはminimal matcher・provider state・breaking/compatible change、riskはparticipant間のdeploy非互換です。 |
| `checkout/openapi-3.1/schema-property-stateful` | [`api-tests/run.mjs`](system/api-tests/run.mjs) / `npm run test:api-schema` | schema property / stateful API | 実物はOpenAPI 3.1、Schemathesis、real HTTP provider、doubleはなし、oracleはpositive/negative response conformance・API Link lifecycle・fault injection、riskは公開schemaと実装のdriftです。 |
| `checkout/in-process-function/total-property` | [`property.test.js`](system/test/property.test.js) / `npm run test:property` | property-based unit | 実物は`totalOf`、doubleはなし、oracleはitem追加でtotalが減らないproperty、riskはexampleだけでは漏れる生成inputの計算欠陥です。 |
| `checkout/browser-component/state-matrix` | [`checkout-panel.stories.js`](system/src/checkout-panel.stories.js) / `npm run test:storybook` | Storybook / browser component / interaction / accessibility | 実物はproduction Web Component・Storybook・Vitest browser mode・Chromium、doubleはorder clientだけ、oracleは5-state story matrix・role/name interaction・addon-a11y、riskはUI state・accessible contract・component wiringの退行です。 |
| `checkout/browser-to-http/critical-journey` | [`checkout.spec.js`](system/test/e2e/checkout.spec.js) / `npm run test:e2e`、`npm run test:e2e:stability` | browser E2E / cross-engine / sharded stability | 実物はfresh BrowserContextのChromium・Firefox・WebKit、production DOM・HTTP server、doubleはfailure journeyのHTTP 503 routeだけ、oracleはrole経由のsuccess status・failure alert・retry前failure metric、riskは購入journeyのsurface間断絶、engine差、data collision、flakeです。 |
| `checkout/source-css/design-token-contract` | [`checkout-css.test.js`](system/test/component/checkout-css.test.js) / `npm run test:component` | source contract / design token | 実物はproduction CSS source、doubleはなし、oracleはtypography・layout・color declarationの`:root` custom property参照、riskはstyle literalの分散とtoken driftです。 |
| `checkout/in-process-techniques/risk-portfolio` | [`advanced.test.js`](advanced/test/advanced.test.js) | example / generative / model / concurrency / resilience / security / characterization | 実物はadvanced production functionsとstate model、doubleは制御したin-process collaboratorだけ、oracleはexample・property・reference・model・golden・invariant、riskは単一exampleでは漏れる入力・並行・障害・secret・性能退行です。 |
| `checkout/source-mutants/risk-based-mutation` | [`labs/mutation/`](mutation/README.md) / `make test-mutation-policy`、`.github/workflows/mutation.yml` | mutation adequacy / change-based selection / decision ledger | 実物は8言語の高リスクproduction codeとlab自身のtest suite、doubleはなし、oracleはStryker/PIT/Infection/cargo-mutants/curated/catalog mutantのkillと期限付きdecisionの照合、riskは高リスクcodeのassertion不足がscoreやcoverageで隠れることです。 |
| `checkout-quote/real-http/performance-profiles` | [`labs/performance/`](performance/README.md) / `make test-performance`、`make test-performance-report` | microbenchmark / load / stress / spike / soak / capacity | 実物はephemeral TCP上のHTTP serverと明示したworker・queue modelのtarget、doubleはなし、oracleはopen-model latency（intended start基準）・SLO・503 shed・回復時間・queue/memory slope・capacity step、riskはcoordinated omissionやwarm-up混入、client bottleneck、functional E2E timingの流用で性能を誤って主張することです。 |
| `orders-api/real-http/abuse-cases` | [`labs/security/`](security/README.md) / `make test-security` | threat-model-driven abuse case / API fuzz / secret・SAST・workflow scan / SBOM | 実物はephemeral TCP上のmulti-tenant order API・node:sqlite・HMAC token/署名・rate limiter・audit log、doubleは時計だけ、oracleはIDOR・権限昇格・replay・token偽造・SQL injection・flood・secret漏洩・5xx不在と、各controlを外すと失敗する対照、riskはscanner件数に埋もれて攻撃可能な欠陥とfindingの放置を見逃すことです。 |
| `payment-client/simulated-and-real-network/resilience` | [`labs/resilience/`](resilience/README.md) / `make test-resilience` | deterministic simulation / fault injection / controlled chaos | 実物はretry・backoff・circuit breaker・idempotency keyを持つpayment clientとHTTP provider、doubleは仮想clock・scheduler・network・diskのseamとfault proxy、oracleはseedごとのtrace hash一致・double chargeなし・明示的失敗・breaker遷移・abort後のsteady state回復、riskは再現できない障害とretryによる二重課金です。 |

この表にないsuiteを追加するときは、実装と同じ変更でcanonical名と4項目の要約も追加します。

## Advanced比較ラボ

[advanced/README.md](advanced/README.md)では、同じproduction codeへexample、property、metamorphic、differential、model-based、concurrency、fault injection、characterization、snapshot、security、performanceを重ねます。フレームワークの構文ではなく、各技法の検出能力を比較してください。
