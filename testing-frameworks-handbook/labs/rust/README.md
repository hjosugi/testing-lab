# Rust: cargo test、rstest、proptest、cargo-mutants

Checkout crateを使い、Rustのmodule visibility、ownership、trait boundsをtest境界へ反映するlabです。標準`cargo test`をrunnerに保ち、fixture/caseだけrstest、生成入力とshrinkingだけproptest、oracle qualityだけcargo-mutantsで補います。

## Quick start

```bash
nix develop .#rust

make test-rust
make test-rust-boundaries
make test-rust-quality
make test-rust-mutation
```

Nix lockはRust 1.96.1、Cargo 1.96.2、cargo-mutants 27.1.0を供給します。crateはedition 2024、MSRV 1.85で、rstest 0.26.1とproptest 1.11.0を`Cargo.lock`へ固定しています。

## Unit、integration、doc testの境界

```bash
./scripts/verify-test-boundaries.sh
```

| Suite | Location / command | 見えるもの | このlabの責務 |
|---|---|---|---|
| private unit | `src/lib.rs` / `cargo test --lib` | parent moduleのprivate item | `checked_subtotal`のzero guardとwidening |
| public integration | `tests/checkout.rs` / `cargo test --test checkout` | crateの`pub` APIだけ | checkout behavior、public error、overflow |
| property | `tests/properties.rs` / `cargo test --test properties` | crateの`pub` APIだけ | 256 generated cartsのreference一致と順序不変 |
| trait bounds | `tests/trait_bounds.rs` / `cargo test --test trait_bounds` | public traitsとconcrete double | `Arc<Mutex<_>>` doubleの`Send + Sync`とthread ownership |
| doc / compile-fail | crate docs / `cargo test --doc` | userがcopyするpublic example | public usageと`Rc<RefCell<_>>`が`Send`でない契約 |

private helperの都合をintegration testへ公開しません。逆に公開behaviorを`#[cfg(test)]` unitだけで守るとcrate外のvisibility、type inference、documentation usageを確認できないため、`tests/`とdoctestを残します。

## rstest fixtureとcase

`tests/checkout.rs`は次を分けます。

- `#[case]`: cart inputとexpected totalのdata matrix
- `#[fixture]`: caseごとにfreshなpayment spyとmemory repositoryを注入
- test body: public `checkout`のresultとobservable interactionだけを判定

fixtureは各test invocationで再生成されます。parallel defaultのCargo testでmutable doubleを共有しないため、`#[once]` fixtureは使いません。単純な1件だけなら標準`#[test]`の方が展開後のdebug surfaceは小さく、rstestは重複を実際に減らす場所だけに限定します。

## ProptestとQuickCheckの選択

`total_matches_reference_and_is_order_independent`はquantity/unit priceを明示rangeから生成し、単純なreference sumとの一致とreverse後の不変性を256 casesで検証します。

| 観点 | proptest | QuickCheck |
|---|---|---|
| 生成model | valueごとの`Strategy` | typeごとの`Arbitrary`が中心 |
| constraint | range、collection size、compositionを局所記述 | custom wrapper/typeで表現しやすい |
| shrinking | strategy構造に沿って縮小 | `Arbitrary::shrink`中心 |
| このlab | valid non-empty cartを直接生成できる | domain wrapperを追加するまでinvalid inputが増える |

Checkoutは「quantityは1以上」「cartは1〜32 items」というvalue-level constraintを持つためproptestを採用しました。example testはknown edgeとprotocol、property testは広い組合せを担当し、置き換えではなく補完関係です。failure時はminimal counterexampleとseedを保存して再現します。

## High-risk total pathのmutation gate

```bash
./scripts/run-mutation.sh
```

全crateを無差別にmutateせず、money calculationの`checked_subtotal`と`total`だけをfilterします。cargo-mutants 27.1.0が生成した対象は次の7件です。

- function resultを`Ok(0)` / `Ok(1)`へ置換
- zero guardの`==`を`!=`へ置換
- multiplicationをaddition / divisionへ置換
- public `total` resultを`Ok(0)` / `Ok(1)`へ置換

今回のlocal runは7/7 caughtです。scriptはcargo-mutantsのexit codeに加え、`outcomes.json`で「7 tested、7 caught」を検査します。結果とdiffはignored `build/mutation/mutants.out/`へ残ります。対象数を固定することで、filterが誤って0件になったgreenも防ぎます。

## Trait double、ownership、`Send` / `Sync`

production traitへ一律に`Send + Sync`を要求せず、実際のexecution boundaryで具体型へ必要なboundを課します。

| Double / API形 | Ownership | `Send` / `Sync` | Trade-off |
|---|---|---|---|
| `&mut P`, `&mut R` + `Vec` | callerがexclusive borrow | trait自体は不要 | 最小で高速、同時共有をcompile時に禁止 |
| `Rc<RefCell<Vec<_>>>` | single-thread shared ownership | どちらも不可 | local fakeは簡単、threadへmoveできない |
| `Arc<Mutex<Vec<_>>>` | atomic shared ownership | concrete typeは両方満たす | threadへmove/clone可能、lock/poison/error処理が増える |

crateのcompile-fail doctestは`Rc<RefCell<_>>` payment doubleを`Send`要求へ渡してcompileできないことを確認します。`tests/trait_bounds.rs`は`Arc<Mutex<_>>` doublesへ`Send + Sync`をcompile-time assertionし、worker threadへownershipをmoveしてcheckoutを実行します。

`checkout`はgeneric `&mut` collaboratorを受けるため、single-thread unit testに不要なthread boundや`'static`を押し付けません。thread spawn、async executor、shared server stateへ境界が移る時だけ、adapter/concrete type側でboundとsynchronization costを引き受けます。

## Quality and lock discipline

```bash
cargo fetch --locked
cargo fmt --all --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
```

CIは`Cargo.lock`以外のresolutionを許可せず、Nix側でrustc/Cargo/rustfmt/Clippy/cargo-mutantsを同じrevisionへ固定します。

## Primary references

- [Rust Book: Writing Automated Tests](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Cargo tests](https://doc.rust-lang.org/cargo/commands/cargo-test.html)
- [rustdoc doctests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)
- [rstest 0.26.1](https://docs.rs/rstest/0.26.1/rstest/)
- [Proptest book](https://proptest-rs.github.io/proptest/)
- [cargo-mutants guide](https://mutants.rs/)
