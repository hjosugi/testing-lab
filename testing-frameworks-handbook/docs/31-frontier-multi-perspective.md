# 最先端テストを「7つの観点」で理解する

確認日: 2026-07-12

最先端のテストは、単一のツールや手法ではなく、**複数の観点が同時に動いている状態**として理解すると全体がつながります。この章は既存の深掘り章への「観点別の入口」です。1つの観点だけで語られるベストプラクティスは、他の観点から見ると偏っていることが多い、というのが本章の中心メッセージです。

## 観点マップ

| # | 観点 | 中心の問い | 深掘り章 |
|---|---|---|---|
| 1 | 思想 | 何を「単体」とみなし、何を偽物に置き換えるか | [02](02-london-vs-classical.md), [06](06-test-doubles.md) |
| 2 | Oracle | 「正しい」を誰がどう定義するか | [17](17-test-oracles-deep-dive.md) |
| 3 | 生成 | テスト入力とテストコードを誰が作るか | [19](19-generative-and-search-based-testing.md) |
| 4 | 実行環境 | どこで・いつ検証するか（CIから本番まで） | [18](18-test-levels-deep-dive.md), [28](28-case-study-commerce.md) |
| 5 | 対象 | 決定的なコードか、分散系か、確率的なAIか | [23](23-data-ml-llm-agent-testing.md) |
| 6 | 経済性 | テストにいくら払い、何を諦めるか | [24](24-ci-flakiness-economics.md) |
| 7 | 研究 | エビデンスはどこまで信じられるか | [13](13-research-and-modern-practice.md), [27](27-research-guide.md) |

## 観点1: 思想 — schoolsは「対立」から「使い分けのスペクトラム」へ

Classical（Detroit）とLondon（mockist）の論争は、2026年には「solitary／sociable unit test」の**スペクトラム**として整理されています。

- 最先端の合意点は「**実装ではなく契約をテストする**」。London styleの弱点とされた「mockがprotocolを固定しすぎてrefactoringを壊す」問題は、mock対象を「自分が所有する境界のrole」に限定することで回避します。
- 逆にClassical styleの弱点「失敗時に原因の位置が分かりにくい」は、テストサイズを絞り、observability（trace、structured logging）で補うのが現代的です。
- 実践では「domainはsociable + real object、外部境界はcontract + test double」というhybridが標準です（[04-build-hybrid-policy](../issues/04-build-hybrid-policy.md)で演習）。

## 観点2: Oracle — assertionからLLM-as-judgeまで

テストの本体はassertionではなく**oracle（正解の定義）**です。最先端の変化はoracleの多様化です。

| Oracle | 例 | 強い場面 | 弱点 |
|---|---|---|---|
| specified | `assert total == 1050` | 仕様が明確 | 仕様の書き漏れ |
| property/invariant | 「itemを足してtotalは減らない」 | 入力空間が広い | property設計が難しい |
| metamorphic | 「並べ替えても結果不変」 | 期待値が計算不能 | 関係の発見が難しい |
| differential | 参照実装・旧実装と比較 | migration、最適化 | 参照側のバグ |
| LLM-as-judge | 生成文の品質採点 | 自然言語出力 | judge自体のbias・drift検証が必要 |

LLM-as-judgeは2025〜2026年に急速に普及しましたが、**judgeのcalibration（人間評価との一致率測定）を省くと「テストしているつもり」になる**ことが繰り返し報告されています。実装例は[labs/advanced](../labs/advanced/)のoracle別テスト11種を参照してください。

## 観点3: 生成 — 人間が書く時代から「人間が審査する」時代へ

- **Property-based testing / fuzzing**は入力生成の自動化。coverage-guided fuzzing（libFuzzer、AFL++、Goのnative fuzzing）はsecurity領域で標準になりました。
- **LLMによるテスト生成**は2026年の最大の変化です。研究では、生成テストは「コンパイルが通りassertionが弱い」傾向（oracle problemの再来）が指摘されています。mutation testingで生成テストの検出力を測るのが現実的な受け入れ基準です。
- 逆説的に、**mutation testing**の価値が上がりました。テストを書くのが安くなったので、「そのテストはバグを検出できるのか」を測る側が律速になったためです。
- 実務の型: 「LLMが生成 → mutation scoreとreviewで審査 → 人間はproperty・contract・edge caseの設計に集中」。

## 観点4: 実行環境 — 「CIで終わり」から「本番も検証面」へ

最先端のテストはCIの内側で完結しません。

1. **PR前**: unit＋component＋contract（分単位）。
2. **CI**: integration（Testcontainersで本物のDB／broker）、E2E最小セット、mutation（変更行のみ）。
3. **デプロイ路**: canary、feature flag、progressive delivery。「テストの失敗」ではなく「メトリクスの劣化」が判定基準になります。
4. **本番**: synthetic monitoring（合成トランザクションの常時実行）、chaos engineering（定常状態仮説の実験）。
5. **シミュレーション**: FoundationDB系の**deterministic simulation testing**（Antithesis等）は、分散システムのrace・障害シナリオを決定的に再現する手法として2024年以降広く知られるようになりました。「再現できないバグ」を原理的に潰す、現時点で最も先端的な方向の1つです。

## 観点5: 対象 — 決定的コード・分散系・データ・AIでテストは別物

- **決定的なコード**: xUnit＋property。この領域の手法は成熟済み。
- **分散システム**: 順序・重複・部分障害が本質。delivery semantics（at-least-once等）のテスト、Jepsen的なlinearizability検証、deterministic simulation。
- **データ/ML**: 「unit tests for data」（Deequ等のexpectation）、モデルはbehavioral testing（invariance／directional expectation）とslice評価。
- **LLM/agent**: evals（golden set＋LLM-as-judge＋human calibration）、red-teaming、regression evalのCI組み込み、agentはsandbox環境でのtask成功率・副作用検査（[48-agent-evaluation-sandbox](../issues/48-agent-evaluation-sandbox.md)）。**pass/failからスコア分布へ**、が最大のパラダイム差です。

## 観点6: 経済性 — flakinessと選択が最重要の運用課題

- 大規模組織の報告では、**flaky testはテスト運用コストの最大要因**です。検疫（quarantine）、自動リトライの計測付き利用、flakiness予算が標準装備になりました。
- **test selection／prioritization**（変更に関係するテストだけ実行）は、大規模monorepoでは必須。MLベースのpredictive selectionは「見逃し率」を測って導入します。
- 「テストピラミッド」は比率の教義ではなく**feedback速度とコストの配分問題**として扱うのが2026年の主流です（Testing TrophyもHoneycombも同じ問いへの別解）。

## 観点7: 研究 — エビデンスの強さを見てから採用する

- 「coverageと欠陥検出の相関は弱い（テスト数を統制すると）」「mutation scoreはより強い指標」という系列の研究は、CIゲート設計に直接効きます。
- LLM生成テストの評価研究は急増中ですが、benchmark contamination（評価対象がモデルの学習データに含まれる問題）に注意。
- 論文の読み方・再現の型は[27-research-guide](27-research-guide.md)と[templates/research-reproduction.md](../templates/research-reproduction.md)へ。

## この章の使い方

1. 自分のプロジェクトを7観点で1行ずつ現状診断する（例:「oracleはspecifiedのみ」「本番は検証面になっていない」）。
2. 最も弱い観点に対応する深掘り章を読み、[issues/](../issues/)の対応演習を1つ実施する。
3. 四半期ごとに再診断する。観点のバランスが取れているかが「最先端かどうか」より重要です。
