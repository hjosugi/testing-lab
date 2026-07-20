# Property / fuzz suite review

## 責務分担

| Layer | Engine | Feedback | Persistent artifact |
|---|---|---|---|
| domain property | fast-check 4.9.0 | property failure + shrink | `corpus/*.json` |
| metamorphic | fast-check 4.9.0 | transformed input間のrelation | failure seed、path、minimal input |
| differential | fast-check 4.9.0 | optimized実装と独立referenceの差 | minimal input |
| parser/API fuzz | Go 1.26 toolchain | edge coverage | `labs/go/testdata/fuzz/*` |

fast-checkとGo fuzzerを同じものとして扱いません。fast-checkはdomain-aware arbitraryとshrinkerで意味のある構造を生成し、Go fuzzerはraw parser inputをcoverage feedbackで変異します。

## Domain invariant

| ID | Property | Generator |
|---|---|---|
| I-01 | totalは非負のsafe integer | cart |
| I-02 | valid line追加でtotalは減らない | cart × item |
| I-03 | discount後totalは0以上かつ元total以下 | cart × basis points |
| I-04 | discount率を上げても支払額は増えない | cart × 2 rates |
| I-05 | zero-price line追加はtotalを変えない | cart × item |

exact resultを直接書けないnormalizationには、次のmetamorphic relationを使います。

- item順序を反転してもcanonical cartは同じ
- cartをpartitionして別々にtotalしても和は同じ
- canonicalizationはidempotent
- canonicalization前後でtotalは同じ

optimized `totalOf`は、各unitを繰り返し加算する単純な`referenceTotal`とも比較します。両実装でvalidation helperや集計algorithmを共有しないため、同じfaultを共有するriskを下げています。

## Generator distribution

| Input | Partition | Weight / range | Shrink target |
|---|---|---|---|
| cart size | empty / single / many | 1 / 2 / 7 | emptyまたはbranch内の最小size |
| quantity | boundary / ordinary | 4 / 6、1..1000 | positive integerの1 |
| unit price | boundary / ordinary | 4 / 6、0..1,000,000 | non-negative integerの0 |
| SKU | ASCII letter / digit / `-` | 1..8 characters | shorter string |

固定seed `20260719`で各2,000 samplesを取り、boundary quantity/priceとempty/single/manyの全partitionが期待範囲に入ることをtestします。strictな`.filter`で大量の値を捨てず、制約付きarbitraryからvalid inputを直接生成します。

## Shrinker reviewとsynthetic defect

synthetic legacy実装はquantityを9へ切り詰めます。通常exampleのquantity 1と2はgreenですが、differential propertyは固定seedからfailureを見つけ、専用のinteger arbitraryで次まで縮小します。

```json
{"sku":"A","quantity":10,"unitPrice":1}
```

このcounterexampleを`corpus/synthetic-quantity-cap.json`へcommitし、production実装が10を返すことと、legacy fixtureが9を返すことを毎回再生します。発見を一時的なrunner cacheだけに残さないことがacceptance gateです。

## Coverage-guided parser fuzz

Goの`FuzzParseItemLine`は`sku|quantity|unit-price`をraw stringから直接parseします。accepted inputでは次をoracleにします。

1. format → parseが同じ`Item`へround tripする
2. accepted itemを`Total`が拒否しない
3. `quantity × unit price`とAPI totalが一致する
4. rejected inputは分類済み`ErrInvalidItemLine`を返す

`multi-digit-quantity`と`overflow-regression`をcommit済みcorpusとして先にexact replayし、その後各targetを1 worker、`-fuzztime=100x`のbudgetでcoverage-guided fuzzします。baseline corpusを含む表示execution数はtargetごとに異なります。短いPR campaignはregression gateであり、継続的な長時間campaignの代替ではありません。

## Nixで再現

```bash
nix develop .#generative --command npm --prefix labs/advanced ci
nix develop .#generative --command make test-generative
```

必要なNode.js、npm、Goは`generative` dev shellが供給します。fast-checkはexact manifest pinとnpm lock、GoはNix flakeで固定し、host側の言語runtimeへ依存しません。

## Primary references

- [fast-check core blocks](https://fast-check.dev/docs/core-blocks/)
- [fast-check arbitraries and shrinking](https://fast-check.dev/docs/core-blocks/arbitraries/)
- [fast-check property configuration](https://fast-check.dev/docs/configuration/)
- [Go fuzzing](https://go.dev/doc/security/fuzz/)
- [Metamorphic testing review](https://nottingham-repository.worktribe.com/output/925152/metamorphic-testing-a-review-of-challenges-and-opportunities)
