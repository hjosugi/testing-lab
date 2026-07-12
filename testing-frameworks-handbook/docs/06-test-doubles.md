# Test doubles

## 用語

| Double | 役割 | 検証対象 |
|---|---|---|
| Dummy | signatureを満たすだけ | 通常なし |
| Stub | 決めた値を返す | subjectのoutcome |
| Spy | 呼び出しを記録 | 後からinteractionをassert |
| Mock | 期待interactionを先にprogram | protocol |
| Fake | 簡略だが動作する実装 | state／behavior |

libraryによって用語は違います。API名ではなくtest内の役割で分類します。

## どれを選ぶか

```text
戻り値だけ制御したい -> stub
重要なevent送信を確認したい -> spy
厳密なprotocol/順序が仕様 -> mock
複数operationのstateful behaviorが必要 -> fake
parameterとして必要なだけ -> dummy
```

## 最も安定するinteraction assertion

すべてのcallを検証せず、business consequenceを持つinteractionだけを検証します。

安定しやすい例:

- paymentを二重captureしない
- transaction commit後にeventをpublishする
- PIIを含むpayloadを外部へ送らない
- idempotency keyをremote APIへ渡す

不安定になりやすい例:

- helper Aの次にhelper Bを呼ぶ
- getterを3回呼ぶ
- DTO constructorの全fieldをexact match
- cache miss時のinternal call chain全体

## mockとfakeのtradeoff

mockは局所的でfailureが明瞭ですが、interaction couplingがあります。fakeは複数operationを自然に扱えますが、本物とのsemantic driftが起きます。

判断基準:

- protocol自体を設計する: mock/spy
- state transitionを検証する: fake
- SQL/HTTP driverの現実性が必要: real integration
- failure modeを網羅的に注入: stub/fake

## anti-pattern

- mock returns mockの深いchain
- production data classをmock
- private methodをmock
- third-party APIを直接mockして自分のadapterを通さない
- global patchをrestoreしない
- random test dataにseed/intentがない
- fakeが本番制約を無視する

