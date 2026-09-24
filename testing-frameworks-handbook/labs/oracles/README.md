# Test oracle audit

critical riskごとにoracleの種類・独立性・守るfailure・保証しないことを[`inventory.json`](inventory.json)へ記録し、全labのtest（JS/TS、Python、Go、Java、Rust、PHP、C#、C++）を静的に監査します。

## 監査rule

| Rule | 検出するもの | 例 |
|---|---|---|
| `no-assertion` | assertion・verify・expect・`t.Fatal`等がないtest | 実行するだけのtest |
| `always-true` | `assert.ok(true)`、`expect(true).toBe(true)`、同じ変数同士の比較 | 常にpassするtest |
| `same-algorithm-expected` | 期待値をproductionと同じ式（`quantity * unitPrice`、同じ`reduce`）で計算 | productionと一緒に間違うoracle |
| `snapshot-assertion` | `toMatchSnapshot`等 | 意味を確認しない一括承認 |

heuristicなので、findingは必ずreviewして[`decisions.json`](decisions.json)へ`fixed`か`accepted`（理由付き）で記録します。testは未決findingを失敗にします。

## 今回の監査結果

- 251 testを監査し、本物のfindingは1件でした: `advanced/test/advanced.test.js`のperformance characterizationが、期待値をproductionと同じ`quantity * unitPrice`の`reduce`で計算していました。独立実装の`referenceTotal`（繰り返し加算）へ置き換えて修正しました。
- 初回はC#のhelper method、Mocha/Javaの`verifyNoInteractions`、Rustの`proptest!` block、local assertion helper（`assertProblem`）を誤検出したため、ruleを修正しました。
- `rust/tests/properties.rs`は同じ掛け算を`u64`で計算するため、inventoryで`partial`（overflow semanticsには独立、式には非独立）と記録し、rstestのexample caseを補完oracleとしています。

## Mutationで見るfalse negative / false positive

- **false negative**: productionの式をそのまま使うoracleは、式を壊すmutantでも一緒に変わるためpassします。testは同じmutantを独立した期待値（350）がkillすることを示します。
- **false positive**: `labs/php`のE-001は、振る舞いを変えないequivalent mutantがsurvivorとして報告される例です。

## 各suiteの「passしても保証しないこと」

全labのREADMEに「保証しないこと」の節があることをtestで強制します。

## 実行

```bash
nix develop .#generative --command make test-oracles
```

## Passしても保証しないこと

- 静的heuristicは構文上のpatternだけを見ます。assertionがあっても比較対象が弱い（型だけを見る等）testは、mutation laneやreviewで見つけます。
- inventoryはcritical riskの代表testだけを記録しており、全testのoracle分類ではありません。
