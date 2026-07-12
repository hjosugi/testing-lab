# test(e2e): Playwright critical journeysを完成する
<!-- labels: e2e,playwright,browser-testing,priority-high -->

## Tasks

- [ ] checkout success/failureの2 journeyを追加
- [ ] Chromium/Firefox/WebKit matrix
- [ ] per-test contextとtest data isolation
- [ ] trace/video/screenshotをfailure時だけ保存
- [ ] sleepを除去しweb-first assertionを使用
- [ ] retry前failureをflake metricへ送る

## Acceptance criteria

- [ ] 100回shard実行でflake 0
- [ ] 下位層で検出できる重複assertionを削除

