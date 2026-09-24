# integration: CLI・filesystem・process protocolを検証する
<!-- labels: integration-testing,cli,filesystem -->

## Tasks

- [x] exit code、stdout、stderr、signalをcontract化
- [x] permission、disk full、partial write、atomic renameを注入
- [x] path space/Unicode/long pathを確認
- [x] child process timeoutとcleanupを確認

## Acceptance criteria

- [x] temp directory/processをtestごとに隔離
- [x] OS固有差とmatrixを文書化
