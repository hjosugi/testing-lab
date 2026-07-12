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

