# Go: testing、race、fuzz、benchmark

Checkout componentをGo標準の`testing`で検証し、table/subtestのresource isolation、race detector、fuzz corpus、goroutine leak、test order、allocation、test doubleの選択を別々のoracleとして扱うlabです。

## Quick start

```bash
nix develop .#go

make test-go
make test-go-race
make test-go-parallel
make test-go-fuzz
make test-go-generated
make test-go-benchmark
make test-go-failures
```

Nix lockはGo 1.26.4を供給し、moduleのlanguage versionはGo 1.24です。GoMock/mocking generatorはv0.6.0、goleakはv1.3.0へ`go.mod`と`go.sum`で固定しています。

## Table、subtest、`t.Parallel`

`TestCheckoutClassical`はcaseごとにpayment fakeとin-memory repositoryを作り、親と子の両方をparallel実行します。`TestCheckoutParallelResourceIsolation`では3 subtestsが全て`order.json`という同じ名前を使いますが、各caseが`t.TempDir()`を所有するためfilesystem boundaryは共有されません。

```bash
./scripts/verify-parallel-isolation.sh
```

この検証は固定shuffle seed `20260719`、`-race`、20 repetitions、3 parallel slotsで実行します。今回のlocal runでは3 cases × 20 repetitionsがraceなしで完了しました。`t.Parallel`を付けること自体はisolationではなく、mutable fake、temporary directory、server portなどのresource ownershipをcase内へ閉じることが必要です。

## Raceとgoroutine leak

通常suiteは次の両方をgateにします。

```bash
go test -mod=readonly ./...
go test -mod=readonly -race ./...
```

`TestMain`は`goleak.VerifyTestMain`を使い、全test終了後に予期しないgoroutineが残っていないことを確認します。parallel test中の正常なgoroutineを途中でleak扱いしないため、個々のparallel subtestではなくpackage lifecycleの最後に検査します。

race detectorは実行されたpathだけを観測します。greenでもrace absenceの証明ではないため、共有stateを触るparallel pathを意図して実行することが前提です。

## Fuzz corpusとoverflow regression

`FuzzTotal`はquantityとunit priceを生成し、安全な積ならexact total、`int`をoverflowする積なら`ErrTotalOverflow`をoracleにします。

`testdata/fuzz/FuzzTotal/overflow-regression`には、以前のunchecked multiplicationを壊した`MaxInt64 × 2`を保存しています。通常の`go test`でもseed corpusは実行されるため、発見済みfailureは一時的なfuzz cacheではなく永続regressionになります。

```bash
./scripts/run-fuzz.sh
```

scriptは最初にcommitted seedをexact nameで再生し、その後1 worker、100 executionsのbounded campaignを実行します。短いCI campaignは回帰確認用であり、長時間continuous fuzzingの代替ではありません。

## Consumer-owned interfaceとgenerated mock

`Service`が必要とする`PaymentGateway`はconsumerであるcheckout package側に置いた1 method interfaceです。同じcapture protocolを2種類のdoubleで比較します。

| Double | 実装 | 長所 | Cost / 注意点 |
|---|---|---|---|
| handwritten spy | `fakePayments` | dependencyなし、stateとfailureを直接表現、debugが単純 | matcher/cardinalityを手で実装する |
| generated mock | `MockPaymentGateway` | exact argument、call count、failure locationをGoMockが統一 | runtime dependency、55行の生成物、generator更新管理 |

この小さいportではhandwritten spyがdefaultです。複雑なmatcherやcall cardinalityが重要になるとgenerated mockの表現力が有利になります。production interfaceをgenerator都合で広げないことが判断基準です。

generatorはtool dependencyとして固定しています。

```bash
go generate ./...
./scripts/verify-generated.sh
```

`verify-generated.sh`は再生成前後をbyte比較し、committed mockとpinned mockgenのdriftを検出します。

## Allocation benchmark

`BenchmarkTotal100Items`は100 itemsのtotalを測り、`b.ReportAllocs()`で`ns/op`、`B/op`、`allocs/op`を同時に報告します。correctness checkをbenchmark外に残し、compilerが結果を不要と判断しないようにします。

```bash
./scripts/verify-benchmark.sh
```

今回のlocal 3 runsは`1088–1144 ns/op`、`0 B/op`、`0 allocs/op`でした。scriptは3結果とallocation metricの存在をgateにしますが、machine依存の絶対時間は合否に使いません。

## 再現可能なintentional failures

`intentional/failures_test.go`は`intentional` build tagで通常suiteから分離します。wrapperはprocessがnon-zeroで終わることと固有diagnosticの両方を検査します。

| Failure | Commandの中心 | Expected diagnostic |
|---|---|---|
| data race | `go test -race -tags=intentional -run '^TestDataRace$'` | `WARNING: DATA RACE` |
| goroutine leak | `go test -tags=intentional -run '^TestGoroutineLeak$'` | `found unexpected goroutines` |
| order dependence | `go test -tags=intentional -run '^TestOrderDependent' -shuffle=1` | `order dependence detected` |

```bash
./scripts/verify-intentional-failures.sh
```

order fixtureはmutatorと「clean stateを仮定するtest」を固定seedで逆順にし、shared package stateへの依存を再現します。failure logはignored `build/intentional-failures/`へ保存されます。通常testへ`WILL_FAIL`相当の反転を混ぜず、wrapperがexpected failureの意味を保持します。

## Primary references

- [Go fuzzing](https://go.dev/doc/security/fuzz/)
- [Go data race detector](https://go.dev/doc/articles/race_detector)
- [`testing` package](https://pkg.go.dev/testing)
- [GoMock](https://github.com/uber-go/mock)
- [goleak](https://github.com/uber-go/goleak)
