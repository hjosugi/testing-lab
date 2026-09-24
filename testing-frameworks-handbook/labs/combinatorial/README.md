# Combinatorial configuration lab

browser・locale・auth・payment・feature flagの組合せを、制約付きpairwise（2-way）で設計します。matrixは[`model.json`](model.json)とseedから再生成でき、coverage criterionと除外理由をtestで検証します。

## Model

| 因子 | 値 |
|---|---|
| browser | chromium, firefox, webkit |
| locale | ja-JP, en-US, ar-SA（RTL） |
| auth | guest, password, passkey, sso |
| payment | card, konbini, paypay, invoice |
| bundleDiscountFlag | on, off |

| 制約 | 内容 | 理由 |
|---|---|---|
| C1 | konbini/PayPayはja-JPだけ | 日本storefront限定の決済手段 |
| C2 | invoiceはssoだけ | 請求書払いは法人account（常にSSO） |
| C3 | guestではflag on不可 | bundle discountは会員特典で、guestではflagを評価しない |

過去incidentの組合せ（INC-2026-031: WebKit + ar-SA + passkey、INC-2026-044: Firefox + ja-JP + guest + konbini）は必須caseとして先頭に固定します。必須case自体が制約違反なら生成を止めます。

## 結果（[`matrix.json`](matrix.json)）

| | 件数 | CI時間（1 case 90秒） |
|---|---:|---:|
| 全直積 | 288 | — |
| 制約を満たす全組合せ | 123 | 185分 |
| pairwise suite（incident 2件を含む） | **18** | **27分** |

- coverage criterion: 有効な構成のどれかに現れる**すべての値pair（93組）を100%**覆う
- 3-way coverageは62%で、pairwiseは3因子の相互作用を保証しません（claimしない）
- 除外されるpair（例: `auth=guest & payment=invoice`）は、どの制約で不可能になるかを`excludedPairs`に記録し、説明できないpairがあればtestが失敗します

## 再生成

```bash
node labs/combinatorial/scripts/generate.mjs          # matrix.jsonを再生成
node labs/combinatorial/scripts/generate.mjs --check  # commit済みmatrixが最新か確認（test-allで実行）
nix develop .#generative --command make test-combinatorial
```

因子・値・制約・incidentを変えたら、`model.json`を編集して再生成し、差分（追加/削除されたcase）をreviewします。

## Passしても保証しないこと

- 2-way coverageです。3因子以上の組合せで初めて出る欠陥（例: WebKit + ar-SA + invoice）は、incidentとして必須caseへ追加するか、高risk因子だけ3-wayにします。
- 値の分割（equivalence class）が正しいことは保証しません。例えば「ar-SA」がRTL全体を代表するかはreviewで判断します。
- 制約はmodel.jsonに書いたbusiness ruleだけです。実装側の未知の制約は、生成caseが失敗して初めて分かります。
