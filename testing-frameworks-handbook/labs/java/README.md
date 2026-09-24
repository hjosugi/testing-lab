# Java: JUnit 6, Mockito, Truth

```bash
gradle dependencies --no-daemon
gradle test --no-daemon
```

JUnit Platform/Jupiter、Mockito、Truthは別の責務を持ちます。JUnit 6.1.1、Mockito 5.23.0、Truth 1.4.5を`gradle.lockfile`でtransitive dependencyまで固定しています。

- parameterized、dynamic、custom extensionの実行例
- Truth custom `OrderSubject`
- Jupiter engine必須 / Vintage engine禁止gate
- Mockito explicit agentをJDK 21 / 25で検証するmatrix
- Kotlin `runTest`、virtual time、dispatcher injectionとの差分

実装と判断基準は[`JVM-LAB.md`](JVM-LAB.md)を参照してください。

## Passしても保証しないこと

- Mockito mockはcollaboratorのprotocolだけを確認し、実payment/repositoryとの互換性は示しません（contract testの担当）。
- JDK 21/25以外のruntimeやVintage engineでの挙動は保証しません。
- PIT laneは`handbook.checkout`のproduction classだけをmutateします。
