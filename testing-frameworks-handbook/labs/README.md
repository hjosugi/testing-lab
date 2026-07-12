# Hands-on labs

すべてのラボは同じcheckout behaviorを実装します。

## 進め方

1. production codeを読む
2. Classical testを実行
3. London testを実行
4. internal refactorを行い、どちらが壊れるか観察
5. payment failureを追加
6. parallel実行で共有状態がないことを確認
7. mutationを手動で入れ、testが失敗するか確認

## 共通要件

- empty cartは拒否
- totalはquantity × unit priceの合計
- payment capture成功後にconfirmed orderを保存
- payment failure時はconfirmed orderを保存しない
- domain eventはconfirmed orderに対応

## command

```bash
./scripts/test-all.sh
```

個別commandは各language directoryのREADMEを参照してください。

## Advanced比較ラボ

[advanced/README.md](advanced/README.md)では、同じproduction codeへexample、property、metamorphic、differential、model-based、concurrency、fault injection、characterization、snapshot、security、performanceを重ねます。フレームワークの構文ではなく、各技法の検出能力を比較してください。
