# Snapshot / golden / visual approval lab

snapshotを「一括更新で通すもの」ではなく、**意味のある差を判断し、理由付きで承認するもの**として運用します。

## 整理: semantic assertionで置き換えられるsnapshot

| 対象 | 置き換え | 残すgolden |
|---|---|---|
| receiptの合計 | `TOTAL`行と明細の和の一致をassert | 行formatとsku表記（`baselines/receipt.golden.txt`） |
| 画面の注文時刻 | 時刻はsemantic assertionへ移し、visualではmask | — |
| checkout画面のlayout | — | `baselines/checkout-2-items.ppm`（header、明細行、合計、button） |

## 決定的なrender

[`config.json`](config.json)でviewport（64×40）、clock（`2026-09-25T00:00:00Z`）、animation無効、fontなし（文字列長に比例したblock描画）を固定し、同じ状態から常にbyte同一の画像を作ります。

## Threshold と mask

- 差分ratioのthresholdは0.1%、上限0.2%。maskは理由必須で、合計でviewportの5%以下（`auditConfig`がtestで検査）
- 注文時刻のmaskで毎回変わる時刻は無視し、合計金額の変化（1560→156000）は0.1%を大きく超えて検出
- 失敗artifactは変化したpixel数・ratio・bounding box（合計欄の`x 20..27, y 26..28`）を返し、「何が変わったか」を画像を開かずに判断できます
- viewportが違う比較は差分を取らず`comparable: false`で止めます

## 承認workflow（[`approvals.json`](approvals.json)）

- baselineは**そのcontent hashに対する承認**がある場合だけ有効です。内容が変われば新しいhashに新しい承認が必要です
- reviewerはauthorと別人で、20文字以上の具体的な理由が必要です
- 同じ理由（例: "update snapshots after refactor"）を複数baselineが共有したら**bulk update**として拒否します

**現状**: 2つのbaselineはlabと同時に作成したもので、人のreviewerによる承認はまだありません。`approvals.json`の`pending`に記録し、testは「未承認として報告される」ことを確認しています（承認済みとは主張しません）。

## 実行

```bash
nix develop .#generative --command make test-golden
```

## Passしても保証しないこと

- block描画はlayoutと内容量の変化を捉えますが、文字の誤字、font rendering、色覚上の問題は検出しません（実browserのvisual testはPlaywright screenshotとOS/font固定が必要）。
- maskした領域の内容はvisualでは検証されません。対応するsemantic assertionが必要です。
