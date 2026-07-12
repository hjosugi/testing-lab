# 言語ごとのテスト設計の違い

同じテスト思想でも、type system、module system、runtime、concurrency modelによって自然な設計は変わります。

## 比較表

| 言語 | seamの作り方 | fixture文化 | concurrency | mockの特徴 | 固有の注意 |
|---|---|---|---|---|---|
| Python | duck typing、monkeypatch、callable注入 | pytest fixture DI | process/thread/async plugin | patchが容易すぎる | definition siteではなくlookup siteをpatch |
| JS/TS | module export、object、function注入 | hooks／module fixture | file/process/thread並列 | module mockとfake timer | ESM/CJS境界、unawaited promise |
| Java/Kotlin | interface、constructor DI、package | annotation/extension | JUnit parallel opt-in/config | proxy/bytecode mock | final/static mockよりdesign seamを優先 |
| C# | interface、delegate、DI | attribute/fixture | runner設定に依存 | expression/virtual/interface | frameworkとplatform/adapterを分離 |
| C++ | template、interface、link seam | RAII、SECTION | runner/CTest設定 | macro/frameworkまたは手書きfake | UB、lifetime、compile time、ABI |
| Go | small consumer-owned interface、function value | table-driven local setup | `t.Parallel`明示 | codegenよりhandwritten spyが自然 | shared loop variable、goroutine leak |
| Rust | trait、generic、feature、module visibility | builder/helper、rstest | testはthread並列default | ownershipを満たすfake/trait mock | unit testはprivateへアクセス可、integrationはcrate外視点 |
| PHP | interface、callable、service container | PHPUnit lifecycle/data provider | process並列tool | PHPUnit MockObject | dynamic性とruntime version互換 |

## Python

pytest fixtureは名前によるdependency injectionです。再利用性は高い一方、`conftest.py`、autouse、fixture-of-fixtureを深くすると前提が見えません。fixtureは「データ」よりresource lifecycleに使い、simple valueはtest内builderを優先します。

`patch("module.name")` は定義元ではなく、subjectがlookupする名前をpatchします。間違ったpatchでもtestがgreenになることがあるため、可能ならconstructor/function injectionを使います。

## JavaScript／TypeScript

Mochaはserial default、AVAはtest file isolation/concurrency、Node runnerはtoolchain統合が中心です。framework選択がexecution semanticsに直結します。

ESM bindingはread-onlyであり、CJSのobject property patchと同じ感覚でmockできません。module mockよりdependencyを引数として渡す設計がportableです。async testはPromiseをreturn/awaitし、timerとmicrotask queueを区別します。

## Java／Kotlin

JUnit 6はPlatform、Jupiter、Vintageに分かれます。runnerとprogramming modelの分離により、IDE、Gradle、独自engineが同じPlatformに統合できます。extensionは強力ですが、global extensionやmeta-annotationで前提を隠しすぎないようにします。

Mockitoはinteraction test、Truthはassertionの診断を担い、JUnit自体とは別です。Kotlinではnullability、data class、final class、coroutine test schedulerが追加の設計軸です。

## C#

NUnit／MSTest／xUnit.netはprogramming model、MTP／VSTestはtest platformです。2026年の新規projectでは、MTPを使うかを明示的に判断します。NUnit constraint modelは `Assert.That(actual, Is.EqualTo(expected))` のようにfailure descriptionを構造化します。

## C++

RAIIがsetup/teardownの基本です。Catch2 SECTIONは1つのsetupから異なるpathを再実行します。mock frameworkを追加するとcompile timeとtemplate errorが増えるため、小さいportならhandwritten fake/spyも有力です。test binaryのsanitizer実行をunit testと同じくらい重視します。

## Go

標準`testing`とsmall interfaceが中心です。interfaceはprovider側で巨大に定義せず、consumer側で必要最小限に定義するとLondon-style seamが自然になります。table-driven testはcase追加に強い一方、各caseのbusiness meaningが匿名structに埋もれないようnameを付けます。

Go fuzzingはunit test corpusから始め、failure inputをcorpusへ保存できます。goroutineを起動するcodeでは、test終了後のleakとdeadlineを確認します。

## Rust

type systemが多くのinvalid stateを排除しますが、business logicの正しさはtestが必要です。`src`内unit testはprivate itemへアクセスでき、`tests/`はexternal consumerとしてpublic APIだけを見ます。refactor耐性を重視する主なbehavior testは後者が適します。

trait doubleはownership、lifetime、`Send + Sync`制約を満たす必要があります。mockを増やす前にpure domain typeとin-memory adapterでstate testできないかを確認します。

## PHP

PHPUnit majorはPHP runtime要件と連動します。2026年のPHPUnit 13はPHP 8.4以上、PHP 8.3なら12系です。attribute/data providerでcaseを表現し、MockObjectはexternal collaboratorへ限定します。Infectionでescaped mutantを調べると、assertion不足をcoverageより直接発見できます。

