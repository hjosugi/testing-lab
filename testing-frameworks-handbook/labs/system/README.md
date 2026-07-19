# System vertical slice lab

1つのcheckout Web applicationへcomponent、real HTTP integration、API
contract、property、browser E2E、accessibilityの各test layerを当てます。
test名の`[component/in-process]`、`[integration/real-http]`、
`[contract/real-http]`、`[system/browser-*]`が実際に通る境界を示します。

## Quick start

handbook rootからNix shellだけでtoolchainとdependencyを揃えられます。

```bash
nix develop .#api --command uv sync --frozen --project labs/system/api-tests
nix develop .#api --command make test-system-api
```

全labのbootstrapを先に済ませた場合は、system lab内の個別commandも使えます。

```bash
npm ci
npm exec -- playwright install chromium
npm run verify:browser-lock

npm test
npm run test:http-stability
npm run test:e2e
```

`npm test`はcomponent、HTTP integration、contract、propertyを順に実行します。
個別に確認するときは次を使います。

```bash
npm run test:component
npm run test:http-integration
npm run test:contract
npm run test:property
npm run test:api-schema
```

従来名の`npm run test:http-adapter`は`test:http-integration`への互換aliasです。
`test:api-schema`はNode、Python 3.13、uv、Schemathesisを含む`.#api`
shellで実行します。Python packageは`api-tests/uv.lock`から復元され、
uvによるPython downloadは無効です。

## Scope、boundary、double、oracle

| Test layer | Scope / real boundary | Double | Oracle |
|---|---|---|---|
| component | `createCheckout`を同一processで直接呼ぶ。HTTP、JSON、socketは通さない | payment captureとrepository saveのin-memory port | returned order、capture→saveの順序、invalid commandでportを呼ばないこと |
| real HTTP integration | ephemeral TCP port上のNode HTTP server、router、request stream、JSON、response serializer、real HTTP client | componentの外側にあるpayment/repository portだけ | status、content type、body、trace ID、abort reason、save有無、unique port |
| provider contract | `openapi.yaml`で公開するsuccess/problem responseをreal HTTP stackから取得 | external infrastructure | field集合と型、media type、`X-Trace-Id`とbody `traceId`の一致 |
| schema property | OpenAPI 3.1からSchemathesisがpositive/negative requestを生成しreal HTTPへ送る | なし | status/content/header/response schema、4xx rejection、5xxなし |
| stateful API | OpenAPI LinkをたどるPOST→GET→DELETE→GET | in-memory order store | create後の可用性、delete後の非可用性、response schema |
| property | pureな`totalOf`をgenerated itemsで呼ぶ | なし | valid itemを追加してtotalが減らないinvariant |
| browser E2E | application server、Chromium、DOM、fetch、real HTTP | payment/repository port | role経由で観測する`CONFIRMED: 1200` |
| accessibility | application serverとChromium DOM | payment/repository port | axeが自動検出するviolation集合が空 |
| CSS token contract | application serverとChromium CSSOM | payment/repository port | typography・layoutの主要declarationが`:root` custom propertiesを参照 |

component testのfailureはcheckout ruleまたはport orchestrationへ局所化できます。
HTTP integrationはそれに加えてwire format、stream lifecycle、timeout、
client disconnect、body limit、port isolationを検出します。browser testへ同じ
edge caseを重複させず、user journeyだけを最上位に残します。

## OpenAPI property and stateful gate

`openapi.yaml`はrequestとresponseのobjectを
`additionalProperties: false`にし、文字列長、数値上限、item数、
order ID patternをproduction validationと同じ値へ揃えます。`201 Location`
とOpenAPI Linkで`createOrder`→`getOrder`→`deleteOrder`→`getOrder`を表し、
最後のGETは404になることを`use_after_free` checkが確認します。

runnerはseed `20260719`、`PYTHONHASHSEED=0`、
`--generation-database none`を使います。現在の固定runでは
positive/negative 109 cases、stateful 147 cases（25 scenarios）、
API Links 5/5を検証します。発見済みの最小入力5件は
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

## Parallel and stability gate

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
`[system/browser-css]` testは主要tokenの存在とselectorからの参照をCSSOMで
検証します。

## Browser reproducibility

Playwright browserはNix側の別packageを混ぜず、`package-lock.json`で固定した
`@playwright/test`自身にdownloadさせます。`verify:browser-lock`は
`@playwright/test`、`playwright`、`playwright-core`のversion一致、
`browsers.json`のChromium revision、実行binaryの存在を検証します。

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
