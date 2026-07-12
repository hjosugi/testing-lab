# Advanced technique comparison lab

同じproduction codeへ異なるoracleと入力生成を当てます。外部dependencyはありません。

```bash
cd labs/advanced
npm test
```

## 観察すること

| Test | 狙う欠陥 | Exampleだけでは弱い理由 |
|---|---|---|
| property | 広い入力のinvariant | 手選びcaseに偏る |
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

1. `totalOf`の`quantity`を無視し、どのtestが落ちるか見る。
2. idempotent cacheを削除し、concurrency testを実行する。
3. `sanitize`の正規表現から`authorization`を消し、新caseを加える。
4. legacy shipping ruleの正しい仕様を決めてからcharacterizationを置換する。

意図的変更を元へ戻してから次へ進んでください。
