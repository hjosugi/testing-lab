# integration: CLI・filesystem・process protocolを検証する
<!-- labels: integration-testing,cli,filesystem -->

## Tasks

- [ ] exit code、stdout、stderr、signalをcontract化
- [ ] permission、disk full、partial write、atomic renameを注入
- [ ] path space/Unicode/long pathを確認
- [ ] child process timeoutとcleanupを確認

## Acceptance criteria

- [ ] temp directory/processをtestごとに隔離
- [ ] OS固有差とmatrixを文書化

