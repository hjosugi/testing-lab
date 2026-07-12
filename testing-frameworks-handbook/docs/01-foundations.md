# テストの基礎

## テストは何をするものか

テストの価値は、変更に対して速く、局所的で、信頼できる情報を返すことです。単に green を表示するだけでは不十分です。

よいテストには次の性質があります。

- Deterministic: 同じ前提なら同じ結果になる
- Isolated enough: 他テストの順番や共有状態に依存しない
- Behavior-focused: 公開された振る舞いを守る
- Diagnostic: failure から原因候補を狭められる
- Fast enough: 必要な頻度で実行できる
- Maintainable: production refactor と無関係な修正を要求しない

## xUnit の設計思想

SUnit から JUnit、NUnit、pytest の xUnit-style fixture へ続く基本形は次です。

1. arrange／setup
2. act／exercise
3. assert／verify
4. teardown

framework は discovery と lifecycle を標準化し、テスト作者が「どう実行するか」より「何を保証するか」に集中できるようにします。一方、暗黙の global fixture や継承ベースの巨大 fixture は、各 test の前提を読みにくくします。

## unit の定義

`unit = class` と固定しないでください。実務では次の3つが混在します。

- class/function unit: 小さい algorithm や value object
- behavior unit: 複数 object が協調して1つの domain behavior を実現
- process boundary unit: in-memory の component 全体を1 unit として外部I/Oだけ置換

Classical は複数の実 object を含む sociable unit を許容しやすく、London は subject の collaborator を double にして solitary unit を作りやすい、という傾向があります。

## FIRST を絶対則にしない

- Fast: 速度は feedback budget に対する相対値
- Independent: 実行順非依存は重要だが、integration fixture の共有が常に悪いわけではない
- Repeatable: clock、random、network、locale、timezone を制御する
- Self-validating: 人が log を読む前提にしない
- Timely: TDD だけでなく bug reproduction test や characterization test も価値がある

## AAA と Given-When-Then

AAA はコード構造、Given-When-Then は business behavior の物語に向きます。コメントを機械的に3つ書くより、各段階が一目で分かれる小さいテストにします。

```text
Given an in-stock item and a valid payment method
When the customer checks out
Then the order becomes confirmed
And one payment is captured
```

## coverage の正しい読み方

Line coverage 100% でも、assertion が弱ければ欠陥を見逃します。

```python
result = calculate_total(items)
assert result is not None
```

このテストは多くの誤実装を通します。coverage は「実行されなかった場所」を探す計器であり、仕様充足の証明ではありません。branch coverage、mutation testing、production incident history と組み合わせます。

## flaky test の原因分類

| 原因 | 例 | 対応 |
|---|---|---|
| time | midnight、timezone、timeout | clock injection、明示 timezone |
| concurrency | race、port collision | unique resource、synchronization |
| order | shared singleton／DB | reset、transaction、random order |
| network | external dependency | local fake、contract test、service virtualization |
| UI synchronization | sleep に依存 | observable condition／auto-wait |
| random | seed 非保存 | seed 出力、minimal counterexample 保存 |
| environment | locale、CPU、filesystem | hermetic config、Nix、container |

retry は診断用シグナルにはなりますが、恒久対策ではありません。隔離する場合は owner と期限を持つ Issue を作ります。

