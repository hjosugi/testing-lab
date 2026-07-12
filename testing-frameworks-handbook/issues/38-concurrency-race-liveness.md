# concurrency: Race・deadlock・lost updateを検証する
<!-- labels: testing,concurrency,priority-high -->

## Tasks

- [ ] shared resourceとcritical sectionをinventory
- [ ] parallel duplicate checkoutをbarrier同期で再現
- [ ] race detector/sanitizerをCIへ追加
- [ ] liveness deadlineとgoroutine/thread/task leakを検査

## Acceptance criteria

- [ ] sequential testでは見えない失敗を再現
- [ ] random sleepに依存せずfailure evidenceを保存

