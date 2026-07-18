# JUnit 6 Platform / Jupiter / Mockito / Truth lab

このlabは、JUnitを1つのlibraryとして扱わず、実行基盤、engine、programming model、assertion、mockの責務を分けて実行します。

## 5つの責務

| Component | このlabでの責務 | Artifact |
|---|---|---|
| JUnit Platform | test planをdiscover/launchし、GradleやIDEとengineを接続 | `junit-platform-launcher` |
| TestEngine | Platformがtest frameworkを実行するSPI | `junit-jupiter-engine` |
| JUnit Jupiter | `@Test`、parameterized/dynamic test、extension model | `junit-jupiter-api` / `params` |
| Truth | actualとexpectedを比較し、domain固有failureを表現 | `truth`、`OrderSubject` |
| Mockito | collaborator behaviorとinteractionを置換・観測 | `mockito-core` / `mockito-junit-jupiter` |

`useJUnitPlatform()`はGradleをPlatform launcherへ接続します。test classがJupiter APIで書かれていても、対応するengineがruntime classpathになければ実行されません。TruthとMockitoはengineではありません。

`build.gradle.kts`はJUnit BOM 6.1.1でPlatform/Jupiter versionを揃え、`verifyNoVintageEngine`で次をgateします。

- `junit-jupiter-engine:6.1.1`がruntimeにある
- `junit-vintage-engine`がruntimeにない

Truthのtransitive dependencyとしてJUnit 4 API jarが存在しますが、Vintage engineを追加していないためJUnit 4 testをdiscover/executeしません。新規testはすべてJupiter APIで書きます。

## parameterized / dynamic / extension

### Parameterized test

[`ClassicalCheckoutTest`](src/test/java/handbook/checkout/ClassicalCheckoutTest.java)は、事前に定義したcart caseを`@ParameterizedTest` + `@MethodSource`へ渡します。

選ぶ状況:

- 同じtest lifecycleとoracleへdataだけを追加する
- case数と入力をdiscovery時に明示したい
- IDE/reportで各argument invocationを追いたい

### Dynamic test

[`DynamicCartValidationTest`](src/test/java/handbook/checkout/DynamicCartValidationTest.java)は、runtimeの`Stream`から5個の`DynamicTest`を生成します。

選ぶ状況:

- file/schema/scenario graphなどruntime sourceからtest nodeを作る
- dynamic containerを含む可変階層を表現する
- factoryが生成するcase名とexecutableを制御する

注意: `@BeforeEach` / `@AfterEach`とextension callbackは`@TestFactory`に対して実行され、factoryが生成した個々のdynamic nodeごとには実行されません。このlabのdynamic nodeはshared mutable stateへ依存しません。

### Extension

[`CheckoutFixtureExtension`](src/test/java/handbook/checkout/CheckoutFixtureExtension.java)はJupiter `ParameterResolver`として、fresh fakeを持つcheckout componentをtest methodへ注入します。[`CheckoutExtensionTest`](src/test/java/handbook/checkout/CheckoutExtensionTest.java)で2回のparameter resolutionがstateを共有しないことを確認します。

選ぶ状況:

- lifecycle、parameter injection、conditional executionなど複数testに共通するprotocol
- library/framework integrationをannotationやparameterへ閉じ込める

単なるobject生成をすべてextensionへ移すとdata flowが見えなくなります。local fixtureで十分ならplain Javaを選びます。`MockitoExtension`も同じJupiter extension modelの利用例です。

## Truth custom Subject

[`OrderSubject`](src/test/java/handbook/checkout/OrderSubject.java)は`Order`のdomain語彙をassertionへ持ち込みます。

```java
OrderSubject.assertThat(result).hasTotal(1200);
OrderSubject.assertThat(result).isConfirmed();
OrderSubject.assertThat(result).hasPaymentId("pay-1");
```

`check("total()")`を使うため、failureはgeneric record比較ではなく`order.total()`のexpected/actualを示します。[`OrderSubjectTest`](src/test/java/handbook/checkout/OrderSubjectTest.java)は意図的な不一致を`assertThrows`で捕捉し、property名と両方の値がdiagnosticに含まれることを確認します。

custom Subjectを使う基準:

- domain objectに複数testで繰り返す意味のあるassertionがある
- failure messageにdomain pathや単位を出したい
- irrelevant fieldを無視しながら重要なinvariantを明示したい

1 testだけの単純なprimitive比較ならbuilt-in Truth Subjectのままにします。

## Mockito agentとJDK matrix

Mockito 5のdefault inline mock makerはclass instrumentationを使います。agentを指定しないbaselineでは、JVMへdynamic self-attachしようとします。JDKはdynamic agent loadingを将来default禁止にする方向のため、test taskはMockito core jarを明示的に渡します。

```text
-javaagent:/.../mockito-core-5.23.0.jar
```

[`MockitoAgentTest`](src/test/java/handbook/checkout/MockitoAgentTest.java)はfinalな`Order` recordをmockし、inline mock makerが実際に動くことを確認します。

2026-07-19 JST、flakeがpinするNix JDKで[`verify-mockito-agent-matrix.sh`](scripts/verify-mockito-agent-matrix.sh)を実行した結果:

| Test runtime | Explicit agent | `-PmockitoAgent=off` baseline |
|---|---|---|
| OpenJDK 21.0.12 | PASS、self-attachなし | exit 0、self-attach warning |
| OpenJDK 25.0.4 | PASS、self-attachなし | exit 0、self-attach warning |

現在は両baselineもpassしますが、warningを「問題なし」と扱いません。normal `gradle test`は常にexplicit agentを使います。matrix scriptはGradle daemon/compilerをJDK 21に固定したまま、test workerだけを指定JDKへ切り替えるため、同じclass fileとdependencyでruntime差を比較します。

## Kotlin coroutine testとの違い

このrepositoryの実行labはJavaだけで、Kotlin pluginや`kotlinx-coroutines-test`をdependencyへ追加していません。Kotlin production codeへ移植するときは、Jupiterが提供するのはtest lifecycleまでで、coroutine schedulingは`kotlinx-coroutines-test`が担当します。

```kotlin
@Test
fun confirmsOrder() = runTest {
    val result = service.checkout()
    assertThat(result.status).isEqualTo(CONFIRMED)
}
```

| Java/Jupiter async boundary | Kotlin coroutine test |
|---|---|
| synchronous method、`CompletionStage`は明示的にjoin/await | suspend functionを`runTest`の`TestScope`で呼ぶ |
| wall clock/executorをDIして制御 | `TestCoroutineScheduler`がvirtual timeを制御し、`delay`をskip |
| parallel thread behaviorはreal executor次第 | default `runTest`はsingle threadで、child coroutineは自動parallelではない |
| uncaught async workはtest外へescapeし得る | child coroutine exceptionをscope終了時に再throw |
| global UI dispatcherなし | `Dispatchers.setMain`を使う場合は`resetMain`を必ず対にする |

重要な判断:

1. `runBlocking`で待つだけではvirtual time、timeout、child exception管理が不足するため、testは`runTest`を使う。
2. `StandardTestDispatcher`はqueued taskを自動実行しない。`join`、`yield`、`runCurrent`、`advanceUntilIdle`をscenarioに合わせて使う。
3. production dispatcherをconstructor injectionし、`Dispatchers.Default`へhard-codeしない。test scheduler外のdispatcherで実行したreal `delay`はskipされない。
4. Kotlin Multiplatform / JS互換testでは`runTest`の`TestResult`をtest methodから直ちにreturnする。
5. virtual single-thread schedulingのtestはreal parallelismを証明しない。race/concurrencyは別のintegration/stress testで扱う。

## Commands

```bash
# JUnit 6.1.1、13 tests、Jupiter present / Vintage absent
gradle test --no-daemon

# locked dependency graph
gradle dependencies --no-daemon

# NixでpinしたJDK 21 / 25のMockito agent matrix
nix develop --command ./labs/java/scripts/verify-mockito-agent-matrix.sh

# 既知のJDK homeだけを指定することも可能
./scripts/verify-mockito-agent-matrix.sh /path/to/jdk21 /path/to/jdk25
```

## Primary references

- [JUnit 6.1.1 API overview: Platform, Jupiter, Vintage](https://docs.junit.org/6.1.1/api/)
- [JUnit 6.1.1 build support and TestEngine configuration](https://docs.junit.org/6.1.1/running-tests/build-support)
- [JUnit 6.1.1 dynamic tests](https://docs.junit.org/6.1.1/writing-tests/dynamic-tests.html)
- [JUnit 6.1.1 extension model](https://docs.junit.org/6.1.1/extensions/overview.html)
- [Truth custom Subjects](https://truth.dev/extension.html)
- [Mockito 5.23 agent setup](https://javadoc.io/doc/org.mockito/mockito-core/5.23.0/org.mockito/org/mockito/Mockito.html#0.3)
- [OpenJDK JEP 451: Prepare to Disallow the Dynamic Loading of Agents](https://openjdk.org/jeps/451)
- [`kotlinx-coroutines-test` 1.11.0](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-test/)
