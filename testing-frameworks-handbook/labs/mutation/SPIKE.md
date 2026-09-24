# Mutation tool spike（2026-09-25）

同じcheckout domainの高リスクcode（billing、payment state、duplicate charge、secret redaction、data loss）に対して、各言語のmutation toolを実測しました。判断軸はmutation scoreではなく、**PR budget内で動くか**、**survivorをreviewできる粒度で出すか**、**lockとCIで再現できるか**です。

## 実測結果

| 言語 | Tool | 対象 | 初回結果 | 実行時間（local、nice 10） | 採否 |
|---|---|---|---|---|---|
| JavaScript | StrykerJS 10.0.0 + tap-runner | `labs/advanced/src/checkout.js`の高リスク4範囲 | 65 mutant、46 killed、4 timeout、12 survived、3 no coverage（76.9%） | 1分22秒 | 採用。test追加後83 killed + 3 timeout / 86、survivor 0 |
| Java | PIT 1.30.0 + JUnit 5 plugin 1.2.3（Gradle plugin 1.19.0） | `handbook.checkout.*` | 8 mutant、7 killed、1 survived（`unitPrice < 0`→`<= 0`） | 25秒（Gradle込み1分30秒） | 採用。free line caseで8/8 |
| Python | mutmut 3.8.0 | `domain.py`、`application.py` | 99 mutant、84 killed、15 survived | 26秒 | spikeのみ。survivorをreviewし、行動が必要な1件をcurated laneへ移植 |
| Rust | cargo-mutants（既存） | `checked_subtotal`、total path | 7/7 caught | 既存lane | 継続 |
| PHP | Infection（既存） | `src/Checkout.php` | 14/14 killed、equivalent 1件を別fixtureで分類 | 既存lane | 継続 |
| Go | catalog mutant + `go test` | `checkout.go` | 5 mutant、1 killed、4 survived | 5秒 | 採用。boundary/save failure test追加後5/5 |
| C# | catalog mutant + `dotnet test`（NUnit） | `Domain.cs` | 4 mutant中2件が既存testで生存（quantity 0、unchecked total） | 20秒 | 採用。test追加後4/4 |
| C++ | catalog mutant + CTest | `checkout.hpp` | 3 mutant中1件（token破棄）が生存 | 45秒（build込み） | 採用。token記録spy追加後3/3 |

## Python

mutmutの15 survivorのうち、行動が必要だったのは`NoDiscount.discount_for`の`subtotal < 0`→`<= 0`/`< 1`の2件だけでした。0円cartがdefault ruleで拒否されてもtestが落ちない、という本物のbilling gapです。`test_default_rule_accepts_a_free_cart`を追加し、同じmutantを`scripts/mutation_demo.py`のcurated setに固定しました。

残り13件はexception messageの書換え（`None`、`XX...XX`、大文字化）です。公開contractはexception typeと「capture/saveしない」という状態で、messageは人間向けです。全messageをassertするとtestが文言へ結合するため、`decisions.json`の`D-PY-MSG`で`low-value`に分類しました。mutmutをCIへ入れない理由は、survivorの大半がこの種類で、review action rateを下げるだけだからです。

## JavaScript

Strykerの12 survivorはすべて行動につながりました。

- `totalOf`のguardは`Number.isSafeInteger`とrange checkのどちらか片方が消えても既存testが落ちませんでした。NaN、小数、文字列、MAX_SAFE_INTEGER超を明示的に拒否するtestを追加しました。
- `Order.pay`はreserved state guardを消すと、PAID orderへ別keyで再課金できました（duplicate charge risk）。
- `sanitize`は`card(number)?`の`?`を消すと`card`単体が漏れ、array分岐を消すと配列内objectのsecretが漏れました。

timeout 3件（`sanitize`の再帰条件）は無限再帰として検出済みで、Strykerの既定どおりdetectedに数えます。

## Java

PITは`CartItem.subtotal`の`unitPrice < 0`境界だけを見逃しました。0円のgift lineをparameterized caseへ加えて8/8にしました。PITはbytecode mutationなのでJava以外（Kotlin）にもそのまま使えますが、Mockito inline agentとの共存が必要で、`jvmArgs`に同じagentを渡しています。

## Go / C# / C++

go-mutesting、Stryker.NET、Mull/dextoolも候補でしたが、この教材では次の理由でcatalog方式にしました。

- Goの主要toolは長期保守が不安定で、Go toolchain更新に追従できないrelease間隔でした。
- Stryker.NETは有力ですが、`dotnet tool`のlock（tool manifest）とMTP/VSTest二重構成のrunner選択を今回のPR budget内で固定できませんでした。次の候補として残します。
- Mull/dextoolはclang plugin/compilerとの厳密なversion結合があり、Nix clang更新のたびに壊れるriskが高いです。

catalog方式は「reviewer が選んだ高リスク演算子だけを1行置換する」ものです。自動生成の網羅性はありませんが、各mutantが守るrisk（`protects`）を持ち、置換対象が1箇所に一致しなくなるとunit testが落ちるため、production code変更に追従しない古いcatalogを放置できません。

## 採用しなかった指標

- **mutation score閾値だけのgate**: 13件のmessage mutantを全部killすれば数値は上がりますが、risk低減は0です。代わりに`decisions.json`の`reviews`から**review action rate**（reviewしたsurvivorのうちtest追加またはcode修正に至った割合）を出します。今回は19件中17件（89%）でした。
- **全fileの毎PR mutation**: full laneの見積りは合計1125秒でPR budget 600秒を超えます。changed-file laneは高リスクmoduleから順にbudgetへ詰め、溢れた分は理由付きでscheduled laneへ回します。
