# Regression corpus

生成testで見つけた最小counterexampleを、原因・oracle・発見seedと一緒にcommitします。

- `synthetic-quantity-cap.json`: example suiteのquantity 1/2では見えない、legacy実装のquantity 9上限をfast-checkが発見したfixture
- `../test/generative.test.js`: corpusを毎回再生し、修正版ではgreen、synthetic legacy実装ではredになることを確認
- `../../go/testdata/fuzz/FuzzParseItemLine/`: Go coverage-guided fuzzerで保存したparser corpus

一時的なfast-check pathやGo build cacheだけへfailureを残しません。機密値を除去し、最小化したinputをreviewしてからここへ昇格します。
