# Node.js: built-in runner, Mocha, AVA

```bash
npm ci
npm test
npm run test:node
npm run test:mocha
npm run test:ava
npm run test:semantics
npm run test:unawaited
```

- 3 runnerは[`test/helpers/checkout-cases.js`](test/helpers/checkout-cases.js)の同じcheckout behaviorを実行
- Node runner: dependency-free baseline、default process isolation
- Mocha: assertion/mockを自由に組み合わせるserial-first architecture
- AVA: concurrent-by-default、worker-thread file isolation
- Node mock / Sinon spy・stub、ESM DI / module mockを実行比較
- unawaited rejectionをintentional failureとして子processで再現

実測値、選定基準、保存したfailure outputは[`EXECUTION-MODEL.md`](EXECUTION-MODEL.md)を参照してください。
