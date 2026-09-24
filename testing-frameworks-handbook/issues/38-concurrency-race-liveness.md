# concurrency: Race・deadlock・lost updateを検証する
<!-- labels: testing,concurrency,priority-high -->

## Tasks

- [x] shared resourceとcritical sectionをinventory
- [x] parallel duplicate checkoutをbarrier同期で再現
- [x] race detector/sanitizerをCIへ追加
- [x] liveness deadlineとgoroutine/thread/task leakを検査

## Acceptance criteria

- [x] sequential testでは見えない失敗を再現
- [x] random sleepに依存せずfailure evidenceを保存
