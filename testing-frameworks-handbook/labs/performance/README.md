# Performance methodology lab

benchmark・load・stress・spike・soak・capacityを**別の問い**として分け、coordinated omissionを避けたopen-model load generatorでSLOを検証します。外部serviceやcloudは使わず、CIで数十秒に収まる規模で「方法とoracleが正しいこと」を示します。本番capacityの数値そのものは、このlabでは主張しません。

## 何を測るか: workload modelとSLO

| 項目 | 定義 |
|---|---|
| 対象 | `POST /quote`（2行cartの合計を返すcheckout quote）。real HTTP/TCP、keep-alive |
| capacity model | `workers × 1000 / serviceMs`。CI用targetは8 worker × 40ms = **200 req/s** |
| overload時のcontract | bounded queue（32）を超えたら`503 + Retry-After`でshedし、受理したrequestのlatencyをqueue長で上限化する |
| 通常workload | capacityの50%（100 req/s）、Poisson arrival、seed固定 |
| SLO | warm-up除外後、p95 ≤ 80ms、p99 ≤ 150ms、error rate ≤ 0.1% |
| 無効条件 | load generatorのsend遅れ（intended→actual）p99 > 30ms（SLO p99の20%）。このときhostが自分自身を測っているので、SLOの合否を出さない |

SLO判定（`evaluateSlo`）は、`load/stress/spike/soak/capacity`以外のresult、closed-modelのlatency、warm-upのないrunを**型エラーとして拒否**します。Playwright等のfunctional E2E所要時間を性能根拠に流用できない構造です。

## Suiteの分離

| Suite | 問い | 実装 | Oracle |
|---|---|---|---|
| microbenchmark | この関数は同じmachineで遅くなったか | [`bench/quote.bench.mjs`](bench/quote.bench.mjs) | warm-up 5 sample後の15 sampleのmedian/MAD、checksumで結果の正しさも確認。SLOには使わない |
| load | 通常workloadでSLOを満たすか | `load:` test | p95/p99/error rate、warm-up除外、throughput、peak utilization |
| stress | capacityを超えたとき、どう壊れるか | `stress:` test（150%） | 503だけでshedし、connection errorを出さない。受理分p99がqueue上限付近に収まり、負荷が戻ればshedが止まる |
| spike | 急増後に回復するか | `spike:` test（25%→300%→25%） | spike終了から1秒以内にwindow p99がSLO内、shed 0へ戻る |
| soak | 長時間でqueueやmemoryが積み上がらないか | `soak:` test | queue depth / retained bytesの時系列slope。意図的leak（4KB/request）と115% backlogを検出できることも同じtestで確認 |
| capacity | SLOを守れる上限はどこか | `capacity:` test、`scripts/run-profiles.mjs` | step loadで上限を探し、超えた後のdegradation mode（shed or latency超過）を記録 |

CIのsoakは3秒です。leak/queue buildupの**検出方法**を検証するもので、数時間のsoakの代替ではありません。

## Coordinated omission

closed-model client（1 connection、「送る→待つ→送る」）は、serverが400ms止まっている間は次のrequestを送りません。止まった時間に本来到着していたrequestはどこにも記録されず、1件だけ遅いsampleが残ります。`coordinated omission:` testでは同じ400ms stallに対して:

- closed model: max ≥ 350msは見えるが、p99 < 100ms（遅延が1%未満のsampleに圧縮される）
- open model: latencyを**intended start time**から測るので、stall中に到着予定だった約40 requestすべてにstallが課金され、p99 ≥ 250ms
- closed modelは同じ時間で送ったrequest数そのものが少ない（負荷が勝手に下がる）

load generatorは各requestのsend遅れも記録します。遅れのp99が予算を超えたrunは`clientBottleneck: true`となり、SLO判定はinvalid、testはinconclusive（skip）になります。CIの専用job（`Performance profiles (conclusive)`）は`PERF_REQUIRE_CONCLUSIVE=1`でinconclusiveも失敗として扱います。

## Warm-up

最初の区間（load 0.5秒、report 1秒）もrequestは送りますが、統計から除外し、除外件数を`warmupRequestsDiscarded`へ残します。JIT、connection確立、keep-alive poolの立ち上がりを定常状態と混ぜないためです。

## 保存するもの

`scripts/run-profiles.mjs`は`build/results/summary.json`へ次を書き、CIではartifact `performance-results`として保存します。

- environment fingerprint（Node、OS、arch、CPU model/数、CI flag）、seed、arrival process、warm-up、duration
- p50/p95/p99/max、throughput、error rate、status別件数、log bucket histogram、generator lag
- saturation: peak queue depth、peak utilization、shed件数、queue/memory slope、event loop delay p99
- seeded repeat（既定3回）のp95 spread = run間noiseの幅（confidence）
- capacity stepごとのp99/error rate/throughputと、上限・degradation mode

`--write-baseline <file>`で保存したbaselineは、`--baseline <file>`で比較できます。environment fingerprintが違えば`comparable: false`を返し、別machineの数値で退行を判定しません。

## Tool比較（k6 / JMeter / Gatling）

| 観点 | k6 | JMeter | Gatling | このlabのNode generator |
|---|---|---|---|---|
| open model | `constant-arrival-rate` / `ramping-arrival-rate` executor | Arrivals/Throughput Shaping plugin系 | `injectOpen`（constantUsersPerSec等） | `runOpenModel` |
| coordinated omission | arrival-rate executorなら到着時刻基準。VU不足は`dropped_iterations`で見える | thread groupの既定はclosed model | open injectionなら到着基準 | intended start基準 + generator lag |
| scriptの形 | JavaScript、CLI単体、threshold内蔵 | GUI中心、XML plan | Scala/Java/Kotlin DSL、HTML report | test code内 |
| CI適性 | single binary、thresholdでexit code | headless可だがplan管理が重い | JVM起動、Maven/Gradle | 追加依存なし |
| 採用 | 実環境の負荷試験の第一候補 | 既存資産・protocol多様性がある場合 | JVM teamのcode review文化に合う場合 | 教材として方法とoracleを見せる |

実環境ではk6のarrival-rate executorを第一候補にし、`dropped_iterations`と`http_req_duration`のthresholdをSLOと同じ値で設定します。このlabの判定関数（warm-up除外、client bottleneckのinvalid化、environment比較）はtoolを替えても同じ規則です。

## 実行

```bash
nix develop .#generative --command make test-performance          # oracle（test-allにも含む）
nix develop .#generative --command make test-performance-report   # seeded repeat、capacity step、JSON artifact
nix develop .#generative --command make test-performance-bench    # microbenchmark
```

## このlabが保証しないこと

- load generatorとtarget serverは同じNode process内です。Node HTTP stack自体のcapacityではなく、明示したqueueing modelに対する測定方法を検証します。
- 共有・過負荷のhostではgenerator lagが予算を超え、結果はinconclusiveになります。その状態の数値をbaselineにしてはいけません。
- 本番のcapacity、soak時間、network越しのlatencyは、controlled environment、実trafficに近いworkload mix、十分なrepeatで別途測る必要があります（Issue #23の`needs-infrastructure`部分）。
