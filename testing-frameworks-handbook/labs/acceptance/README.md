# ATDD / BDD / Specification by Example lab

coupon機能を例に、example mapping → business languageのGherkin → 実行可能なacceptance test → lower-level testへのtraceability → 3役reviewの記録、までを1本の流れで検証します。

## 流れ

1. **Example mapping**（[`EXAMPLE-MAPPING.md`](EXAMPLE-MAPPING.md)）: story CHK-42をrule R1〜R5、example、未決question（Q1、Q2、owner付き）へ分解します。questionが残るruleにはscenarioを追加しません。
2. **Gherkin**（[`features/coupon.feature`](features/coupon.feature)）: `Rule:`ごとに`@R<n>`と`@AC-<n>`をtagし、UI操作ではなく「customerが何を払うか」「なぜ拒否されるか」だけを書きます。境界はScenario Outlineの表で表現します（3000円/2999円、期限日/翌日）。
3. **実行層**（[`src/gherkin.mjs`](src/gherkin.mjs)、[`src/steps.mjs`](src/steps.mjs)）: 依存なしの最小Gherkin runnerがFeature/Background/Rule/Scenario Outline/Examplesを展開し、step definitionはdomain API（`applyCoupon`）だけを呼びます。
4. **Lower-level test**（[`test/domain.test.mjs`](test/domain.test.mjs)）: 各ruleを`R<n> …`という名前のunit testで固定します。acceptanceにない「拒否された試行はredemptionを消費しない」もunit側で守ります。

## Gate

| Gate | 失敗させるもの |
|---|---|
| business language lint | step内のclick、button、page、field、selector、URL、「"x"をyへ入力」などUI detail |
| duplicate scenario | 展開後に同じstep列になるscenario |
| rule tag | `@R<n>`のないscenario |
| undefined / ambiguous step | 対応するstep definitionが0件または2件以上（黙ってpassしない） |
| slow step | 1 stepが50msを超える（重いsetupはlower layerへ移す合図） |
| traceability | 各ruleにacceptance criterion tag、scenario、`R<n>`名のunit testがそろっている |
| review binding | sign-offは`review.json`に記録したfeature fileのSHA-256に対してだけ有効。exampleを1文字でも変えると全sign-offがstaleになる |

## Reviewの現状

[`review.json`](review.json)は`product`、`qa`、`engineer`の3役のsign-offを要求しますが、**現時点でsign-offは0件**です。このlabのexampleはengineering draftで、3役によるexample mapping sessionはまだ行っていません。testは「sign-offを主張していない」ことと、sign-offがfeature textのhashへ結び付く仕組みの両方を確認します。

## 実行層の比較

| 観点 | Cucumber（JS/JVM） | Gauge | Concordion | このlabの最小runner |
|---|---|---|---|---|
| spec形式 | Gherkin `.feature` | Markdown spec | HTML/Markdownの文書に埋め込むinstrumentation | Gherkin subset |
| 読み手 | product/QA/engineer | 主にQA/engineer | 文書として読むstakeholder | 教材の読者 |
| step binding | regex/Cucumber Expression | step text + parameter | 文書内のcommand属性 | regex |
| reporting | HTML/JSON/JUnit、Cucumber Reports | HTML report、plugin | 実行済み文書そのもの | node:test（TAP/JUnit reporter） |
| lock-in | Gherkinは移植性が高い | Gauge独自spec | Concordion独自markup | Gherkinなので移行容易 |
| 採用判断 | product側がGherkinを読む/書くならこれ | QA中心のspecで十分な場合 | 「生きた文書」を主目的にする場合 | 依存を増やさず方法だけ示す |

実案件ではCucumberを第一候補にし、このlabのlint（UI detail、duplicate、rule tag、traceability、review binding）をCucumberのformatter/pluginとして同じ規則で運用します。

## 実行

```bash
nix develop .#generative --command make test-acceptance
```

## このlabが保証しないこと

- 3役によるreviewそのものは人の活動です。仕組みはありますが、reviewが行われたことはまだ主張しません。
- UI detail lintは語彙ベースです。「business behaviorを書いているか」の最終判断はreviewで行います。
