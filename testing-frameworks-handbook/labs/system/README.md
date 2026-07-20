# System vertical slice lab

1つのcheckout Web applicationへcomponent、real HTTP integration、API
contract、property、Storybook browser component/accessibility、browser E2Eの
各test layerを当てます。
test名の`[component/in-process]`、`[integration/real-http]`、
`[contract/real-http]`、Storybook project、`[system/browser-*]`が実際に
通る境界を示します。

## Quick start

handbook rootからNix shellだけでtoolchainとdependencyを揃えられます。

```bash
nix develop .#api --command uv sync --frozen --project labs/system/api-tests
nix develop .#api --command make test-system-api
nix develop .#node --command make test-system-storybook
nix develop .#node --command make test-system-e2e-stability
```

全labのbootstrapを先に済ませた場合は、system lab内の個別commandも使えます。

```bash
npm ci
npm run verify:browser-lock

npm test
npm run test:http-stability
npm run test:storybook
npm run test:e2e
npm run test:e2e:stability
npm run build-storybook
```

`npm test`はcomponent、HTTP integration、contract、propertyを順に実行します。
個別に確認するときは次を使います。

```bash
npm run test:component
npm run test:http-integration
npm run test:contract
npm run test:property
npm run test:api-schema
npm run test:pact
```

従来名の`npm run test:http-adapter`は`test:http-integration`への互換aliasです。
`test:api-schema`はNode、Python 3.13、uv、Schemathesisを含む`.#api`
shellで実行します。Python packageは`api-tests/uv.lock`から復元され、
uvによるPython downloadは無効です。

## Scope、boundary、double、oracle

| Test layer | Scope / real boundary | Double | Oracle |
|---|---|---|---|
| component | `createCheckout`とcheckout command factoryを同一processで直接呼ぶ。HTTP、JSON、socketは通さない | payment/repository port、command factoryではUUID source | returned order、capture→saveの順序、invalid commandでportを呼ばないこと、order ID isolation |
| real HTTP integration | ephemeral TCP port上のNode HTTP server、router、request stream、JSON、response serializer、real HTTP client | componentの外側にあるpayment/repository portだけ | status、content type、body、trace ID、abort reason、save有無、unique port |
| provider contract | `openapi.yaml`で公開するsuccess/problem responseをreal HTTP stackから取得 | external infrastructure | field集合と型、media type、`X-Trace-Id`とbody `traceId`の一致 |
| consumer contract | real `createOrderClient`でPact mockを呼び、生成したPact V4をreal HTTP providerへ再生 | paymentとrepositoryの外部infrastructure | consumerが使うfield、minimal matcher、provider state、互換性 |
| schema property | OpenAPI 3.1からSchemathesisがpositive/negative requestを生成しreal HTTPへ送る | なし | status/content/header/response schema、4xx rejection、5xxなし |
| stateful API | OpenAPI LinkをたどるPOST→GET→DELETE→GET | in-memory order store | create後の可用性、delete後の非可用性、response schema |
| property | pureな`totalOf`をgenerated itemsで呼ぶ | なし | valid itemを追加してtotalが減らないinvariant |
| browser component | Storybook 10.5.2、Vitest browser mode、Playwright Chromium、production Web Component | order clientだけ | state matrix、role/name interaction、addon-a11y violation |
| browser E2E | application server、Chromium/Firefox/WebKit、testごとのBrowserContext、DOM、fetch、real HTTP | failure journeyだけ`/orders`をHTTP 503で置換。server外部portはin-memory | role経由で観測するsuccess statusとfailure alert |
| CSS token contract | production CSS sourceをNode component testで読む | なし | typography・layout・colorの主要declarationが`:root` custom propertiesを参照 |

component testのfailureはcheckout ruleまたはport orchestrationへ局所化できます。
HTTP integrationはそれに加えてwire format、stream lifecycle、timeout、
client disconnect、body limit、port isolationを検出します。browser testへ同じ
edge caseを重複させず、user journeyだけを最上位に残します。

## Storybook browser component gate

`checkout-panel.stories.js`はproduction Web Componentを次のstate matrixで
表示します。CSSはstory専用に複製せず、productionの`checkout.css`を読み込みます。

| Story | Phase | Primary oracle |
|---|---|---|
| `Ready` | ready | 購入操作が可能 |
| `Submitting` | submitting | buttonがdisabledでbusy状態 |
| `Confirmed` | confirmed | 確定statusとtotal |
| `Failed` | failed | alert roleと安全なerror message |
| `InteractiveCheckout` | ready → confirmed | accessible nameでbuttonを操作しstatusを待つ |

```bash
nix develop .#node --command make test-system-storybook
```

`@storybook/addon-vitest`はstoryをVitest testへ変換し、
`@vitest/browser-playwright`のheadless Chromiumで5件を実行します。
interactionは`getByRole('button', { name: 'Buy two books' })`と
`getByRole('status')`だけを使い、CSS class、test ID、component instanceへ
coupleしません。`addon-a11y`の`a11y.test = 'error'`をpreview全体へ設定しているため、
自動検出されたaccessibility violationは同じCI targetをfailさせます。

旧Jest-based `@storybook/test-runner`は導入しません。Viteを使えるこのlabでは
公式migration guideが後継として示すVitest addonへ直接移行済みで、
lock検査もdeprecated packageの再導入を拒否します。Visual regressionは
reviewed baselineとrender determinismが別途必要なため、このgateのoracleへ
暗黙に混ぜません。

## Playwright critical journey gate

E2Eはuser-visibleな2 journeyだけをChromium、Firefox、WebKitで実行します。

| Journey | Boundary | Primary oracle |
|---|---|---|
| checkout success | production page → Web Component → fetch → real application server | buttonをrole/nameで操作し、statusが`CONFIRMED: 1200`になる |
| checkout failure | production page → Web Component → browser内HTTP 503 route | buttonをrole/nameで操作し、alertが`Order API returned HTTP 503`になる |

Playwrightがtestごとに新しいBrowserContextとpageを作ります。さらにproductionの
`createCheckoutCommand`は`crypto.randomUUID()`から毎回異なるorder IDを作り、
共有server storeでもproject/repeat間のdata collisionを避けます。failure routeも
そのpage/contextだけに属するためsuccess journeyへ漏れません。固定sleepは使わず、
locator actionとweb-first assertionのauto-waitへ同期を任せます。

```bash
nix develop .#node --command bash -lc \
  'cd labs/system && npm run verify:browser-lock && npm run test:e2e'
nix develop .#node --command make test-system-e2e-stability
```

通常runはtrace/videoを最初のfailure時だけ保持し、screenshotはfailure時だけ
保存します。custom reporterは各attemptのstatusとretry番号をJSONへ書き、
retry前のfailure、retry attempt、recovered flaky testを別々に数えます。
stability targetは2 shardを順番に1 workerずつ実行して100回repeatし、
`100 × 2 journeys × 3 browsers = 600 attempts`を検証します。retry後にgreenでも
最初のattemptがfailしていればgateをfailさせるため、retryでflakeを隠しません。
browser/ffmpeg process自身がhostを飽和させない値をdefaultにし、専用runnerで
並列度を上げる場合だけ`E2E_STABILITY_WORKERS`を明示します。調査時は
`E2E_STABILITY_RUNS=10`のように回数を下げられます。

state matrixと自動accessibilityはStorybook、CSS token参照はsource component
test、wire/schema edgeはHTTP/contract/schema testがownerです。E2Eからaxe、
CSSOM、API shapeの重複assertionを外し、browser surface間を通る2 journeyだけを
残しています。

## Pact consumer/provider compatibility gate

consumer testはproductionの`createOrderClient`をPact mock serverへ接続し、
1 interactionのPact V4を`.pact-artifacts/`へ生成します。consumerが送信する
request body、返却される`orderId`、確定状態`CONFIRMED`はexact valueです。
cartごとに変化してよい`total`だけへinteger matcherを置き、body全体を
緩いtype matcherにしません。

provider verificationは生成したPactをephemeral port上のreal `createApp`へ
再生します。provider state `checkout can be confirmed`のsetup handlerは
in-memory storeをclearし、interactionごとに既知のstateを作ります。

```bash
nix develop .#node --command make test-system-pact
```

このtargetは次のacceptance oracleも実行します。

- production providerはpassし、provider state handlerが1回実行される
- `status: PENDING`へ変えたbreaking providerはverificationに失敗する
- consumerが参照しない`auditId`をprovider responseへ加えてもpassする

`createOrderClient`も`orderId`、`total`、`status`だけを返すため、providerの
内部都合のfieldをconsumer modelへ漏らしません。生成directoryはGit管理外で、
consumer testが対象Pactを毎回消してから再生成するためstale interactionを
provider verificationへ混ぜません。

### Pending/WIPとdeploy policy

shared Pact Brokerを導入する場合は次をrequired policyにします。local fileだけを
使うこのlabではbroker credentialやremote availabilityをtest前提にしません。

| Stage | Broker metadata / selector | Gate |
|---|---|---|
| consumer CI | consumer version=`GIT_SHA`、branch、main branchを登録してgreen testのPactをpublish | feature branchの新contractはprovider成功前のcandidateとし、consumer deployを許可しない |
| provider CI | provider version=`GIT_SHA`、branch、`mainBranch`と`deployedOrReleased` selector、`enablePending: true`、`includeWipPactsSince: 2026-07-19` | verification resultをpublish。新しいpending/WIP failureはprovider buildを保護して可視化し、一度成功したcontractのregressionはbuildをfail |
| deploy前 | deployするparticipant/versionとtarget environmentを指定して`can-i-deploy` | consumer/providerのどちらもnon-zeroならdeploy禁止 |
| deploy後 | participant/version/environmentのdeploymentをrecord | 次のprovider verificationと`can-i-deploy`が実際のdeploy matrixを参照 |

`pending`はPact fileへ固定する属性ではなく、Broker上で「そのprovider branchが
まだ成功検証していないconsumer version」から判定します。WIPはprovider selectorに
まだ選ばれない新しいbranch Pactも上記の日付以降なら検証対象へ含めます。
したがって新contractの失敗はproviderの既存変更を不必要に止めませんが、
対応providerがgreenになるまでconsumer側の`can-i-deploy`は通りません。

### OpenAPI conformanceとの境界

| Risk | OpenAPI/Schemathesis | Pact |
|---|---|---|
| coverage source | providerが公開する全schemaとoperation | consumerが実際に呼ぶinteraction |
| input exploration | positive/negative boundaryとstateful Linkを生成 | consumer testが選んだbusiness exampleを再生 |
| response shape | `additionalProperties: false`を含む公開schema全体 | consumerが必要とするfieldだけ。追加fieldは互換 |
| state | resource lifecycleをschema Linkから探索 | named provider state handlerでconsumer前提を構築 |
| delivery decision | provider API descriptionとimplementationのconformance | participant version間の互換性と`can-i-deploy` |

status、media type、共通response fieldの一部は両方が観測しますが、primary oracleは
OpenAPIがprovider-wide schema、Pactがconsumer compatibilityです。このlabの
`auditId`注入はPactでは互換ですが、公開APIへ実際に追加するなら
`additionalProperties: false`のOpenAPIも先に更新します。

## OpenAPI property and stateful gate

`openapi.yaml`はrequestとresponseのobjectを
`additionalProperties: false`にし、文字列長、数値上限、item数、
order ID patternをproduction validationと同じ値へ揃えます。`201 Location`
とOpenAPI Linkで`createOrder`→`getOrder`→`deleteOrder`→`getOrder`を表し、
最後のGETは404になることを`use_after_free` checkが確認します。

runnerはseed `20260719`、`PYTHONHASHSEED=0`、
`--generation-database none`を使います。現在の固定runでは
positive/negative 109 cases、100件以上のstateful cases、
API Links 5/5を検証します。statefulのcase/scenario件数は観測値であり
pass条件にはせず、seedと保存corpusをfailure再現の識別子にします。
発見済みの最小入力5件は
`api-tests/corpus/regressions.json`へ保存し、生成testより先に毎回再生します。
runtime databaseへ書かないため、test後のGit差分は発生しません。

acceptance criterion自体の退行を防ぐため、runnerは正しいapplicationを通した後、
次のfaultを1つずつ注入し、Schemathesisがnon-zeroになることも確認します。

- undocumented 500 response: `not_a_server_error`
- `total`をstringにしたresponse: `response_schema_conformance`
- schema外の`debug` fieldを追加したresponse: `additionalProperties: false`

### 隣接toolとの役割差

| Tool | Caseのsource | 得意な役割 | このgateとの差 |
|---|---|---|---|
| Schemathesis | OpenAPI/GraphQL schemaから自動生成 | positive/negative edge、response conformance、OpenAPI Linkのstateful探索 | このlabで採用。少数の手書きexampleだけでは届かない入力空間を担当 |
| Dredd | API BlueprintまたはOpenAPI 2の記述例 | API descriptionと実装のexample-based validation | 公式資料の対応はOpenAPI 2までで、OpenAPI 3.1の生成/stateful gateには使わない |
| Prism | OpenAPI 2/3.0/3.1またはPostman Collection | 実装前のmock server、実trafficを通すvalidation proxy | requestを大量生成したりresource lifecycleを探索するrunnerではない |
| Hurl | 人が書くplain-text HTTP sequence | 読みやすいsmoke/journey、captureした値を次requestへ渡す | POST→GET→DELETEを明示する用途には良いが、schema edgeを自動生成しない |
| PactumJS | JavaScriptのrequest/expectation DSL | REST component/contract/E2E flow | fuzz機能は公式にexperimentalかつSwagger v2部分対応で、OpenAPI 3.1 gateの代替にしない |
| Karate | Gherkin DSL | API、mock、UI、performanceを同じJVM toolchainで統合 | 手書きbusiness flowには強いが、OpenAPIからのpositive/negative/stateful自動探索とは目的が違う |

組み合わせる場合は、Schemathesisをschema探索、Hurl/PactumJS/Karateを重要な
business journey、Prismをdesign-first mock/proxyへ割り当てます。同じassertionを
複数toolへコピーするのではなく、各riskのownerを1つにします。

## HTTP failure contract

`POST /orders`は成功時も失敗時も`X-Trace-Id`を返します。安全な
request trace IDがあれば引き継ぎ、なければUUIDを生成します。error responseは
`application/problem+json`で、`type`、`title`、`status`、`detail`、
`instance`、`traceId`を持ちます。

| Condition | HTTP | Component side effect |
|---|---:|---|
| invalid JSON | 400 | componentを呼ばない |
| body limit超過 | 413 | componentを呼ばない |
| checkout validation error | 422 | invalid位置より後のportを呼ばない |
| deadline超過 | 504 | signalをabortし、saveしない |
| unexpected failure | 500 | internal detailを公開しない |
| client disconnect | responseなし | signalをabortし、saveしない |

Node request streamの正常なcloseをclient cancellationと誤認しないよう、
responseの`close`と`writableEnded`を組み合わせてdisconnectだけを
`AbortController`へ伝えます。

## HTTP parallel and stability gate

serverは固定portを使わず`127.0.0.1:0`でlistenします。integration suiteは
8 serverを並列起動し、OSが割り当てたportがすべて異なることと、各serverが
同時に201を返すことを確認します。

```bash
npm run test:http-stability
```

このgateは6-caseのreal HTTP integration suiteを新しいNode test processで
100回連続実行します。途中で失敗するとrun番号とstdout/stderrを残します。
調査時だけ`HTTP_STABILITY_RUNS=10`のように回数を上書きできますが、CIと
acceptance criterionはdefaultの100回です。

## Shared CSS tokens

checkout pageのstyleは`:root`のCSS custom propertiesをsource of truthにします。
font family/size/line height、spacing、content width、border/radius、colorを
token化し、selector内へ同種のliteralを散在させません。見た目を変更するときは
まず`--font-*`、`--space-*`、`--color-*`などのtokenを更新します。
`[component/source-css]` testはproduction CSS sourceを直接読み、主要tokenの
存在とselectorからの参照を高速に検証します。`:root`外のraw colorと
tokenを使わない`font-size`も拒否し、style追加時のばらつきを防ぎます。

## Browser reproducibility

Nixの`node` shellはNode 24に加え、pinned nixpkgsの
`playwright-driver.browsers`からChromium、Firefox、WebKitを供給します。
`PLAYWRIGHT_BROWSERS_PATH`をNix storeへ固定し、npm packageの暗黙downloadや
system browserへのfallbackを許しません。LinuxではNixのMesa EGL/DRI pathと
software renderingもshellで固定するため、非NixOS hostのGPU driverを前提に
しません。

`verify:browser-lock`は`@playwright/test`、`playwright`、
`playwright-core`、Nix driverがすべて1.61.1であることに加え、
`browsers.json`のChromium 1228、Firefox 1532、WebKit 2311と各実行binaryを
照合します。Nixを使わない直接bootstrapだけは同じnpm lockから3 browserを
downloadするfallbackを持ちます。

## Primary references

- [Node.js HTTP](https://nodejs.org/api/http.html)
- [Node.js test runner](https://nodejs.org/api/test.html)
- [Node.js AbortController and AbortSignal](https://nodejs.org/api/globals.html#class-abortcontroller)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Schemathesis CLI reference](https://schemathesis.readthedocs.io/en/stable/reference/cli/)
- [Schemathesis stateful testing](https://schemathesis.readthedocs.io/en/latest/guides/stateful-testing/)
- [Dredd documentation](https://dredd.org/)
- [Prism official repository](https://github.com/stoplightio/prism)
- [Hurl manual](https://hurl.dev/docs/manual.html)
- [PactumJS fuzz testing](https://pactumjs.github.io/guides/fuzz-testing.html)
- [Karate documentation](https://docs.karatelabs.io/)
- [Pact JS consumer tests](https://docs.pact.io/implementation_guides/javascript/docs/consumer)
- [Pact JS provider verification](https://github.com/pact-foundation/pact-js/blob/master/docs/provider.md)
- [Pending and WIP pacts](https://docs.pact.io/pact_broker/advanced_topics/pending_pacts)
- [Pact Broker `can-i-deploy`](https://docs.pact.io/pact_broker/can_i_deploy)
- [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)
- [Storybook interaction testing](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Storybook accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [Migrating from the Storybook test-runner](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/migration-guide)
- [Playwright browsers](https://playwright.dev/docs/browsers)
- [Playwright projects](https://playwright.dev/docs/api/class-testproject)
- [Playwright isolation](https://playwright.dev/docs/browser-contexts)
- [Playwright auto-retrying assertions](https://playwright.dev/docs/test-assertions)
- [Playwright retries](https://playwright.dev/docs/test-retries)
- [Playwright sharding](https://playwright.dev/docs/test-sharding)
- [Playwright trace and screenshot options](https://playwright.dev/docs/test-use-options)
- [Playwright video options](https://playwright.dev/docs/videos)
- [Playwright custom reporters](https://playwright.dev/docs/api/class-reporter)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
