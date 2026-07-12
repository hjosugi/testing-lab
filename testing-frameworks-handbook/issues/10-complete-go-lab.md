# lab(go): testing/table/race/fuzzを完成する
<!-- labels: go,fuzzing,hands-on -->

## Tasks

- [ ] `go test ./...`と`-race`を実行
- [ ] table/subtest/t.Parallelのresource isolationを確認
- [ ] fuzz failure seedをcorpusへ保存
- [ ] consumer-owned interfaceとgenerated mockを比較
- [ ] benchmark allocationを追加

## Acceptance criteria

- [ ] race、goroutine leak、order dependenceの各failureを再現可能

