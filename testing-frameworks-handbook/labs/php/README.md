# PHP 8.4: PHPUnit 13.2とInfection

Checkout componentを使い、PHPUnit major upgradeとmutation testingを同じ
oracleで検証するlabです。Nix shellはPHP 8.4.23、PCOV 1.0.12、
Composer 2.10.2、公式PHPUnit 12.5.31 PHARを供給し、`composer.lock`は
PHPUnit 13.2.4とInfection 0.34.0をtransitive dependencyまで固定します。

## Quick start

```bash
nix develop .#php

make test-php
make test-php-migration
make test-php-mutation
make test-php-equivalent
```

PHP lab内からは同じgateをComposer scriptで実行できます。

```bash
composer test
composer migration
composer mutation
composer mutation:equivalent
```

## PHPUnit 12.5から13.2への移行

PHPUnit 13はPHP 8.4以上を要求します。公式の移行順序に合わせ、
PHPUnit 12.5.31でdeprecationを0件にしてから13.2.4へ進みます。

`scripts/verify-phpunit-migration.sh`は同じ`phpunit.xml`と10-test suiteを
次の順で実行します。

1. SHA-256 pinした公式PHPUnit 12.5.31 PHAR
2. `composer.lock`で固定したPHPUnit 13.2.4

両方に`--display-all-issues --fail-on-all-issues`を指定するため、test
failureだけでなくPHPUnit deprecation、PHP deprecation、warning、risky、
notice、skipped、incompleteもmigration gateを失敗させます。bootstrapは
product classを直接読み込み、12.5 PHARへComposer側のPHPUnit 13 classが
混ざらないようにしています。

現在の結果は両versionとも10 tests、28 assertions、issue 0です。

## ClassicalとLondonのoracle

`tests/CheckoutTest.php`は次を分離します。

- data provider: cart計算、order state、payment token、repository state
- PHPUnit MockObject: capture/save protocolとempty cart時のno-call
- validation boundary: zero/negative quantity、negative/zero unit price

fakeは観測可能なstateを残し、mockは重要なmessageだけを検証します。
framework APIの使用量を増やすことではなく、production behaviorの退行を
明確なfailureへ変換することが目的です。

## High-risk mutation gate

```bash
./scripts/run-mutation.sh
```

PCOVでcoverageを取得し、`src/Checkout.php`だけをInfectionのdefault
mutatorへ渡します。scriptはCLI thresholdに加え、machine-readable summaryを
検査します。

| Metric | Gate |
|---|---:|
| generated / killed | 14 / 14 |
| Mutation Code Coverage | 100% |
| MSI | 100% |
| Covered Code MSI | 100% |
| escaped / uncovered | 0 / 0 |

最初の3-test suiteでは13 covered mutants中4件がescapeし、covered MSIは
69.23%でした。zero quantity、zero price、logical branch、empty-cart throwの
各behaviorへassertionを追加した結果、現行sourceの14 mutantsを全てkill
しています。分類とassertionの対応は
[`MUTATION_CLASSIFICATION.md`](MUTATION_CLASSIFICATION.md)に記録します。

## Equivalent mutantをtestで無理にkillしない

```bash
./scripts/verify-equivalent-mutant.sh
```

`mutation-fixtures/BooleanIdentity.php`の`CastBool`は、bool型parameterに対する
castを外すだけなので、`true`と`false`のどちらでも意味が変わりません。
probeは1 covered / 1 escapedを要求し、E-001としてsemantic proofで分類します。

equivalent mutantへ意味のないassertionを追加したり、production behaviorを
歪めたりしません。また、checkoutのthresholdからはfixtureを分離し、広い
ignore設定でreal escaped mutantを隠さないようにします。

## Reproducibility

- PHP/PCOV/Composer/PHPUnit 12 PHARは`flake.lock`のnixpkgsとPHAR hashで固定
- PHPUnit 13/Infectionは`composer.lock`から`composer install`
- Composer自身もPCOV付きPHPでbuildし、Composer scriptのchild processへ
  同じcoverage extensionを引き継ぐ
- mutation reportはignored `labs/php/build/infection/`へ出力
- strict repository suiteは通常test、migration、high-risk mutation、
  equivalent classificationをすべて実行

## Primary references

- [PHPUnit 13 announcement](https://phpunit.de/announcements/phpunit-13.html)
- [PHPUnit 13.2 announcement](https://phpunit.de/announcements/phpunit-13.2.html)
- [PHPUnit 12.5 manual](https://docs.phpunit.de/en/12.5/)
- [PHPUnit supported versions](https://phpunit.de/supported-versions.html)
- [Infection guide and metrics](https://infection.github.io/guide/)
- [Infection CLI options](https://infection.github.io/guide/command-line-options.html)

## Passしても保証しないこと

- Infectionのhigh-risk laneは`src/Checkout.php`だけが対象です。MSI 100%は他fileのassertion強度を示しません。
- PHPUnit 12.5→13のmigration確認は現在のtest APIの範囲で、未使用APIのdeprecationは検出しません。
- equivalent mutant E-001の分類はfixtureの型制約に依存します。
