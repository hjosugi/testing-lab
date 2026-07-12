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

