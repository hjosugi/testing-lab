# advanced: 注文状態をmodel-based testingで検証する
<!-- labels: testing,model-based,property-based -->

## Tasks

- [ ] orderのstate/command/precondition/postconditionをmodel化
- [ ] valid/invalid command sequenceを生成
- [ ] failure seedと最小sequenceを保存
- [ ] duplicate、cancel、refund、retryを追加

## Acceptance criteria

- [ ] 少なくとも1件の手書きexampleでは見逃すmutationをkill
- [ ] 失敗を同じseedで再現可能

