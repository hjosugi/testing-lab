# Advanced technique comparison lab

同じproduction codeへ異なるoracleと入力生成を当てます。fast-checkはdomain property、metamorphic relation、differential oracle、shrinkingを担当し、Go標準fuzzerはparser/APIのcoverage-guided探索を担当します。

```bash
nix develop .#generative --command npm --prefix labs/advanced ci
nix develop .#generative --command make test-generative
```

generator分布、5件のdomain invariant、shrinker、corpus運用のreview結果は[GENERATOR-REVIEW.md](GENERATOR-REVIEW.md)を参照してください。

## 観察すること

| Test | 狙う欠陥 | Exampleだけでは弱い理由 |
|---|---|---|
| property | 5件のdomain invariant | 手選びcaseに偏る |
| coverage-guided fuzz | parser/APIの未知branch | valid exampleだけではmalformed inputへ届かない |
| metamorphic | 正解値不明でも関係を確認 | exact expectedが作れない |
| differential | 最適化実装の差 | 両実装が独立oracleになる |
| model-based | command列・状態遷移 | 連続操作の組合せが多い |
| concurrency | 同時実行のside effect | 逐次testではraceを作れない |
| fault injection | retry/recovery | success pathだけでは不十分 |
| characterization | legacyの変更前安全網 | 仕様が失われている |
| snapshot | 大きめartifactの意図しない差 | assertionを全部手書きしにくい |
| security invariant | 機密情報の漏洩 | functional successと別軸 |
| performance | 速度分布と退行 | correctness testは速度を見ない |

## 実験

1. `corpus/synthetic-quantity-cap.json`を再生し、exampleでは見えないquantity 9上限を確認する。
2. idempotent cacheを削除し、concurrency testを実行する。
3. `sanitize`の正規表現から`authorization`を消し、新caseを加える。
4. legacy shipping ruleの正しい仕様を決めてからcharacterizationを置換する。

意図的変更を元へ戻してから次へ進んでください。

## Passしても保証しないこと

- generatorの分布外（巨大cart、非整数通貨）の入力は探索していません。分布は[GENERATOR-REVIEW.md](GENERATOR-REVIEW.md)で確認します。
- performance characterizationは測定値を記録するだけで、性能gateではありません（`labs/performance`が担当）。
- concurrency testはprocess内のPromise並行で、複数process・DBのraceは対象外です。
