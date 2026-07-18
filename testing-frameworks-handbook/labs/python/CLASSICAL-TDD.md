# Classical TDD walkthrough

## 対象behavior

checkout subtotalが1000以上なら10%を割り引きます。閾値はinclusive、端数は整数除算で切り捨て、決済・保存Order・返却Orderはすべてdiscount後のtotalを使います。

この例のunitは1 classではなく、`CheckoutService`、real `CartItem`、real `ThresholdPercentageDiscount`、`FakePaymentGateway`、`InMemoryOrderRepository`が作るcheckout behaviorです。

## Red → Green → Refactor

### Red

最初に`test_threshold_discount_changes_the_observable_checkout_outcome`だけを追加しました。production codeにdiscount ruleが存在しないため、次のfailureを確認しています。

```text
ImportError: cannot import name 'ThresholdPercentageDiscount' from 'checkout'
```

期待値はprivate callではなく、返却Orderの`subtotal=1200`、`discount=120`、`total=1080`、fake repositoryへ保存された同じOrder、payment fakeが記録した1080円です。

### Green

最小実装として`ThresholdPercentageDiscount`を追加し、`CheckoutService.checkout`内でsubtotal、discount、totalを計算しました。既存の呼び出しには`NoDiscount`をdefaultとして残し、全Python testがgreenになることを確認しました。

### Refactor

green後に計算をprivate `_price`と`_PriceBreakdown`へ抽出しました。testは返却値とboundary fakeのstateだけを見るため変更不要でした。同じ計算を`checkout`へ再統合してもobservable outcomeが同じ限りtestは壊れません。private methodをtest APIにしないことが、このrefactor耐性を作ります。

## sociable unitとintegration test

| 観点 | このsociable unit | real adapter integration |
|---|---|---|
| object | 複数のreal domain object | domain object + real driver/engine |
| 境界 | paymentとrepositoryはin-memory fake | repositoryはPostgres等のreal adapter |
| 観測 | Order、captured payment、saved Order | serialize/query/constraint/transaction |
| process/I/O | なし | あり |
| 主なfailure | business rule、object wiring | SQL、mapping、driver、engine semantics |

複数objectを使うだけではintegration testではありません。このtestはprocess外I/Oを含まず、checkoutというbehavior単位のsociable unitです。本物のDB adapterとengineを起動した時点でrepository integrationになります。

## fakeとreal adapterの同一contract

`tests/repository_contract.py`は次のbehaviorを再利用可能なsuiteとして定義します。

- 保存したOrderを同じ内容で取得できる
- 未登録IDは`None`

現在は`TestInMemoryOrderRepository`がこのcontractを実行します。real adapterを追加するときは、同じsuiteを次の形で継承します。

```python
class TestPostgresOrderRepository(OrderRepositoryContract):
    def make_repository(self):
        return PostgresOrderRepository(clean_database_url())
```

real adapter側では各testへclean schema/transactionを供給します。duplicate ID、optimistic locking、money precision、transaction rollbackなどengine依存のcontractはdatabase integration Issueで追加します。fakeだけを便利な別実装にせず、real adapterと共有するbehaviorを増やす方針です。

## state testのfailure局所性

component testで`expected 1080, got 1200`となった場合、候補はdiscountの閾値、丸め、rule注入、subtotal集計、Order組み立て、paymentへの引き渡しまで広がります。複数のstate assertionが同時に落ちても、どのobjectが原因かはfailureだけでは確定しません。

そこで同じbehaviorを重複させるのではなく、診断用の小さいtestを層にします。

1. `test_discount_rule.py`で閾値、丸め、invalid rangeを局所化
2. `test_classical.py`でreal object graphのobservable outcomeを確認
3. `test_repository_contract.py`でfake/adapterの保存契約を分離
4. real DB固有riskはintegration suiteへ置く

focused rule testがgreenでcomponent testだけredなら、rule計算よりwiring/集約を先に調べられます。Classical testの広い現実性と、focused testの診断性を組み合わせるのが対策です。

## 実行

```bash
nix develop .#python --command pytest -q labs/python
```
