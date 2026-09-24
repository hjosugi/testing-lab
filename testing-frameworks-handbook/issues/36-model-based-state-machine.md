# advanced: 注文状態をmodel-based testingで検証する
<!-- labels: testing,model-based,property-based -->

## Tasks

- [x] orderのstate/command/precondition/postconditionをmodel化
- [x] valid/invalid command sequenceを生成
- [x] failure seedと最小sequenceを保存
- [x] duplicate、cancel、refund、retryを追加

## Acceptance criteria

- [x] 少なくとも1件の手書きexampleでは見逃すmutationをkill
- [x] 失敗を同じseedで再現可能
