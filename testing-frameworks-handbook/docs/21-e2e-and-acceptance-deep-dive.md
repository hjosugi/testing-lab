# E2E・Acceptance・BDD完全ガイド

## E2Eの目的

E2E testはsystem全体のすべてのruleを確認するためではありません。重要な利用者journeyが、deployされた構成とreal interfaceを通って完了できることを確認します。

## Journeyの選び方

優先するもの:

- revenue-critical
- legal/compliance-critical
- high-frequency
- integration-heavy
- past incidents
- lower levelで再現できないbrowser/device behavior

ECサイト例:

1. guest purchase
2. authenticated purchase with saved payment
3. declined payment recovery
4. refund by support agent
5. password reset

色違い・数量違いの全組み合わせは下位層へ移します。

## E2E test design card

```yaml
journey: guest checkout
persona: unauthenticated customer
entry: browser
real: web, order service, database
controlled: payment sandbox, email capture
outcome: order confirmed and receipt visible
cleanup: tagged order deleted by API
timeout: 30s
diagnostics: trace, screenshot, network log
```

## Selector strategy

優先順:

1. role + accessible name
2. label
3. visible text
4. stable product-specific test id
5. CSS/XPath as last resort

`div:nth-child(3)`やgenerated classへ依存しません。

## Waiting

悪い例:

```js
await page.waitForTimeout(5000)
```

よい例:

```js
await expect(page.getByRole('status')).toHaveText('Confirmed')
```

network idleも万能ではありません。long polling/analyticsでidleにならない場合があります。user-visible conditionを待ちます。

## Test data

### API seeding

UIで前提dataを作らず、API/admin fixtureで高速に用意します。ただしjourney自体がdata creationならUIを通します。

### Unique identifiers

```text
e2e-<run>-<worker>-<test>
```

### Cleanup

- test-created resourceにtag
- API delete
- TTL janitor
- failureでもcleanup
- evidence保存後cleanup

## Authentication

loginを全testで繰り返さず、storage state/session fixtureを使えます。ただしlogin journey自体は別にE2Eします。

session reuseでは次を確認します。

- expiration
- parallel account collision
- role/tenant isolation
- secret storage

## Network control

browser network interceptionは、frontend behaviorを安定して確認するcomponent/browser testに有効です。system E2Eでbackendまでmockすると、E2Eの意味が変わります。test名とlayerを変更します。

## Browser matrix

毎PRですべてを回す必要はありません。

```text
PR: primary browser critical journeys
merge: Chromium + Firefox + WebKit
nightly: OS/device/locale matrix
release: supported matrix + visual/a11y
```

usage data、contract、past defectsからmatrixを選びます。

## Mobile E2E

### Emulator/simulator

速く自動化しやすい一方、camera、push、biometric、performance、vendor OS差は限定的です。

### Real device

hardware/OS integrationを確認できますが、調達、reset、parallel、failure artifactが難しくなります。

### Gray-box

Detox/EarlGrey/Espresso等はapp内部のidle/synchronization情報を利用し、black-boxより安定させます。

WebDriver、gray-box、image recognitionをemulator/real deviceと混同せず、
OS/device/input/networkをrisk-basedに削減する具体例は
[Mobile／desktop／game／device matrix設計](32-mobile-desktop-game-device-matrix.md)
を参照してください。device farm/HILにはartifact、owner、予約、resetを含む
execution contractが必要です。

## Visual testing

### Pixel diff

完全pixel一致。deterministic renderが必要です。

### Perceptual diff

人が気づく差へ近づけますが、threshold tuningが必要です。

### DOM/structure snapshot

見た目を完全には保証しません。

固定するもの:

- browser/version
- OS/font
- viewport/DPR
- animation
- time/random/data
- color mode/locale

baseline更新にはreviewerと理由が必要です。

## Accessibility testing

自動ruleで見つけられるもの:

- missing accessible name
- contrastの一部
- invalid ARIA
- form label
- heading structureの一部

自動では不十分なもの:

- keyboard journey usability
- screen reader announcement quality
- focus order meaning
- cognitive load
- voice control
- meaningful alternative text

自動 + keyboard + screen reader + user testingを組み合わせます。

## Acceptance testing

Acceptance testは「利用者が受け入れられる完成条件」を検証します。UI automationと同義ではありません。

API level acceptance:

```text
Given customer has valid cart
When checkout command is submitted
Then confirmed order is returned
```

UI level acceptance:

```text
Given customer is on checkout page
When payment is submitted
Then confirmation is visible
```

最も安定して意味を伝えられるlevelを選びます。

## ATDD

実装前にproduct/QA/engineeringがacceptance exampleを合意します。

流れ:

1. story/ruleを説明
2. examplesとcounterexamples
3. unanswered questions
4. acceptance criteria
5. automation levelを選択
6. implementation

## BDD

BDDはGiven-When-Then syntaxではなく、exampleを使ってbehaviorを発見し共通言語を作る活動です。

### Discovery

Example Mapping:

- yellow: story
- blue: rule
- green: example
- red: question

### Formulation

business-readable exampleへ整理します。

### Automation

必要なexampleだけを適切なlayerで自動化します。

## Gherkinのよい例

```gherkin
Rule: A declined payment must not create a confirmed order

Scenario: Card is declined before capture
  Given a cart total of 1200 yen
  And the payment provider will decline the card
  When the customer checks out
  Then the checkout is rejected as payment declined
  And no confirmed order exists
```

## Gherkinの悪い例

```gherkin
When I click #submit-button
And I wait 5 seconds
Then div.result:nth-child(2) contains OK
```

これはbusiness specificationではなく脆いUI scriptです。

## Specification by Example

ruleと具体例をliving documentationとして維持します。

重要:

- exampleはruleを説明
- edge/counterexample
- automationとdocumentのsingle source
- obsolete scenarioのretirement
- stakeholderが読める語彙

実行例は[`labs/acceptance`](../labs/acceptance/README.md)です。example mappingのrule/example/questionから`Rule:`付きGherkinを書き、依存なしの最小runnerで実行し、UI detail・duplicate scenario・rule tag・undefined/ambiguous step・slow stepをgateし、各ruleをacceptance criterion・scenario・lower-level testへtraceし、product/QA/engineerのsign-offをfeature fileのhashへ結び付けます。

## Exploratory testingとの関係

scripted acceptanceは既知の期待を確認します。exploratory testingは未知のriskを発見します。両方必要です。

## E2E flakiness

原因:

- async wait
- shared data/account
- environment deploy race
- third-party sandbox
- browser resource shortage
- animation/network
- hidden order dependence

対策:

- condition wait
- isolated data/context
- environment version check
- trace/network/server correlation
- primary cause repair
- retry前failure metric

## Retry

retryは一時的な診断/外部不可避性の緩和に限定します。

```text
attempt 1 failureを保存
retry successをflakeとして記録
owner/issue/expiry
```

最終greenだけをreportするとtrustを壊します。

## E2E failure evidence

- trace
- screenshot at failure
- video when motion matters
- DOM/accessibility tree
- network HAR/redacted
- console errors
- server trace ID
- environment versions
- test data IDs

全部常時保存せず、privacy/cost/diagnostic valueで選びます。

## E2E checklist

- [ ] journeyがbusiness-critical
- [ ] lower layerで十分なruleを重複していない
- [ ] real/control boundaryを明示
- [ ] user-visible selector/condition
- [ ] unique data/account/context
- [ ] no fixed sleep
- [ ] deterministic clock/random where possible
- [ ] failure artifactとtrace correlation
- [ ] retry前flakeを計測
- [ ] baseline/scenarioのownerとretirement
