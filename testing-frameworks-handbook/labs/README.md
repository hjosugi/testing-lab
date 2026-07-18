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
| `jvm-checkout/in-process-component/classical-state` | [`ClassicalCheckoutTest.java`](java/src/test/java/handbook/checkout/ClassicalCheckoutTest.java) | sociable unit / parameterized | 実物はJavaのcheckout component、doubleは手書きfake paymentとin-memory repository、oracleはTruthで確認する結果とstate、riskはdomain計算と保存behaviorの退行です。 |
| `jvm-checkout/collaborator-ports/london-protocol` | [`LondonCheckoutTest.java`](java/src/test/java/handbook/checkout/LondonCheckoutTest.java) | solitary unit | 実物は`CheckoutService`、doubleはMockitoのpayment/repository port、oracleはinteractionとno-interaction、riskは重要messageとempty-cart protocolの破壊です。 |
| `dotnet-checkout/in-process-component/nunit-behavior` | [`CheckoutTests.cs`](dotnet/tests/NUnitTests/CheckoutTests.cs) | sociable unit / parameterized / spy / async failure | 実物は.NETのcheckout component、doubleはfake paymentとmemory repository、oracleはresult・記録interaction・例外・no-save、riskは計算、cancel、非同期決済失敗、collaborationの退行です。 |
| `dotnet-checkout/in-process-component/mstest-behavior` | [`CheckoutTests.cs`](dotnet/tests/MSTestTests/CheckoutTests.cs) | sociable unit / parameterized / spy / async failure | 実物は.NETのcheckout component、doubleはfake paymentとmemory repository、oracleはresult・記録interaction・例外・no-save、riskはNUnitと同じbehaviorのframework/platform間driftです。 |
| `dotnet-cart-item/in-process-unit/mstest-rules` | [`CartItemTests.cs`](dotnet/tests/MSTestTests/CartItemTests.cs) | example / parameterized unit | 実物は`CartItem` value object、doubleはなし、oracleはsubtotalのexact valueと例外type、riskは算術または入力validationの退行です。 |
| `cpp-checkout/in-process-component/catch2-behavior` | [`checkout_test.cpp`](cpp/tests/checkout_test.cpp) | sociable unit / generated cases / spy | 実物はC++のcheckout component、doubleはfake paymentとmemory repository、oracleはstateと記録interaction、riskはquantity別計算とcollaboration protocolの退行です。 |
| `go-checkout/in-process-component/testing-and-fuzz` | [`checkout_test.go`](go/checkout_test.go) | sociable unit / table / fuzz | 実物はGoのcheckout componentと`Total`、doubleはfake paymentとmemory repository、oracleはstate・interaction・積のproperty、riskは並列case、orchestration、広い整数入力の欠陥です。 |
| `rust-checkout/in-process-component/rstest-behavior` | [`checkout.rs`](rust/tests/checkout.rs) | public-API component / parameterized / spy | 実物はRust crateのpublic checkout API、doubleはfake paymentとmemory repository、oracleはresultと記録interaction、riskはcrate境界の計算とcollaboration退行です。 |
| `php-checkout/in-process-component/phpunit-behavior` | [`CheckoutTest.php`](php/tests/CheckoutTest.php) | sociable / solitary unit / parameterized | 実物はPHPのcheckout component、doubleはfakeまたはPHPUnit mockのpayment/repository port、oracleはstateとinteraction、riskは計算またはorchestrationの退行です。 |
| `checkout/http-adapter/create-order` | [`checkout-http-adapter.test.js`](system/test/checkout-http-adapter.test.js) / `npm run test:http-adapter` | HTTP adapter test | 実物はephemeral TCP上のNode HTTP server・router・JSON・client、doubleはpaymentとrepository adapter、oracleはstatus・body・呼出順、riskはHTTP wiringとserializationの破壊です。 |
| `checkout/http-contract/provider-response` | [`contract.test.js`](system/test/contract.test.js) / `npm run test:contract` | provider contract test | 実物はproviderのHTTP stackとresponse serializer、doubleは外部infrastructure、oracleは公開responseのheader・field・type、riskはconsumer互換性の破壊です。 |
| `checkout/in-process-function/total-property` | [`property.test.js`](system/test/property.test.js) / `npm run test:property` | property-based unit | 実物は`totalOf`、doubleはなし、oracleはitem追加でtotalが減らないproperty、riskはexampleだけでは漏れる生成inputの計算欠陥です。 |
| `checkout/browser-to-http/critical-journey` | [`checkout.spec.js`](system/test/e2e/checkout.spec.js) / `npm run test:e2e` | browser E2E / system | 実物はPlaywright Chromium・DOM・HTTP server、doubleはpaymentとrepository、oracleはrole経由のuser-visible status、riskは購入journeyのsurface間断絶です。 |
| `checkout/browser-dom/accessibility` | [`checkout.spec.js`](system/test/e2e/checkout.spec.js) / `npm run test:e2e` | accessibility system test | 実物はChromium DOMとapplication、doubleはpaymentとrepository、oracleはaxe ruleのviolation集合、riskは自動検出可能なaccessibility退行です。 |
| `checkout/in-process-techniques/risk-portfolio` | [`advanced.test.js`](advanced/test/advanced.test.js) | example / generative / model / concurrency / resilience / security / characterization | 実物はadvanced production functionsとstate model、doubleは制御したin-process collaboratorだけ、oracleはexample・property・reference・model・golden・invariant、riskは単一exampleでは漏れる入力・並行・障害・secret・性能退行です。 |

この表にないsuiteを追加するときは、実装と同じ変更でcanonical名と4項目の要約も追加します。

## Advanced比較ラボ

[advanced/README.md](advanced/README.md)では、同じproduction codeへexample、property、metamorphic、differential、model-based、concurrency、fault injection、characterization、snapshot、security、performanceを重ねます。フレームワークの構文ではなく、各技法の検出能力を比較してください。
