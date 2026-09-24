# Concurrency lab: race, deadlock, lost update

逐次testでは見えない並行性の欠陥を、**random sleepを使わずbarrierで再現**し、証拠を残し、修正版が同じ条件で正しく振る舞うことを確認します。

## Shared resource inventory（[`inventory.json`](inventory.json)）

| Resource | Critical section | 保護 | Test |
|---|---|---|---|
| 最後の在庫1個 | stockを読む→判断→`stock - 1`を書く | compare-and-swap、optimistic version check、mutex | lost update |
| customerごとの注文 | 既存注文の確認→insert | idempotency key + unique constraint | duplicate checkout |
| payment ledger lockとinventory lock | 片方を持ったまま他方を取る | 全体のlock順序（A→B）とlock deadline | deadlock |
| worker thread | threadの寿命 | 全workerのexit（code 0）を待つ | leaks |

## 再現方法

- **async（event loop）**: `createStore`の`pause` seamに`createBarrier(2)`を差し込み、2つのrequestを「check直後」「read直後」で必ず揃えます。check-then-actは同じcustomerの注文を2件作り、read-modify-writeは2件売って在庫を1しか減らしません。
- **real thread**: `worker_threads` 4本が`SharedArrayBuffer`上の在庫を扱います。`Atomics.wait/notify`のbarrierで「全員が在庫1を読んでから書く」interleavingを強制し、4本すべてが最後の1個を売ります（逐次実行では1本だけ）。CASとmutex版は同じbarrier条件で1件だけ売ります。
- **deadlock**: 2 threadが逆順にlockを取り、1つ目のlockを持った状態でbarrierに揃えてから2つ目を待ちます。lock待ちには300msのdeadlineがあり、hangではなく「thread 1はAを持ってBを待つ、thread 2はBを持ってAを待つ」という循環の証拠を返します。全体のlock順序を揃えると両方完了します。
- **leak / liveness**: 各testは`within(deadline)`で包み、超えたらその場で失敗します。全workerのexit code 0とthread IDを確認し、Worker/MessagePort handleが残っていないことを検査します。

実行するたびに`build/concurrency-evidence.json`へ、重複注文数、thread別の読み書きlog、deadlock時の保持/待機lockを書き出します。

## CIのrace detector / sanitizer

| Detector | 場所 |
|---|---|
| Go race detector | `scripts/test-all.sh`の`Go-race`（`go test -race`）と`labs/go/scripts/verify-intentional-failures.sh` |
| ThreadSanitizer | `.github/workflows/reproducibility.yml`の`cpp-sanitizer (thread)` |
| goleak | `labs/go`のgoroutine leak check |

JavaScriptにはdata race detectorがないため、このlabはbarrierで危険なinterleavingを決定的に作り、invariant（在庫とsale数、注文数）で検出します。

## 実行

```bash
nix develop .#generative --command make test-concurrency
```

## Passしても保証しないこと

- barrierで作るのは「既知の危険なinterleaving」です。未知のinterleavingの不在は示しません（Go `-race`やTSanは実行されたpathのraceだけを検出します）。
- lock deadlineは検出のためのもので、本番のlock timeout設計の妥当性は別途検討が必要です。
- 実DBのisolation level（Postgresの`SELECT … FOR UPDATE`等）は`labs/python/postgres_tests`が担当します。
