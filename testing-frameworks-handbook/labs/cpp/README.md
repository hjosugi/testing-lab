# C++20: Catch2 3、sanitizer、benchmark、CTest

Checkout componentをCatch2 3で検証し、C++固有のundefined behavior、lifetime、data race、compile cost、microbenchmark noise、CTest orchestrationを別々のoracleとして扱うlabです。

## Quick start

```bash
nix develop .#cpp

cmake --fresh \
  -S labs/cpp \
  -B labs/cpp/build \
  -G Ninja \
  -DCMAKE_CXX_COMPILER=clang++
cmake --build labs/cpp/build
ctest --test-dir labs/cpp/build --output-on-failure --no-tests=error

cd labs/cpp
./scripts/verify-ctest-orchestration.sh
./scripts/measure-benchmark-noise.sh
./scripts/compare-compile-time.sh
./scripts/run-sanitizer.sh address
./scripts/run-sanitizer.sh undefined
./scripts/run-sanitizer.sh thread
```

Nix shellはClang 21.1.8、CMake/CTest 4.1.2、Catch2 3.15.0、Trompeloeil 49を供給します。CMake fallbackもCatch2 v3.15.0とTrompeloeil v49の40桁commitへ固定しています。

## SECTIONとGENERATE

| Test | Mechanism | Paths / oracle |
|---|---|---|
| Classical checkout | `GENERATE(1, 2, 3)` | quantityごとにresultとsaved orderを検証 |
| Fresh setup | `GENERATE(1, 2)` × 2 `SECTION`s | 4 pathsでtest bodyを再実行し、section-local stateが0から始まることを検証 |
| London protocol | handwritten spies | captured amountとsaved orderを検証 |

Catch2のgeneratorは暗黙のsectionとして振る舞います。共有mutable fixtureを1回だけ初期化する前提を置かず、各pathでsetupが再実行されても成立するtestにします。

## Sanitizer matrix

`run-sanitizer.sh`は各instrumented buildで通常の3 CTest casesをgreenにした後、意図的なdefect fixtureがnon-zeroになることとdiagnosticを検査します。

| Lane | Compile/link option | Expected fixture | Verified diagnostic | Exit |
|---|---|---|---|---:|
| ASan | `-fsanitize=address` | heap lifetime終了後のread | `heap-use-after-free` | 1 |
| UBSan | `-fsanitize=undefined` + `-fsanitize=signed-integer-overflow` | `INT_MAX + 1` | `signed integer overflow` | 1 |
| TSan | `-fsanitize=thread` | unsynchronized global write | `data race` | 66 |

fixtureを通常CTestへ「失敗すべきtest」として登録しません。sanitizer crashは通常のassertion failureと異なり、CTestの`WILL_FAIL`だけではportableに反転できないためです。wrapperがexitとdiagnosticの両方をoracleにし、raw reportは`build/sanitizers/`へ残します。

GitHub Actionsは`address`、`undefined`、`thread`を独立matrix jobとして実行します。1つのcombined binaryにせず、どのruntime oracleが失敗したかをjob境界で局所化します。

## Benchmarkとnoise

`[!benchmark][benchmark]` testは通常CTest discoveryから隠し、明示した時だけ100 itemsのsubtotal aggregationを測定します。戻り値を使って最適化による消去を避け、測定外でも`31,250`のcorrectness oracleを実行します。

```bash
./scripts/measure-benchmark-noise.sh
```

同じlocal runで20 samples × 1,000 bootstrap resamplesを3回実行したmeanは`68.2247 ns`、`65.4144 ns`、`131.792 ns`でした。コードが同じでも約2.01倍の幅があり、scheduler、CPU frequency、cache、同居processの影響がmicrobenchmarkへ現れています。

この値はinformational artifactです。CIではtest成功、benchmark blockの実行、mean/stddev reportの存在だけをgateにし、絶対時間やrun間ratioを合否にしません。性能判断にはisolated runner、warm-up、sample設計、複数trial、環境metadata、regression budgetが別途必要です。

## Handwritten spyとmock frameworkのcompile cost

`handwritten_spy_probe.cpp`と`mock_framework_probe.cpp`は同じpayment/repository protocolを検証します。後者だけがheader-only Trompeloeilのtemplate/macroを使います。

`compare-compile-time.sh`は各targetを3回clean buildし、`cmake -E time`のmedianを記録します。今回のlocal resultは次の通りでした。

| Probe | Clean build median | Relative |
|---|---:|---:|
| Handwritten spy | 1.05782s | 1.00x |
| Trompeloeil mock | 2.69518s | 2.55x |

これはtoolchainとmachineに依存するcharacterizationであり固定gateではありません。小さいowned portでは手書きspyがcompile time、error surface、dependency costを抑えます。一方、複雑なcardinality/matcherが必要ならmock frameworkの表現力がcostを上回る可能性があります。

## CTest shardingとrandom order

`verify-ctest-orchestration.sh`は次を自動検証します。

1. `ctest -N`でdiscovered exact namesを取得し、最低3 testsを要求
2. test namesを交互に2 fileへ分割
3. `--tests-from-file`と`--no-tests=error`で両shardを実行
4. 各shardのJUnit XMLを生成
5. `--schedule-random --schedule-random-seed 20260719`を2回実行
6. full setの実行数と、同じseedで同じ順序になることを確認

固定seedの順序は`build/ctest-orchestration/*.order`へ保存します。同じgenerated buildでは再現しますが、test集合やdiscovery順が変われば同じseedでも並びは変わるため、failure時はseedとorder artifactを組で保存します。shardはcoverageの代替ではなく、exact test集合を分割してwall timeを短縮するorchestrationです。

## Primary references

- [Catch2 test cases and sections](https://catch2-temp.readthedocs.io/en/latest/test-cases-and-sections.html)
- [Catch2 data generators](https://catch2-temp.readthedocs.io/en/latest/generators.html)
- [Catch2 benchmarks](https://catch2-temp.readthedocs.io/en/latest/benchmarks.html)
- [CTest command line](https://cmake.org/cmake/help/latest/manual/ctest.1.html)
- [Clang AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
- [Clang UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [Clang ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html)

## Passしても保証しないこと

- sanitizer laneは実行されたpathの未定義動作だけを検出します。未実行pathのUB不在は示しません。
- benchmarkはnoise測定と最適化消去の確認で、性能退行のgateではありません。
- `int`加算のoverflowは通常buildではcheckせず、UBSan laneで検出します。通貨精度や巨大cartは対象外です。
