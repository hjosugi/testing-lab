# System vertical slice lab

1つのWeb appに複数のtest layerを当て、責務の違いを確認します。

```bash
npm ci
npm run test:http-adapter
npm run test:contract
npm run test:property
npx playwright install chromium
npm run test:e2e
```

| Test | 実物 | 置換 |
|---|---|---|
| HTTP adapter | Node HTTP server、router、JSON | payment/repository |
| contract | OpenAPIで公開したresponse shape | external infrastructure |
| property | checkout total function | なし |
| E2E | server + Chromium + DOM | payment/repository |
| accessibility | browser DOM + axe rules | 同上 |

Playwright browserのdownloadはNix packageとnpm packageのversion一致が必要です。このlabでは明示installを採用し、CIではbrowser imageまたは固定Nix packageへ置き換えてください。
