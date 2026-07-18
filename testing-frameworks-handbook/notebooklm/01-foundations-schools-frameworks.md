# 観点1 基礎・思想・フレームワーク

> Testing Frameworks Handbook のNotebookLM取り込み用バンドル。
> 生成元: https://github.com/hjosugi/testing-lab （scripts/build-notebooklm.sh で再生成）

---

<!-- SOURCE: docs/00-beginner-friendly-all-tests.md -->

# 初学者向け「あらゆるテスト」やさしい解説

## まず、テストとは何か

テストは「コードが動くか確認する作業」だけではありません。

もっと正確に言うと、次の質問に答えるための実験です。

> この変更をリリースしたとき、利用者や会社に困ることが起きないか。

たとえばECサイトなら、心配なことはたくさんあります。

- 合計金額を間違えないか
- 在庫以上に売らないか
- 二重に決済しないか
- 注文がデータベースに保存されるか
- スマートフォンでも購入できるか
- 1万人が同時に購入しても耐えられるか
- 他人の注文を見られないか
- サーバーが1台壊れても復旧できるか

これらは1種類のテストでは確認できません。心配ごとに合ったテストを選びます。

## 料理店で考える

ソフトウェアを料理店に置き換えると分かりやすくなります。

### Unit test

料理人が「ソースの塩分量だけ」を確認します。

```text
水100ml + 塩2g -> 塩分2%
```

小さな計算やルールを速く確認します。

### Integration test

注文票が厨房へ届き、料理が正しいテーブルへ渡るか確認します。

一つひとつの部品が正しくても、つなぎ方が間違っていることがあります。

### Contract test

ホール係と厨房の注文票の約束を確認します。

```text
注文票にはテーブル番号、料理名、数量が必要
```

厨房側が突然「数量」の欄を削除したら、ホール係が困ります。

### End-to-End test

お客さんが入店し、注文し、食事し、会計を終えるまで確認します。

最も現実に近い一方、時間がかかり、失敗原因を見つけにくいテストです。

### Performance test

100人が同時に来店したとき、何分待つか確認します。

### Security test

他のお客さんの伝票を見られないか、レジを不正操作できないか確認します。

### Resilience test

冷蔵庫やレジが壊れたとき、安全に営業を止めたり復旧したりできるか確認します。

## ECサイトで全体を見る

```text
商品をカートへ入れる
        ↓
合計金額を計算する       Unit test
        ↓
在庫を予約する           Component / Integration test
        ↓
決済サービスを呼ぶ       Contract / Integration test
        ↓
注文をDBへ保存する       Database integration test
        ↓
完了画面を表示する       UI / E2E test
        ↓
メールを送る             Message / System test
```

上から下まで全部を毎回E2Eで確認すると遅く、不安定になります。小さなルールは小さなテストで確認し、つながりだけをintegrationやE2Eで確認します。

## Unit test

### 一言で

小さなルールを、速く、原因が分かりやすい形で確認するテストです。

### 例

```python
def total(quantity, unit_price):
    return quantity * unit_price

def test_total():
    assert total(2, 600) == 1200
```

### 見つけられるもの

- 計算ミス
- 条件分岐ミス
- 境界値の間違い
- business ruleの違反

### 見つけられないもの

- 本物のDBへ接続できるか
- ブラウザでボタンを押せるか
- 他サービスと通信できるか

### よくある間違い

「1 classにつき1 test」と考えることです。大切なのはclass数ではなく、確認したいbehaviorです。

## Component test

### 一言で

アプリケーションのひとかたまりを、外部サービスだけ偽物にして確認します。

### 例

Checkout service、価格計算、order domainを本物で動かし、決済とDBだけfakeにします。

### なぜ必要か

Unit testだけでは、複数objectのつなぎ方を確認できません。E2Eより速く、原因も見つけやすい中間のテストです。

## Integration test

### 一言で

本物の境界を使い、部品同士が本当に接続できるか確認します。

### 「Integration test」という名前だけでは足りない

次のテストはすべてintegration testと呼ばれることがあります。

- 本物のPostgreSQLへSQLを発行する
- HTTP serverを起動してrequestする
- Kafkaへmessageを送る
- filesystemへfileを書き込む
- 3つのmicroserviceを同時に起動する

何を本物にしたか、名前へ書くと分かりやすくなります。

```text
OrderRepositoryPostgresTest
CheckoutHttpAdapterTest
OrderEventKafkaTest
```

### 見つけられるもの

- SQL方言やschemaの不一致
- JSONのfield名やtypeの間違い
- transaction/lockingの問題
- network/configurationの間違い

## Contract test

### 一言で

サービス同士の「約束」が壊れていないか確認します。

### 例

Frontendは次のresponseを必要とします。

```json
{
  "orderId": "o-1",
  "status": "CONFIRMED",
  "total": 1200
}
```

Backendが`total`を削除したら、contract testが失敗します。

### Integration testとの違い

- Integration: 本当に通信・接続できるか
- Contract: 通信内容の約束を守るか

## API test

### 一言で

HTTPやGraphQLなど、APIの入口からbehaviorを確認します。

確認するもの:

- status code
- headers
- request/response body
- validation
- authentication/authorization
- pagination/filter/sort
- idempotency
- rate limit
- error response

`200 OK`だけでは不十分です。内容と副作用も確認します。

## UI component test

### 一言で

画面全体ではなく、ボタンやフォームなどの部品を確認します。

```text
Given 在庫切れの商品
When ProductCardを表示
Then 購入ボタンはdisabled
```

CSS classではなく、利用者が見るrole、label、textを使って探すと壊れにくくなります。

## End-to-End test

### 一言で

利用者と同じ入口から、system全体の重要な流れを確認します。

### よいE2E

- 購入できる
- 決済失敗時に再試行できる
- password resetできる
- 管理者がrefundできる

### 悪いE2E

- price計算の全パターンをbrowserから確認
- 同じ画面を細かいfield違いで100件確認
- `sleep(5000)`を大量に使う

細かいruleはUnit/Componentへ下げ、E2Eは重要journeyだけにします。

## Acceptance test / ATDD / BDD

### 一言で

business、QA、engineerが「完成とは何か」を具体例で合意する方法です。

```gherkin
Scenario: Payment is declined
  Given the cart total is 1200 yen
  And the payment provider will decline
  When the customer checks out
  Then the order is not confirmed
  And no confirmation email is sent
```

Gherkinを書くことだけがBDDではありません。実装前に例を話し合うことが中心です。

## Regression test

### 一言で

過去に起きたbugが戻らないことを確認します。

bugを直す前に、まずbugを再現して失敗するtestを書きます。修正後にgreenになれば、同じbugの再発を検出できます。

## Characterization test

### 一言で

仕様が不明なlegacy codeの「現在の動き」を記録するテストです。

現在の動きが正しいとは限りません。安全にrefactorするための一時的な観測として使い、正式仕様が分かったら整理します。

## Snapshot / Golden / Approval test

### 一言で

大きな出力を、前に承認した出力と比較します。

向くもの:

- formatter
- compiler output
- PDF/HTML
- CLI help
- UI画像

危険なのは、差分を読まずに「全部更新」することです。それはtestを直したのではなく、現在の出力を無条件に正解にしています。

## Property-based test

### 一言で

具体例を1件ずつ書く代わりに、たくさんの入力で必ず守る性質を確認します。

```text
どんなlistをsortしても
1. 結果は昇順
2. 要素数は同じ
3. 元と同じ要素を持つ
```

frameworkが失敗する小さな入力まで縮めることをshrinkingと呼びます。

## Fuzz test

### 一言で

大量の予想外の入力を与え、crash、hang、security bugを探します。

向くもの:

- parser
- file format
- network protocol
- compression
- image/audio decoder
- API input

「crashしない」だけでなく、memory/time limitやinvariantも確認します。

## Mutation test

### 一言で

production codeをわざと少し壊し、既存testがその故障を発見できるか確認します。

```diff
- if age >= 18
+ if age > 18
```

testが失敗すればmutantをkill、greenのままならsurviveです。

coverageが高くてもassertionが弱い問題を発見できます。ただし全repositoryで100%を目標にせず、決済・権限・data lossなど重要部分へ使います。

## Metamorphic test

### 一言で

正確な答えが分からないとき、入力を変えた前後の関係を確認します。

```text
検索対象へ無関係な文書を追加しても、既存上位結果は変わらない
```

AI、画像処理、scientific computationなど、正解を手で作りにくい場合に役立ちます。

## Differential test

### 一言で

同じ入力を複数の実装へ渡し、結果の違いを探します。

```text
old version vs new version
simple reference vs optimized implementation
Chromium vs Firefox vs WebKit
```

結果が違っても、必ずしもbugとは限りません。仕様上許される差を先に決めます。

## Model-based / State-machine test

### 一言で

簡単な状態図を正解として、操作の順番をたくさん生成します。

```text
Cart Empty -> AddItem -> Active -> Checkout -> Completed
CompletedからAddItemはできない
```

単発操作では見つけにくい、長い操作列のbugを探せます。

## Concurrency / Race test

### 一言で

同時実行の順番が変わっても、安全か確認します。

例:

- 最後の1個を2人が同時購入
- 同じ口座から同時送金
- cache更新とreadが同時発生
- shutdown中にrequest到着

1回成功してもraceがない証明にはなりません。race detector、schedule制御、繰り返し、invariantを組み合わせます。

## Performance test

### 一言で

正しく動くだけでなく、必要な速さと容量を持つか確認します。

| Test | 確認すること |
|---|---|
| benchmark | 処理1件の速度 |
| load | 通常負荷でSLOを満たすか |
| stress | どこが限界か |
| spike | 急増に耐えるか |
| soak | 長時間でmemory leakしないか |
| capacity | 安全に処理できる最大量 |

平均だけでなくp95/p99、error rate、CPU、memory、queueを見ます。

## Security test

### 一言で

不正な利用者や入力に対して、安全か確認します。

- 認証していない人がdataを見られない
- 一般userがadmin操作できない
- tenant Aがtenant Bのdataを見られない
- secretがlogへ出ない
- SQL injection/XSS/SSRFを防ぐ
- rate limitが効く
- dependencyに既知脆弱性がない

security scannerだけで終わらず、application固有のabuse caseを書きます。

## Resilience / Chaos test

### 一言で

依存先やmachineが壊れたとき、system全体が危険な壊れ方をしないか確認します。

```text
DBが遅い
messageが重複する
networkが切れる
diskが満杯
1 regionが停止する
```

いきなりproductionを壊しません。小さなfault injectionから始め、正常状態、停止条件、影響範囲、rollbackを決めます。

## Data pipeline test

### 一言で

dataが欠けたり、重複したり、意味が変わったりしていないか確認します。

- schema/type
- null/range
- uniqueness
- referential integrity
- source/target件数・金額照合
- duplicate/late/out-of-order event
- idempotent reprocessing
- timezone/decimal precision

pipelineが成功終了しても、dataが正しいとは限りません。

## ML / LLM / Agent test

### 一言で

答えが毎回完全一致しないsystemを、datasetと評価基準で確認します。

- task success
- critical sliceごとの品質
- hallucination/groundedness
- safety/security
- prompt injection
- tool callの正しさ
- cost/latency/token
- model/prompt changeのregression

LLM-as-judgeだけに任せず、人の正解dataでjudge自体を検証します。

## Infrastructure / Cloud test

### 一言で

application codeだけでなく、deployment設定や復旧手順を確認します。

- IaC syntax/policy
- container image
- Kubernetes manifest
- install/upgrade/rollback
- backup/restore
- failover/disaster recovery
- cloud permission
- resource cleanup/cost

## Production verification

### 一言で

本番でしか分からないことを、小さい影響範囲で確認します。

- canary
- feature flag
- shadow traffic
- synthetic monitoring
- runtime invariant
- SLO/error budget

本番監視は、リリース前テストの代わりではありません。

## Manual / Exploratory / Usability test

### 一言で

人が操作しながら、まだ想定していない問題や使いにくさを探します。

自動化できなかった残りではありません。新しいriskを発見し、その結果を自動testや仕様へ戻す活動です。

## どのテストを選べばよいか

```text
小さな計算・rule          -> Unit / Property
複数objectの協調          -> Component
DB/HTTP/messageの接続     -> Integration
service間の約束           -> Contract
APIの入口                 -> API test
UI部品                    -> Component/Visual/A11y
重要な利用者の流れ        -> E2E/Acceptance
大量入力・未知入力        -> Property/Fuzz
testの強さ                -> Mutation
同時実行                  -> Race/Model-based
速度・容量                -> Performance
攻撃                      -> Security
故障・復旧                -> Resilience/Chaos
dataの正しさ              -> Data quality
AIの品質                  -> Eval/Metamorphic
本番固有の挙動            -> Canary/Synthetic
未知の問題・使いやすさ    -> Exploratory/Usability
```

## 最後に覚えること

1. 1種類のテストですべてを確認できない。
2. 小さな問題は小さなテストで確認する。
3. Integration testは「何を本物にしたか」を書く。
4. E2Eは重要な利用者journeyへ限定する。
5. Coverage 100%は正しさの証明ではない。
6. 不安定なtestをretryだけで隠さない。
7. Testが何を検出できないかも説明する。
8. Frameworkより先にriskとoracleを決める。


---

<!-- SOURCE: docs/00-map.md -->

# 全体マップ

## まず区別する6層

| 層 | 役割 | 例 |
|---|---|---|
| Test runner | discovery、実行、並列化、report | Node test runner、JUnit Platform、MTP、`go test`、Cargo |
| Test framework | test／fixture／lifecycle の programming model | JUnit Jupiter、pytest、NUnit、Catch2 |
| Assertion library | actual と expected の差を表現 | Truth、AssertJ、Hamcrest、Node assert |
| Test-double library | stub／spy／mock／fake の生成と検証 | Mockito、Sinon、NSubstitute、`unittest.mock` |
| Specialized tool | 特定種類のテストを実行 | Pact、Playwright、Infection、Airtest |
| Test management platform | 実行管理、記録、分析 | Testsigma など |

GitHub の `test-framework` topic にはこれらが混在しています。Mocha と Infection を「どちらが優れた unit test framework か」と比較するのは、compiler と profiler を比較するようなものです。

## Team標準のtest level定義

このhandbookでは、test levelを速度やrunner名ではなく、起動するscopeと本物にするboundaryで決めます。次の定義をsuite名、test plan、CI job名、reviewで共通して使います。

| 標準名 | Team定義 |
|---|---|
| unit test | 1 process内のcoherent behaviorをscopeとし、process外portをdoubleへ置き換え、return value、state、または重要なinteractionをoracleにしてbusiness ruleかorchestrationの退行を検出するtest |
| in-process component test | applicationのcomponentと内部wiringを1 process内で本物にし、process外dependencyを置換して、公開APIから観測できる結果をoracleにmodule間の接続不良を検出するtest |
| boundary-specific integration test | `HTTP adapter`、`repository-Postgres`、`filesystem`のように名前で明示した境界を本物にし、無関係な外部systemだけを置換して、protocolとside effectをoracleに接続・設定・実装差を検出するtest |
| contract test | consumer exampleまたは公開schemaをsource of truthとし、provider/consumerの片側か両側を実行して、契約への適合をoracleに互換性の破壊を検出するtest |
| system test | deploy可能なsystemまたは選択したservice群を公開boundaryから実行し、第三者serviceだけをsandboxやdoubleにして、system requirementをoracleに構成とcross-component flowの欠陥を検出するtest |
| E2E test | browser、mobile app、CLIなどのdelivery surfaceからcritical user journeyを通し、制御困難な第三者だけをsandboxやdoubleにして、user-visible outcomeをoracleに価値提供経路の破断を検出するtest |

`system`は「どのdeployable scopeを通したか」、`E2E`は「どの利用者surfaceからjourneyを通したか」を表します。同じtestが両方の性質を持つ場合も、suite名では主目的を先に置きます。

### Suite命名規約

canonical suite名は `<subject>/<real-boundary>/<purpose>` とします。file名は少なくともsubjectとreal boundaryをkebab-caseで表し、複数behaviorを収録するfileではpurposeを個別test名へ置けます。package scriptやCI jobはworking directoryやpackage名がsubjectを一意にする場合だけsubjectを省略できますが、real boundaryは省略しません。

```text
checkout/http-adapter/create-order
checkout-http-adapter.test.js
test:http-adapter
```

- `<subject>`には観測対象を入れます。framework名だけのsuite名にはしません。
- `<real-boundary>`には `in-process-component`、`collaborator-ports`、`http-adapter`、`repository-postgres`、`browser-to-http`のように、本物にする境界を入れます。
- `<purpose>`には守るbehavior、contract、property、journey、riskを入れます。
- `integration`、`test:integration`、`integration.test.*`という無修飾名は新規作成しません。必要なら `http-adapter`、`repository-postgres`、`filesystem`、`multi-process-integration`のように境界を明示します。
- runner、framework、assertion libraryはmetadataとして記録し、test levelの代わりには使いません。

現在の実装への対応は[labsのsuite mapping](../labs/README.md#現在のsuite-taxonomy-mapping)を正とします。網羅的な分類は[全テスト種別の完全taxonomy](14-complete-testing-taxonomy.md)を参照してください。

## テストの観測対象

| 観測対象 | 主な問い | 代表的なテスト |
|---|---|---|
| return value／state | 入力後の observable state は正しいか | Classical unit test |
| collaborator interaction | 必要な message を正しい相手に送ったか | London unit test |
| boundary protocol | HTTP／message の契約を守るか | contract test |
| real boundary | DB、filesystem、network driver が接続できるか | repository-Postgres／filesystem／HTTP adapter test |
| user journey | 実ブラウザから価値を届けられるか | E2E test |
| invariant | 広い入力集合で性質が保たれるか | property test／fuzz test |
| test strength | 小さな欠陥を検出できるか | mutation test |

## 学習のゴール

完了時には次を説明・実装できる状態を目指します。

- unit の境界を class ではなく coherent behavior から決める
- solitary test と sociable test を使い分ける
- state verification と behavior verification を使い分ける
- mock が design feedback になる場合と、implementation coupling になる場合を見抜く
- framework の便利機能より、failure diagnostics、isolation、parallel safety を優先する
- CI を fast lane／integration lane／release lane に分ける
- flaky test を retry で隠さず、原因分類と隔離期限を持つ

---

<!-- SOURCE: docs/01-foundations.md -->

# テストの基礎

## テストは何をするものか

テストの価値は、変更に対して速く、局所的で、信頼できる情報を返すことです。単に green を表示するだけでは不十分です。

よいテストには次の性質があります。

- Deterministic: 同じ前提なら同じ結果になる
- Isolated enough: 他テストの順番や共有状態に依存しない
- Behavior-focused: 公開された振る舞いを守る
- Diagnostic: failure から原因候補を狭められる
- Fast enough: 必要な頻度で実行できる
- Maintainable: production refactor と無関係な修正を要求しない

## xUnit の設計思想

SUnit から JUnit、NUnit、pytest の xUnit-style fixture へ続く基本形は次です。

1. arrange／setup
2. act／exercise
3. assert／verify
4. teardown

framework は discovery と lifecycle を標準化し、テスト作者が「どう実行するか」より「何を保証するか」に集中できるようにします。一方、暗黙の global fixture や継承ベースの巨大 fixture は、各 test の前提を読みにくくします。

## unit の定義

`unit = class` と固定しないでください。実務では次の3つが混在します。

- class/function unit: 小さい algorithm や value object
- behavior unit: 複数 object が協調して1つの domain behavior を実現
- process boundary unit: in-memory の component 全体を1 unit として外部I/Oだけ置換

Classical は複数の実 object を含む sociable unit を許容しやすく、London は subject の collaborator を double にして solitary unit を作りやすい、という傾向があります。

## FIRST を絶対則にしない

- Fast: 速度は feedback budget に対する相対値
- Independent: 実行順非依存は重要だが、integration fixture の共有が常に悪いわけではない
- Repeatable: clock、random、network、locale、timezone を制御する
- Self-validating: 人が log を読む前提にしない
- Timely: TDD だけでなく bug reproduction test や characterization test も価値がある

## AAA と Given-When-Then

AAA はコード構造、Given-When-Then は business behavior の物語に向きます。コメントを機械的に3つ書くより、各段階が一目で分かれる小さいテストにします。

```text
Given an in-stock item and a valid payment method
When the customer checks out
Then the order becomes confirmed
And one payment is captured
```

## coverage の正しい読み方

Line coverage 100% でも、assertion が弱ければ欠陥を見逃します。

```python
result = calculate_total(items)
assert result is not None
```

このテストは多くの誤実装を通します。coverage は「実行されなかった場所」を探す計器であり、仕様充足の証明ではありません。branch coverage、mutation testing、production incident history と組み合わせます。

## flaky test の原因分類

| 原因 | 例 | 対応 |
|---|---|---|
| time | midnight、timezone、timeout | clock injection、明示 timezone |
| concurrency | race、port collision | unique resource、synchronization |
| order | shared singleton／DB | reset、transaction、random order |
| network | external dependency | local fake、contract test、service virtualization |
| UI synchronization | sleep に依存 | observable condition／auto-wait |
| random | seed 非保存 | seed 出力、minimal counterexample 保存 |
| environment | locale、CPU、filesystem | hermetic config、Nix、container |

retry は診断用シグナルにはなりますが、恒久対策ではありません。隔離する場合は owner と期限を持つ Issue を作ります。


---

<!-- SOURCE: docs/02-london-vs-classical.md -->

# Classical school と London school

## 名前

Classical school は Detroit school または Chicago school、London school は mockist TDD とも呼ばれます。呼称には揺れがあるため、本書では Classical／London を使います。

## 一文での違い

- Classical: 実 object の集まりに入力を与え、返り値や最終状態という observable outcome を検証する。
- London: object 間の role と message を先に設計し、subject が collaborator と正しく協調したかを検証する。

## 比較

| 軸 | Classical | London |
|---|---|---|
| unit | coherent な object graph も許容 | 通常は1 subject |
| collaborator | 軽量なら real object を使う | 原則 double に置換しやすい |
| 主な検証 | state／result | interaction／protocol |
| TDD の進み方 | inside-out が自然 | outside-in が自然 |
| design feedback | cohesion、observable API | role、dependency、message |
| failure の局所性 | 複数 test が同時に壊れることがある | subject 単位で局所化しやすい |
| refactor 耐性 | private interaction 変更に強い | interaction を固定しすぎると弱い |
| setup | object graph が大きいと重くなる | mock setup が長くなりやすい |
| integration gap | 比較的小さい | wiring を別テストで必ず埋める |

## 同じユースケース

`CheckoutService` が在庫確認、支払い、order 保存、通知を行うとします。

### Classical

in-memory fake repository と fake payment gateway を実装し、checkout 後の system state を検証します。

```text
checkout(command)
assert saved_order.status == CONFIRMED
assert fake_gateway.captured_total == 1200
assert outbox contains OrderConfirmed
```

利点は、内部で method を分割・統合しても observable outcome が同じならテストが残ることです。欠点は、失敗したときに service、fake、domain object のどこが原因か追加調査が必要なことです。

### London

collaborator を mock にして、期待する protocol を先に書きます。

```text
inventory.reserve("sku-1", 2) returns reservation
payment.capture(1200, "token") returns receipt
orders.save(confirmed order)
events.publish(OrderConfirmed)
verify no unexpected interaction
```

利点は、orchestrator の責務と collaborator interface を outside-in で発見できることです。欠点は、呼び出し順や引数 object の作り方まで固定すると、振る舞いを変えない refactor でも壊れることです。

実コードは各 `labs/*/tests` にあります。discount ruleをRed-Green-Refactorで追加するClassical側のwalkthroughは[`labs/python/CLASSICAL-TDD.md`](../labs/python/CLASSICAL-TDD.md)にあります。

## mockist でも「全部 mock」ではない

value object、immutable collection、pure function まで mock にする必要はありません。double が有効なのは、role を持つ collaborator、遅い境界、非決定的な境界、failure を注入したい境界です。

## Classical でも double は使う

外部決済、SMTP、clock、random、OS、remote API を本物にする必要はありません。Classical は double を禁止する思想ではなく、現実的に test できない境界へ限定し、可能なら state-based fake を好む傾向です。

## mock の危険信号

- 1つの test に 5個以上の collaborator setup が並ぶ
- internal helper の呼び出し順を verify する
- domain value を mock にする
- `verifyNoMoreInteractions` が仕様ではなく実装の凍結に使われる
- production class の private design 変更で大量の test が壊れる
- mock setup が production call より長い

これは mock library の問題ではなく、subject の責務過多、誤った boundary、または implementation coupling の兆候です。

## sociable test の危険信号

- object graph 構築が巨大
- failure が suite 全体へ波及する
- in-memory fake が本番DBの挙動から乖離する
- test が別 test の作成データを暗黙利用する
- 失敗原因を特定するまで debugger が必要

## 実務での推奨ハイブリッド

1. pure domain logic は Classical／state-based
2. application orchestrator は重要な外部 interaction だけ spy/mock
3. repository は fake だけで終わらず、実DBとの contract/integration test を追加
4. remote API は client unit test + Pact + 少数 smoke test
5. E2E は重要 journey に限定

## 判断質問

double を作る前に次を確認します。

1. この collaborator は process 外か、遅いか、非決定的か。
2. interaction 自体が business requirement か。
3. 最終状態から同じ保証をもっと安定して観測できるか。
4. fake を作るなら本物との behavioral contract をどう検証するか。
5. mock によって production interface が良くなるか、test 都合の seam が増えるだけか。

---

<!-- SOURCE: docs/03-framework-catalog.md -->

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


---

<!-- SOURCE: docs/04-language-differences.md -->

# 言語ごとのテスト設計の違い

同じテスト思想でも、type system、module system、runtime、concurrency modelによって自然な設計は変わります。

## 比較表

| 言語 | seamの作り方 | fixture文化 | concurrency | mockの特徴 | 固有の注意 |
|---|---|---|---|---|---|
| Python | duck typing、monkeypatch、callable注入 | pytest fixture DI | process/thread/async plugin | patchが容易すぎる | definition siteではなくlookup siteをpatch |
| JS/TS | module export、object、function注入 | hooks／module fixture | file/process/thread並列 | module mockとfake timer | ESM/CJS境界、unawaited promise |
| Java/Kotlin | interface、constructor DI、package | annotation/extension | JUnit parallel opt-in/config | proxy/bytecode mock | final/static mockよりdesign seamを優先 |
| C# | interface、delegate、DI | attribute/fixture | runner設定に依存 | expression/virtual/interface | frameworkとplatform/adapterを分離 |
| C++ | template、interface、link seam | RAII、SECTION | runner/CTest設定 | macro/frameworkまたは手書きfake | UB、lifetime、compile time、ABI |
| Go | small consumer-owned interface、function value | table-driven local setup | `t.Parallel`明示 | codegenよりhandwritten spyが自然 | shared loop variable、goroutine leak |
| Rust | trait、generic、feature、module visibility | builder/helper、rstest | testはthread並列default | ownershipを満たすfake/trait mock | unit testはprivateへアクセス可、integrationはcrate外視点 |
| PHP | interface、callable、service container | PHPUnit lifecycle/data provider | process並列tool | PHPUnit MockObject | dynamic性とruntime version互換 |

## Python

pytest fixtureは名前によるdependency injectionです。再利用性は高い一方、`conftest.py`、autouse、fixture-of-fixtureを深くすると前提が見えません。fixtureは「データ」よりresource lifecycleに使い、simple valueはtest内builderを優先します。

`patch("module.name")` は定義元ではなく、subjectがlookupする名前をpatchします。間違ったpatchでもtestがgreenになることがあるため、可能ならconstructor/function injectionを使います。

## JavaScript／TypeScript

Mochaはserial default、AVAはtest file isolation/concurrency、Node runnerはtoolchain統合が中心です。framework選択がexecution semanticsに直結します。

ESM bindingはread-onlyであり、CJSのobject property patchと同じ感覚でmockできません。module mockよりdependencyを引数として渡す設計がportableです。async testはPromiseをreturn/awaitし、timerとmicrotask queueを区別します。

## Java／Kotlin

JUnit 6はPlatform、Jupiter、Vintageに分かれます。runnerとprogramming modelの分離により、IDE、Gradle、独自engineが同じPlatformに統合できます。extensionは強力ですが、global extensionやmeta-annotationで前提を隠しすぎないようにします。

Mockitoはinteraction test、Truthはassertionの診断を担い、JUnit自体とは別です。Kotlinではnullability、data class、final class、coroutine test schedulerが追加の設計軸です。

## C#

NUnit／MSTest／xUnit.netはprogramming model、MTP／VSTestはtest platformです。2026年の新規projectでは、MTPを使うかを明示的に判断します。NUnit constraint modelは `Assert.That(actual, Is.EqualTo(expected))` のようにfailure descriptionを構造化します。

## C++

RAIIがsetup/teardownの基本です。Catch2 SECTIONは1つのsetupから異なるpathを再実行します。mock frameworkを追加するとcompile timeとtemplate errorが増えるため、小さいportならhandwritten fake/spyも有力です。test binaryのsanitizer実行をunit testと同じくらい重視します。

## Go

標準`testing`とsmall interfaceが中心です。interfaceはprovider側で巨大に定義せず、consumer側で必要最小限に定義するとLondon-style seamが自然になります。table-driven testはcase追加に強い一方、各caseのbusiness meaningが匿名structに埋もれないようnameを付けます。

Go fuzzingはunit test corpusから始め、failure inputをcorpusへ保存できます。goroutineを起動するcodeでは、test終了後のleakとdeadlineを確認します。

## Rust

type systemが多くのinvalid stateを排除しますが、business logicの正しさはtestが必要です。`src`内unit testはprivate itemへアクセスでき、`tests/`はexternal consumerとしてpublic APIだけを見ます。refactor耐性を重視する主なbehavior testは後者が適します。

trait doubleはownership、lifetime、`Send + Sync`制約を満たす必要があります。mockを増やす前にpure domain typeとin-memory adapterでstate testできないかを確認します。

## PHP

PHPUnit majorはPHP runtime要件と連動します。2026年のPHPUnit 13はPHP 8.4以上、PHP 8.3なら12系です。attribute/data providerでcaseを表現し、MockObjectはexternal collaboratorへ限定します。Infectionでescaped mutantを調べると、assertion不足をcoverageより直接発見できます。


---

<!-- SOURCE: docs/29-glossary.md -->

# テスト用語集

## A–Z

| 用語 | やさしい意味 | 間違えやすい点 |
|---|---|---|
| Acceptance criteria | stakeholderが受け入れる具体条件 | UI手順とは限らない |
| ATDD | 受入例を実装前に共同作成する開発法 | Cucumber導入だけではない |
| BDD | exampleを通じbehaviorの共通理解を作る | Given/When/Thenの書式だけではない |
| Coverage | codeのどこをtestが実行したか | 正しさやassertion強度ではない |
| Deterministic | 同条件で再現可能 | 並行処理を禁止する意味ではない |
| Fixture | testの前提data/resourceとlife cycle | 大きな共通fixtureは結合を増やす |
| Flaky test | 同じ条件で結果が揺れるtest | retryでgreenにしても直っていない |
| Harness | SUTを起動・刺激・観測する仕組み | runnerだけではない |
| Invariant | 操作中ずっと守るべき性質 | 具体的な出力値とは異なる |
| Mock | 期待interactionを検証するdouble | double全般の総称として使われがち |
| Oracle | pass/failを決める根拠 | assertion syntaxだけではない |
| Property | 多数入力で成立すべき一般性質 | 個別expected valueとは異なる |
| Regression | 以前動いたbehaviorが壊れること/その検査 | bug修正確認だけではない |
| SUT | System Under Test、観測対象の境界 | 1 classとは限らない |
| Test double | 本物の代わりに置くobject/service | mock、stub、fake等の上位語 |
| TDD | failするtest→最小実装→refactorのcycle | test-firstの回数だけでは測れない |

## Test doubleの区別

| 種類 | 役割 | 例 |
|---|---|---|
| Dummy | parameterを埋めるだけ | 未使用logger |
| Stub | 決めたresponseを返す | payment declineを返す |
| Spy | 呼出を記録し後で確認 | sent emailsを記録 |
| Mock | 期待interactionを先に定義 | chargeが1回という期待 |
| Fake | 軽量だが動く代替実装 | in-memory repository |
| Emulator/Simulator | 外部system/protocolを再現 | cloud/local device simulator |

## よく混ざる組合せ

### Unit vs integration

速度ではなくboundaryで決めます。real DB/network/processを跨ぐなら通常integrationです。複数classでも1 process内のdomain componentならcomponent/unitと呼ぶteamもあります。

### E2E vs acceptance

- E2E: 技術的な通過範囲
- Acceptance: stakeholderの受入目的

1本が両方であることも、どちらかだけであることもあります。

### Stub vs mock

- stub: SUTへ入力を与える
- mock: SUTからのinteractionを判定する

### Verification vs validation

- verification: 指定どおり作ったか
- validation: 必要なものを作ったか

実務では重なるため、誰のどの期待をどのoracleで確認するかまで言います。

### Error・fault・failure

- fault/defect: code/design中の原因
- error: 内部stateの誤り
- failure: 外から観測できる期待違反

testはfaultを直接見るとは限らず、failureやinvariant違反から見つけます。

