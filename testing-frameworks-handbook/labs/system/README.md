# System vertical slice lab

1つのWeb appに複数のtest layerを当て、責務の違いを確認します。

```bash
npm ci
npm exec -- playwright install chromium
npm run verify:browser-lock
npm run test:http-adapter
npm run test:contract
npm run test:property
npm run test:e2e
```

| Test | 実物 | 置換 |
|---|---|---|
| HTTP adapter | Node HTTP server、router、JSON | payment/repository |
| contract | OpenAPIで公開したresponse shape | external infrastructure |
| property | checkout total function | なし |
| E2E | server + Chromium + DOM | payment/repository |
| accessibility | browser DOM + axe rules | 同上 |

Playwright browserはNix側の別packageを混ぜず、`package-lock.json`で固定した`@playwright/test`自身にdownloadさせます。`verify:browser-lock`は`@playwright/test`、`playwright`、`playwright-core`のversion一致、`browsers.json`のChromium revision、実行binaryの存在を検証します。
