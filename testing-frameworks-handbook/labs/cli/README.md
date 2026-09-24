# CLI / filesystem / process protocol lab

`receipt-cli`（注文JSONからreceipt fileを書くCLI）を、**processの外側から**testします。対象はexit code、stdout/stderr、signal、permission、disk full、partial write、atomic rename、path、child timeoutです。

## Process contract

| 状況 | exit code | stdout | stderr | filesystem |
|---|---:|---|---|---|
| 成功 | 0 | JSON 1行（`out`、`total`、`bytes`） | 空 | receiptが完全な内容で存在 |
| 引数不足・不正 | 2 | 空 | message + usage | 何も作らない |
| 入力が不正（JSON、空cart、不正item） | 65（EX_DATAERR） | 空 | message | 何も作らない |
| 入力fileがない | 66（EX_NOINPUT） | 空 | message | 何も作らない |
| 書けない（EACCES、EFBIG/ENOSPC） | 73（EX_CANTCREAT） | 空 | errno付きmessage | 既存fileは不変、temp fileなし |
| SIGTERM / SIGINT | 143 / 130 | 空 | `interrupted by …` | targetなし、temp fileなし |

書き込みは同じdirectoryのtemp fileへ書き、`fsync`してから`rename`します。途中で失敗・中断しても、読み手は古いfileか完全な新fileだけを見ます。

## Fault injection

| Fault | 注入方法 |
|---|---|
| permission denied | 出力directoryを`0500`にする（rootでは無意味なのでskip） |
| disk full | `bash -c 'trap "" XFSZ; ulimit -f 1; exec node …'`でfile sizeを512 byteに制限し、`write`を`EFBIG`で失敗させる（ENOSPCと同じ「途中まで書けた」形） |
| partial write + signal | `--slow-ms`（test seam）で前半と後半の書き込みの間を広げ、temp fileの出現を監視してsignalを送る（固定sleepではなく状態を待つ） |
| hung child | `--slow-ms 60000`をdeadline 300msで起動し、process groupごと`SIGKILL`してPIDが残らないことを確認 |

## 隔離

各testは`mkdtemp`の専用directoryを持ち、`t.after`で削除します。childは`detached`で起動し、timeout時はprocess group（`-pid`）へsignalを送ります。

## OS差のmatrix

| 観点 | Linux（ext4/btrfs、CI ubuntu-24.04） | macOS（APFS、CI macos-15） | Windows（未対象） |
|---|---|---|---|
| NFC/NFDを含むfile名 | 与えた名前でround-trip | 与えた名前でround-trip。APFSは名前を正規化非依存で比較するため、testのNFC/NFD名は接尾辞を変えて別fileにしている | — |
| `ulimit -f`による書込み失敗 | `EFBIG` | `EFBIG` | なし（skip） |
| directory permission | rootは無視（skip） | 同左 | ACLで別挙動 |
| signal | SIGTERM/SIGINT handler | 同左 | `SIGTERM`はprocessを即終了（handler不可） |
| 長いfile名（200文字） | 255 byteまで | 255 UTF-16 unitまで | `MAX_PATH`設定依存 |

Windowsの`.NET` laneはpath/SDKの差分確認用で、このCLI laneはLinux/macOSのstrict jobで実行します。

## 実行

```bash
nix develop .#generative --command make test-cli
```

## Passしても保証しないこと

- `ulimit -f`は本物のdisk fullではなくfile size制限です。filesystem全体のENOSPC（metadata書込み失敗、journal）は再現しません。
- network filesystem（NFS/SMB）でのrenameの原子性は検証していません。
- Windowsのsignal/permission semanticsは対象外です（matrix参照）。
