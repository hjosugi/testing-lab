# CI・Flakiness・テスト経済性

## 一言でいうと

テストは「多いほど良い」のではありません。**重要な欠陥を、十分早く、十分正確に、原因を追える形で知らせる情報システム**です。

## テスト1本の価値

おおまかには次で考えられます。

```text
価値 ≒ 検出する損失 × 欠陥発生確率 × 検出確率
       - 実行費用 - 保守費用 - 誤警報の損失 - feedback待ち時間
```

数式を厳密に計算する必要はありません。決済の二重請求を守る遅いintegration testは高価値ですが、色の実装詳細を固定する壊れやすいsnapshotは低価値かもしれません。

## CI laneを分ける

| lane | 目安 | 目的 | 失敗時 |
|---|---:|---|---|
| pre-commit | 数秒 | lint、型、狭いunit | commit前に直す |
| pull request | 5〜15分 | component、integration、contract | mergeを止める |
| main/post-merge | 15〜60分 | 広いmatrix、E2E、mutation差分 | mainを赤くしowner通知 |
| nightly | 時間単位 | full mutation、fuzz、soak、全browser | triage issue化 |
| pre-release | 必要時間 | migration、DR、性能、安全性 | release判定 |
| production | 継続 | canary、synthetic、SLO | rollback/mitigation |

最速のテストだけをPRへ置くのではなく、**重要なriskへ最短で到達する組合せ**を置きます。

## Flaky testとは

同じcodeと意図上同じenvironmentで、pass/failが変わるテストです。単なる「たまに失敗」ではなく、suiteの情報価値を壊します。

### 主因

- time: wall clock、timezone、期限境界
- ordering: test順、global state、shared fixture
- concurrency: race、port、file、DB row競合
- async: sleep、eventual consistency、未待機promise
- network: external service、DNS、rate limit
- randomness: seed未保存、generator不備
- resources: CPU/memory/disk不足
- UI: unstable selector、animation、network idle誤用
- environment: locale、browser、OS、dependency drift

### 直し方

1. failure artifactを残す。seed、時刻、環境、trace、log、screenshotを保存する。
2. 繰り返し実行して再現率を測る。再実行で隠さない。
3. 原因分類しownerと期限を付ける。
4. quarantineは一時措置にし、重要riskの代替testを置く。
5. 根本原因を直してからretryを減らす。

`retry=3`でgreenになったことは修正ではありません。初回fail率が1%のtestを100本走らせると、独立と仮定したsuite green率は約 `0.99^100 ≈ 36.6%` です。

## Determinismを設計する

- clockを注入し固定する
- random seedを表示・再利用する
- unique namespaceをtestごとに割り当てる
- databaseをtransaction/schema/containerで隔離する
- pollingはdeadlineと観測条件を使う
- cleanupは成功時だけでなくfinallyで行う
- parallel安全性を明示する
- external dependencyは目的に応じreal、emulator、stubを選ぶ

## Test selection

### 代表的な選択

- path/target dependency based
- changed-method/class impact analysis
- historical failure probability
- risk label based
- coverage relation based
- predictive selection

選択漏れがあるため、PRでは選択suite、main/nightlyではより広いsuiteを回します。選択器そのものもversion管理し、missを監視します。

## Parallelizationとsharding

速くするだけでなく、隔離欠陥を露出させます。

- deterministic shard keyを使う
- test durationを記録しbalanced shardにする
- shared account/tenant/portを禁止する
- shardごとのartifactを統合する
- one-time setupを競合させない

## Quarantine policy

quarantine対象には必ず次を付けます。

```text
owner / failure rate / protected risk / alternative coverage
ticket / deadline / last failure evidence / exit condition
```

quarantine suiteを誰も見ない状態は「削除していないだけ」です。

## Coverage・mutation・defect data

| 指標 | 分かること | 分からないこと |
|---|---|---|
| line/branch coverage | 実行されなかった場所 | assertionの正しさ |
| mutation score | 小さなcode変化をtestが検出する力 | 実際の全欠陥 |
| escaped defects | 現実に逃した欠陥 | 未発生risk |
| flake rate | 信頼性 | coverage |
| duration/queue time | feedback速度 | business価値 |
| change failure rate | delivery結果 | 個々のtest原因 |

単一の全社目標値にせず、risk領域・lane・変更頻度ごとに見ます。

## Failure triageを速くするartifact

- exact command、commit、dependency lock
- seed、test data identity、clock
- structured logとcorrelation ID
- request/responseの安全な要約
- DB/event state
- browser trace、screenshot、video
- performance profile
- first failureとretry履歴

機密情報・token・個人情報をartifactへ残さないredactionもtestします。

## Suiteを削除する判断

次のtestは統合・置換・削除候補です。

- 同じriskをより低いcostで別testが守る
- obsolete behaviorを固定している
- assertionがない／常にpassする
- implementation detailだけを固定する
- 修復不能なexternal dependencyへ依存する
- 長期間価値がなく、ownerも不在

テストコードもproduction codeです。追加だけでなく、refactorとretirementが必要です。

## Review checklist

- [ ] protected riskとownerが書かれている
- [ ] 最も低い有効なboundaryで検証している
- [ ] oracleが欠陥に反応する
- [ ] seed/time/data/environmentを再現できる
- [ ] failure artifactだけで初動できる
- [ ] CI laneとtimeoutが妥当
- [ ] retry/quarantineに期限がある
- [ ] suiteの価値・速度・flakeを継続計測する

