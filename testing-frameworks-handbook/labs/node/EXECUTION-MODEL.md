# Node test runner / Mocha / AVA execution model lab

frameworkのfeature数ではなく、testが「いつ完了し、どこで並列化され、何を共有するか」を実行して比較します。

## 同じbehaviorを比較する

[`test/helpers/checkout-cases.js`](test/helpers/checkout-cases.js)の2 caseを3 runnerで共有します。

| Runner | Test | Assertion / double |
|---|---|---|
| `node:test` | [`test/node/classical.test.js`](test/node/classical.test.js) | `node:assert` + hand-written fake |
| Mocha | [`test/mocha/classical.test.js`](test/mocha/classical.test.js) | `node:assert` + hand-written fake |
| AVA | [`test/ava/classical.test.js`](test/ava/classical.test.js) | AVA assertion + hand-written fake |

runner固有のsyntaxを除けば、入力、observable result、fakeへの保存、payment callのoracleは同一です。framework比較のためにbehaviorを変えてはいけません。

## serial / concurrent / file isolationの実測

`npm run test:semantics`は300msのasync probeを2つ実行し、start/end timestamp、PID、`worker_threads.threadId`を採取します。固定時間そのものではなく、intervalのoverlapとexecution contextの分離をgateします。

2026-07-19 JST、Node 24.18.0 / Mocha 11.7.6 / AVA 8.0.1で[`artifacts/execution-semantics.json`](artifacts/execution-semantics.json)に保存した実測です。

| Runner | Scenario | Work window | Overlap | Processes | Contexts |
|---|---|---:|---:|---:|---:|
| `node:test` | same-file default | 605ms | no | 1 | 1 |
| `node:test` | same-file `{ concurrency: true }` | 306ms | yes, 297ms | 1 | 1 |
| `node:test` | 2 files、`--test-concurrency=2` | 317ms | yes, 285ms | 2 | 2 |
| Mocha | same-file default | 605ms | no | 1 | 1 |
| Mocha | 2 files、`--parallel --jobs=2` | 303ms | yes, 303ms | 2 | 2 |
| AVA | same-file `.serial` | 605ms | no | 1 | 1 |
| AVA | same-file default | 302ms | yes, 300ms | 1 | 1 |
| AVA | 2 files、`--concurrency=2` | 312ms | yes, 288ms | 1 | 2 |

CI負荷でms値は変わります。gateする関係は次です。

- `node:test`: file内はdefault serial。concurrent suiteも同じevent loop/threadでinterleaveする。defaultのfile isolationはchild process。
- Mocha: file内はserial。`--parallel`はfileをworker process poolに配る。今回の同時2 fileは別PIDだが、workerは再利用されるため「常にfresh process」というisolation contractではない。
- AVA: file内testはdefault concurrentで、`.serial`がopt-out。各test fileはdefaultで新しいworker threadに分離される。

probeは[`test/semantics/`](test/semantics/)にあり、`--record`だけが観測artifactを更新します。

## Node mockとSinon spy / stub

spyはreal behaviorを実行しながらcallを観測し、stubはbehaviorをtest側で置換します。この区別はlibrary名より重要です。

| Intent | Node標準mock | Sinon |
|---|---|---|
| real methodを観測 | `t.mock.method(object, name)` | `sinon.spy(object, name)` |
| behaviorを制御 | `t.mock.fn(implementation)`またはreplacement付き`mock.method` | `sinon.stub().resolves(...)` |
| call履歴 | `fn.mock.calls` / `callCount()` | `spy.args` / `calledOnceWithExactly` |
| cleanup | test context終了時にrestore | sandboxを`afterEach`で`restore()` |

実行例は[`test/node/doubles.test.js`](test/node/doubles.test.js)と[`test/mocha/doubles.test.js`](test/mocha/doubles.test.js)です。Sinonのspyは元の`capture()`がstateを更新すること、stubは`pay-controlled`へ結果を置換することを別testで確認します。

## ESM dependency injectionとmodule mock

[`src/receipt.js`](src/receipt.js)のrandom ID boundaryを2通りで制御します。

### 1. dependency injection

```js
createReceiptId({ randomId: () => 'injected-id' });
```

- normal importのまま動く
- module cacheやload順に依存しない
- runner固有flagが不要
- application-owned boundaryの第一候補

実行例: [`test/node/dependency-injection.test.js`](test/node/dependency-injection.test.js)

### 2. ESM module mock

```js
t.mock.module('node:crypto', {
  exports: { randomUUID: () => 'module-mocked-id' }
});
const { createReceiptId } = await import('../../src/receipt.js?module-mocked');
```

- mock登録後にsubjectをdynamic importする必要がある
- mock前に取得済みのreferenceは変わらない
- Node 24では`--experimental-test-module-mocks`が必要
- DIできないlegacy/static import seamを扱える一方、loaderとcacheへの結合が増える

実行例: [`test/module-mock/receipt.test.js`](test/module-mock/receipt.test.js)

結論は「module mockが使えるから使う」ではありません。自分たちが所有するboundaryはDIで明示し、変更できないmodule boundaryだけを狭くmockします。

## unawaited async failure

誤りはPromiseを開始したのに、test functionからreturnもawaitもしないことです。

```js
// incorrect: runnerにはsynchronous completionに見える
void startCheckoutWithoutAwaiting();

// correct
await startCheckout();
// または
return startCheckout();
```

[`scripts/intentional-failures.mjs`](scripts/intentional-failures.mjs)は誤ったfixtureを3 runnerの子processで実行します。各子processが非0終了し、`UNAWAITED_CHECKOUT_FAILURE`を報告することを、親のpassing testとして検証します。

保存したnormalized output:

- [`node:test`](artifacts/intentional-failures/node-test.md): individual testを一度pass表示した後、extraneous async activityでfileをfail
- [Mocha](artifacts/intentional-failures/mocha.md): `1 passing`の後、unhandled rejectionでprocess exit 7
- [AVA](artifacts/intentional-failures/ava.md): `1 test passed`とuncaught exceptionを併記してexit 1

`--unhandled-rejections=strict`を明示して、localとCIのprocess policyを一致させます。重要なのは「後でprocessが落ちたから安全」ではなく、testがPromiseを返してfailureを該当testへ帰属させることです。

## execution modelから選ぶ

| Need | First candidate | Decision reason |
|---|---|---|
| dependency最小、Node releaseと一体で運用 | `node:test` | standard library、default process isolation |
| 既存のassertion/double/pluginを自由に構成 | Mocha | serial baselineとpluggable architecture |
| concurrent-by-defaultとfile-level thread isolationを規約化 | AVA | concurrency/isolationがdefault |
| shared global stateや順序依存が多い | まず設計を修正 | runner optionで隠すとparallel化時に再発 |

feature checklistの点数ではなく、次をteamの制約と照合します。

1. same-file testはserialかconcurrentか。
2. file間でprocess、thread、module cache、global stateの何が共有されるか。
3. async completionをrunnerがどう認識するか。
4. failureが該当testへ帰属するか、process-level errorになるか。
5. double/module seamがproduction designを歪めないか。

## Commands

```bash
npm ci
npm test

# 同じcheckout behavior
npm run test:node
npm run test:mocha
npm run test:ava

# execution semanticsを実行時に検証
npm run test:semantics

# intentional failureを子processで検証
npm run test:unawaited

# 観測artifactを意図的に更新
npm run record:semantics
npm run record:unawaited
```

## Primary references

- [Node.js 24 test runner: execution model, async activity, mocking](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [Mocha parallel mode](https://mochajs.org/features/parallel-mode/)
- [Mocha asynchronous code](https://mochajs.org/features/asynchronous-code/)
- [AVA 8 writing tests: concurrency, isolation, Promise support](https://github.com/avajs/ava/blob/v8.0.1/docs/01-writing-tests.md)
- [Sinon spies](https://sinonjs.org/releases/latest/spies/)
- [Sinon stubs](https://sinonjs.org/concepts/stubs/)
