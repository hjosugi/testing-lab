# Resilience lab: fault injection, chaos, deterministic simulation

同じpayment client（retry/full-jitter backoff/circuit breaker/idempotency key）を、**deterministic simulation**と**real HTTP上のcontrolled chaos**の両方で検証し、2つの環境の意味の差（semantic gap）も記録します。

## Seam inventory

| Seam | 本番での実体 | simulation（`src/sim.mjs`） | real HTTP（`src/chaos.mjs`） |
|---|---|---|---|
| clock | `Date.now()` / timer | `sim.now()`の仮想ms。I/O待ちは0秒で進む | 実時間 |
| scheduler | event loop、thread | 単一event queue。同時刻のtieはseed付き乱数で順序決定 | OS/Node event loop |
| random | `Math.random()` | `mulberry32(seed)`。backoff jitterもここから | seed付き`mulberry32`（proxyのblast radius選択、jitter） |
| network | TCP/HTTP | request/responseそれぞれのdrop、duplicate、delay（=reorder）をfault planで注入。lost responseはtimeoutとしてのみ観測 | fault proxy: 503注入、upstream処理後のsocket reset（lost response）、latency |
| disk | fsync、write | fsync失敗（EIO）、torn write、crashでpending消失 | 対象外（下記gap） |

payment clientは`transport`、`sleep`、`random`、`now`だけに依存するため、同じcodeが両環境で動きます。

## Deterministic simulation

- **再現性**: 1回のrunは`(seed, fault plan, workload)`の純関数です。event traceのSHA-256が同一seedで一致し、別seedで変わることをtestで確認します。
- **invariant**: 20 checkoutを20% drop・20% duplicate・1〜150ms delayの下で50 seed実行し、double chargeなし・未完了なしを確認します。
- **seed reproduction**: idempotency keyを外した実装をseed searchすると、double chargeを起こすseedが見つかり、そのseedを再実行すると**同一trace hash・同一の重複order**が再現します。失敗報告は「seed + fault plan」だけで足ります。
- **retry/backoff**: 400msのoutageはretry budget内で吸収、60秒のoutageはhangせず明示的に失敗し、chargeは0件です。
- **circuit breaker**: 連続3失敗でopen、open中はdependencyを呼ばずに即失敗、cooldown後half-open、probe失敗で即再open、成功でclose。
- **disk**: fsync失敗・torn writeが同じseedで同じ位置に再現します。

### 設計上の発見

1. 当初のclientは、providerの`unavailable`応答を「正常に返ったcall」としてbreakerへ渡していたため、outage中でもbreakerが開きませんでした。simulation testで検出し、5xx相当の応答をbreaker上の失敗として扱うよう修正しました。
2. breaker（cooldown 300ms）と6回retryを組み合わせると、1.5秒のoutageでは**20件すべてが明示的に失敗**します。open中のretryは即失敗して予算を使い切るためです。その代わり、失敗中のproviderへのrequest数はbreakerなしの半分未満になります。「outage中は速く失敗し、依存先を守る」をこのserviceの意図とするなら正しく、outageを待って成功させたいなら、retry間隔をcooldown以上にする必要があります。これはproduct decisionとして残しています。

## Controlled chaos（real HTTP）

`runExperiment`は次の順で実行します。

1. **steady state hypothesis**: probe checkoutの成功率 ≥ 99%。事前に満たさなければ注入せず`not-started`。
2. **blast radius**: fault proxyがseed付きで選んだ割合のrequestだけに注入（例: 30%）。
3. **abort condition**: 直近windowの成功率 < 90%になった時点で打ち切り。
4. **rollback**: abortでも正常終了でも`finally`で注入を解除し、steady stateが戻ったことを測る。

| Experiment | 結果 |
|---|---|
| 30%のcallへ50%の503 | retryが吸収し成功率100%、completed、rollback後も100% |
| 全callへ100%の503 | window 5件で即abort（40 probe予定より早い）、rollback後に成功率100%へ回復 |
| 事前steady stateなし | 注入せず終了 |

## Semantic gap（simulation vs real）

同じ「response lost（providerはchargeしたが応答が届かない）」を両方で起こし、どちらもdouble chargeが起きないことを確認します。そのうえで差を記録します。

| 観点 | simulation | real HTTP |
|---|---|---|
| lost responseの見え方 | `timeoutMs`経過後のtimeoutだけ | proxyのsocket resetが即`ECONNRESET` |
| retryまでの時間 | 常にtimeout分待つ | resetならtimeoutより早い |
| duplicate delivery | 注入可能（同一messageを二重配送） | HTTP/TCPでは起きない（client retryだけが重複源） |
| 時間 | 仮想時間。60秒outageも数msで検証 | 実時間。長いoutageはCIで高価 |
| disk / process crash | 注入可能 | このlabでは未検証 |
| connection pool、DNS、TLS | modelなし | proxy経由で一部のみ |

simulationで保証できるのは「modelに含めたfaultの組合せに対するinvariant」だけです。TCP固有の失敗（reset、半開接続、TLS handshake）はreal環境のchaosで確認します。

## Chaos tool候補（controlled環境）

| Tool | 対象 | このlabでの位置づけ |
|---|---|---|
| Toxiproxy | TCP proxyでlatency/reset/bandwidth | `startFaultProxy`と同じ層。service間testの第一候補 |
| Chaos Mesh | Kubernetes（Pod kill、network、IO、time） | kind等の使い捨てclusterで、namespace限定・`duration`付きで評価 |
| LitmusChaos | Kubernetes（ChaosEngine、probe、abort） | steady-state probeとabortがCRDで表現でき、この`runExperiment`の構造と対応 |
| Chaos Monkey（Spinnaker） | VM/instance終了 | instance単位の粗いfault。本番game day向けで、CIには不向き |
| AWS FIS / Azure Chaos Studio | managed cloud | stop condition（CloudWatch alarm）をabort conditionとして使う |

Kubernetes系toolは#32（kind等のephemeral cluster）で実環境評価します。このlabは同じexperiment構造（steady state、blast radius、abort、rollback）をprocess内で検証します。

## 実行

```bash
nix develop .#generative --command make test-resilience
```

## このlabが保証しないこと

- simulationのfault modelに含めていない失敗（TCP reset、clock skew between hosts、GC pause、partial network partition）は検証しません。
- chaos experimentは1 process内のproxyです。本番のblast radius制御（traffic割合、region、feature flag）は別途設計が必要です。
