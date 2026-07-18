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

実コードは各 `labs/*/tests` にあります。

- Classical: [`labs/python/CLASSICAL-TDD.md`](../labs/python/CLASSICAL-TDD.md)
- London: [`labs/python/LONDON-TDD.md`](../labs/python/LONDON-TDD.md)

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
