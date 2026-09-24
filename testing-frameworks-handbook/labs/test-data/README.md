# Test data factory, isolation, and privacy lab

testが必要とするdataを**最小・有効・名前空間付き・synthetic**に作り、並列実行でも衝突せず、artifactへ個人情報やsecretを残さないことを検証します。

## Factory（[`src/factory.mjs`](src/factory.mjs)）

- **meaningful defaults**: `order()`だけで「1行・JPY・CONFIRMED・合計1200円」の有効な注文になります。testは関心のあるfieldだけを上書きし（`order({ status: 'CANCELLED' })`）、合計のような派生fieldは上書きに追従します。
- **namespace**: IDは`t-<runId>-<worker>-<kind>-<seq>`、emailは`<id>@example.test`（予約TLD）で、tenantもnamespaceです。
- **manifest**: `runId`、`worker`、`seed`、`clockStart`、`locale`、`timeZone`、生成件数を返します。時刻は`Date.now()`ではなく記録した時計から進むため、同じmanifestで同じdataを再生成できます。

## 隔離とcleanup

- 4つのprocessが同じSQLite file（WAL）へ50件ずつ書き込むtestで、namespace付きfactoryは衝突0・200行・4 tenant、global sequenceのnaive factoryは150件がUNIQUE違反になります（negative control）。
- cleanupはnamespace単位の`DELETE … WHERE tenant = ?`で、2回目は0件（idempotent）、他のtestのrowには触れません。

## Production data policy

1. **production dataをtest fixtureへcopyしない**。bug再現にproduction形状のsampleが必要な場合も、`anonymize()`を通したものだけを使います。
2. `anonymize()`は不可逆です: IDとemailはrunごとのsalt付きhashでpseudonym化（run間でjoinできない）、氏名は置換、card・住所詳細・自由記述noteは削除、生年月日は年へ一般化します。
3. factoryとfixtureは`assertSynthetic()`を通します。予約domain（`example.test`等）以外のemail、network test PAN以外のcard番号、電話番号形式を拒否します。
4. 失敗時に残すartifact（manifestとsample data）は、`labs/security`のsecret scannerと`assertSynthetic()`で検査します。

## 実行

```bash
nix develop .#generative --command make test-test-data
```

## Passしても保証しないこと

- `assertSynthetic()`はpatternで検出します。氏名や住所のように形式を持たない個人情報は、factoryがsynthetic値だけを使うこととreviewで守ります。
- SQLite WALでの並列書込みは、実DBのisolation levelやconnection poolの挙動を代表しません（`labs/python/postgres_tests`が担当）。
- pseudonym化はsalt管理が前提です。saltをtest artifactへ残さないでください。
