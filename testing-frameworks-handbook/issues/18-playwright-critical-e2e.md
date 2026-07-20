# test(e2e): Playwright critical journeysを完成する
<!-- labels: e2e,playwright,browser-testing,priority-high -->

## Tasks

- [x] checkout success/failureの2 journeyを追加
- [x] Chromium/Firefox/WebKit matrix
- [x] per-test contextとtest data isolation
- [x] trace/video/screenshotをfailure時だけ保存
- [x] sleepを除去しweb-first assertionを使用
- [x] retry前failureをflake metricへ送る

## Acceptance criteria

- [x] 100回shard実行でflake 0
- [x] 下位層で検出できる重複assertionを削除
