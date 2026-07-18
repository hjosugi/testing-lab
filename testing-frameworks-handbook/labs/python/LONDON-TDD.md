# London TDD outside-in walkthrough

## outside-inで発見したrole

最初にnotification実装を作らず、最上位workflowのtestから始めました。Redは`checkout.application`が存在しない状態です。

```text
ModuleNotFoundError: No module named 'checkout.application'
```

testが要求したroleとmessage:

| Role | Message | Return / consequence |
|---|---|---|
| `CheckoutPort` | `checkout(order_id, items, token)` | confirmed `Order`を返す |
| `OrderConfirmationNotifier` | `send_confirmation(order)` | 成功したOrderを顧客へ通知する |

`CheckoutWorkflow`だけがreal subjectで、2 roleはautospec mockです。これはsubjectをcollaboratorから隔離したsolitary unitです。roleは「誰が責任を持つか」、messageはrole間で交換するbusiness上の要求です。

## Red → Green

Redでは未実装interfaceをimportするtestを先に置きました。Greenでは2つの`Protocol`と、checkout結果をnotificationへ渡す最小workflowだけを実装しました。

成功protocol:

```text
checkout.checkout(...) -> confirmed order
notifications.send_confirmation(order)
return order
```

checkoutが`PaymentError`を送出した場合、confirmation messageは0回です。notification adapterの詳細、email template、transportはこのunitの関心外です。

## mock setupが示した責務過多

`CheckoutService`へnotificationを直接追加すると、test setupはpayment、repository、discount、notificationを同時に扱います。価格計算・決済・永続化というtransaction責務と、transaction成功後のdelivery責務も同じclassへ混ざります。

そこで次の2層へ分けました。

- `CheckoutService`: pricing、payment、Order永続化を完了して返す
- `CheckoutWorkflow`: checkout roleを呼び、成功後にnotification roleへmessageを送る

最上位London testのmockは2 roleに減り、notification transportを変更してもtransaction testは変わりません。mock数だけを機械的に閾値化するのではなく、setupが複数の変更理由を同時に語り始めたことを分割signalにしています。

## call orderを仕様に含める場合

confirmationは「成功・永続化済みOrder」を伝えるため、checkout完了前に送ってはいけません。`test_workflow_checks_out_before_sending_the_confirmation`は共有timelineで次の順序を仕様化します。

```python
assert timeline.mock_calls == [
    call.checkout.checkout("order-1", items, "token-1"),
    call.notifications.send_confirmation(order),
]
```

このassertionは強いinteraction couplingです。role名、message名、引数、順序、message数のどれかが変われば失敗します。ここではcausality自体がbusiness requirementなので意図的に使います。

## call orderを仕様に含めない場合

`test_checkout_messages_without_specifying_a_global_call_order`はpayment captureとOrder saveを別々に`assert_called_once_with`しますが、2 mockを共有timelineへ接続しません。重要なmessageと引数は守り、global orderingまでは契約にしない形です。

次のassertionはinteraction couplingを増やすため避けます。

- private `_price`の呼び出しをmock/verifyする
- getterやconstructorを含む全call列を固定する
- notification adapter内部のSMTP method順をworkflow testから検証する
- business consequenceと無関係な`assert_not_called`を大量に置く
- refactor後も意味が同じなのにDTOの組み立て手順までexact matchする

順序を入れる判断質問は「逆順でも外から見たbusiness behaviorは正しいか」です。正しくないなら仕様、正しいなら通常は固定しません。

## wiringを補うcomponent test

mockはrole間protocolを検証しますが、production object graphが正しく接続されることは保証しません。`test_checkout_workflow_component.py`は次をすべてreal wiringで通します。

```text
CheckoutWorkflow
  -> CheckoutService
    -> FakePaymentGateway
    -> InMemoryOrderRepository
  -> InMemoryOrderConfirmationNotifier
```

返却Order、captured payment、保存Order、confirmationの最終stateをまとめて検証します。solitary unitが提供するfailure局所性と、component testが埋めるwiring gapを組み合わせます。

## 実行

```bash
nix develop .#python --command pytest -q \
  labs/python/tests/test_london_workflow.py \
  labs/python/tests/test_checkout_workflow_component.py
```
