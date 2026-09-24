# Risk-based mutation lab

8言語のcheckout labへ、riskに応じたmutation laneを割り当てます。目的はmutation scoreを上げることではなく、**高リスクcodeのsurvivorがすべて「testを足した」「codeを直した」「理由と期限つきで受け入れた」のどれかになっている**状態をCIで保つことです。

tool比較の実測と採否は[SPIKE.md](SPIKE.md)を参照してください。

## 構成

| File | 役割 |
|---|---|
| [`risk-map.json`](risk-map.json) | module→risk（high/medium/low）→laneの対応、各laneのcommandと見積り秒数、PR budget（600秒） |
| [`decisions.json`](decisions.json) | survivorの分類（`equivalent`/`low-value`/`accepted-risk`）とowner・期限・根拠、review履歴 |
| [`catalog/`](catalog/) | Go/C#/C++のreviewed mutant catalog（1箇所だけに一致する置換と、守るrisk） |
| [`scripts/mutation-lanes.mjs`](scripts/mutation-lanes.mjs) | changed-file laneとscheduled full laneの計画・実行・Markdown summary |
| [`scripts/gate-stryker.mjs`](scripts/gate-stryker.mjs)、[`scripts/gate-pit.mjs`](scripts/gate-pit.mjs) | Stryker JSON / PIT XMLのsurvivorをdecisionと照合するgate |
| [`scripts/run-targeted.mjs`](scripts/run-targeted.mjs) | catalog mutantを1件ずつ適用し、labのtest commandで判定して必ず元へ戻す |

## Lane

| Lane | Tool | 対象risk | 実行場所 |
|---|---|---|---|
| `python-curated` | curated mutant（mutmut spikeのsurvivorを移植） | billing、discount、empty cart、payment id、通知 | strict CI（既存）+ mutation workflow |
| `go-targeted` | catalog + `go test` | billing境界、overflow、Save失敗（data loss）、token | mutation workflow |
| `php-infection` | Infection | billing、validation | strict CI（既存）+ mutation workflow |
| `js-stryker` | StrykerJS + tap-runner | billing、payment state、duplicate charge、secret redaction | mutation workflow |
| `java-pit` | PIT | billing、empty cart、persistence | mutation workflow |
| `rust-cargo-mutants` | cargo-mutants | total path | strict CI（既存）+ mutation workflow |
| `dotnet-targeted` | catalog + NUnit | billing、overflow、persistence、cancellation | mutation workflow |
| `cpp-targeted` | catalog + CTest | billing、persistence、token | mutation workflow |

`.github/workflows/mutation.yml`は2つのjobに分かれます。

- **changed-file lane**（PRとmainへのpush）: `git diff base...HEAD`のfileをrisk mapへ当て、high→medium→lowの順、同riskでは短いlaneから600秒のbudgetへ詰めます。low riskだけの変更とbudget超過分は、理由付きで`deferred`としてsummaryへ出し、黙って落としません。どのlaneにも属さないproduction file（例: `labs/system/src/`）は`unmapped`として表示し、risk mapの見直し対象にします。
- **scheduled full lane**（毎週日曜18:17 UTCとmanual dispatch）: 全laneを実行します。見積り合計は1125秒で、PR budgetを意図的に超えます。

## Survivorの扱い

1. survivorが出たら、まず**観測可能な振る舞いが変わるか**を読む。変わるなら最小の公開assertionを足す（`reviews`へ`test-added`）。
2. 振る舞いが変わらないことを証明できるなら`equivalent`、振る舞いは変わるが守る価値がないなら`low-value`、直すまで一時的に受け入れるなら`accepted-risk`として`decisions`へ登録する。
3. decisionは`owner`、`reviewBy`、`rationale`、`evidence`必須です。期限切れは`validateLedger`でCIが失敗し、`accepted-risk`は90日以内の再reviewしか許しません。
4. Stryker/PITのgateはdecisionを`mutator + 元のcode + 置換`で照合します。行番号がずれても生き残りますが、対象codeが変わればdecisionは`stale`になりCIが失敗します。

## 指標: review action rate

mutation scoreの代わりに、`reviews`のうち`test-added`または`code-fixed`へ至った割合を出します。今回のspikeでは19件中17件（89%）でした。低い値は「reviewに時間を使ったのにriskが減っていない」＝mutatorやlane対象の見直しが必要、という合図です。

## 実行

```bash
# policy/ledger/catalogのunit test（strict CIの一部）
nix develop --command make test-mutation-policy

# 変更fileに対応するlaneだけをbudget内で実行
nix develop --command node labs/mutation/scripts/mutation-lanes.mjs plan --base origin/main --run

# 計画だけ確認（実行しない）
node labs/mutation/scripts/mutation-lanes.mjs plan --files labs/java/src/main/java/handbook/checkout/CartItem.java

# 全lane
nix develop --command make test-mutation-full
```

## このlabが保証しないこと

- catalog laneは選んだ演算子だけを変えます。catalogにない欠陥の不在は示しません。
- Strykerのtimeout 3件は無限再帰として検出扱いです。性能劣化型の欠陥はperformance labの担当です。
- survivor 0はtestが十分という証明ではありません。oracleの独立性はIssue #36で別に監査します。
