# 公式情報源と確認日

確認日: 2026-07-12

可能な限り公式documentation、official repository、project siteを参照しています。versionは教材生成時点のものであり、実行前にlockfileとrelease noteを再確認してください。

## 思想

- Martin Fowler, Mocks Aren't Stubs: https://martinfowler.com/articles/mocksArentStubs.html
- Growing Object-Oriented Software, Guided by Tests（London schoolの代表的文献）: http://www.growing-object-oriented-software.com/
- Test Double wiki（Detroit/Londonの整理）: https://github.com/testdouble/contributing-tests/wiki/Test-Double

## JavaScript／TypeScript

- Node.js v26 test runner: https://nodejs.org/api/test.html
- Mocha docs: https://mochajs.org/
- Mocha parallel mode: https://mochajs.org/#parallel-tests
- AVA: https://avajs.dev/
- Playwright Test: https://playwright.dev/docs/test-intro
- TestCafe architecture: https://testcafe.io/documentation/402631/guides/overview/why-testcafe

確認したnpm version: Node docs 26.5.0、Mocha 11.7.6、AVA 8.0.1、Sinon 22.0.0、TypeScript 7.0.2（2026-07-12 registry）。

## Python

- pytest stable docs: https://docs.pytest.org/en/stable/
- fixtures: https://docs.pytest.org/en/stable/explanation/fixtures.html
- parametrization: https://docs.pytest.org/en/stable/how-to/parametrize.html

## JVM

- JUnit: https://junit.org/
- JUnit 6.1.1 overview: https://docs.junit.org/6.1.1/overview.html
- JUnit 6.1.1 release notes: https://docs.junit.org/6.1.1/release-notes.html
- Truth: https://truth.dev/

JUnit 6.1.1は2026-06-28公開。JUnit 6はJava 17以上、Kotlin 2.1以上を要求します。

## .NET

- Testing in .NET: https://learn.microsoft.com/dotnet/core/testing/
- MTP overview: https://learn.microsoft.com/dotnet/core/testing/microsoft-testing-platform-intro
- MSTest overview: https://learn.microsoft.com/dotnet/core/testing/unit-testing-mstest-intro
- NUnit docs: https://docs.nunit.org/
- NUnit framework release notes: https://docs.nunit.org/articles/nunit/release-notes/framework.html

NUnit 4.6.0は2026-05-04公開。MTP資料は2026-04-27更新。

## C++

- Catch2 docs: https://catch2-temp.readthedocs.io/
- test cases and SECTION: https://catch2-temp.readthedocs.io/en/latest/test-cases-and-sections.html
- generators: https://catch2-temp.readthedocs.io/en/latest/generators.html
- CMake integration: https://github.com/catchorg/Catch2/blob/devel/docs/cmake-integration.md

## Go

- package testing: https://pkg.go.dev/testing
- testing tutorial: https://go.dev/doc/tutorial/add-a-test
- fuzzing tutorial: https://go.dev/doc/tutorial/fuzz

## Rust

- Rust Book, testing: https://doc.rust-lang.org/book/ch11-00-testing.html
- test execution: https://doc.rust-lang.org/book/ch11-02-running-tests.html
- test organization: https://doc.rust-lang.org/book/ch11-03-test-organization.html
- Rust rstest crate: https://crates.io/crates/rstest

## PHP

- PHPUnit 13 announcement: https://phpunit.de/announcements/phpunit-13.html
- supported versions: https://phpunit.de/supported-versions.html
- Infection guide: https://infection.github.io/guide/

PHPUnit 13は2026-02-06公開、PHP 8.4以上。PHPUnit 13.2は2026-06-05公開。InfectionはPHP 8.3以上。

## Contract／specialized

- Pact introduction: https://docs.pact.io/
- How Pact works: https://docs.pact.io/getting_started/how_pact_works
- Pact consumer tests: https://docs.pact.io/consumer
- Airtest docs: https://airtest.doc.io.netease.com/en/
- EarlGrey repository: https://github.com/google/EarlGrey
- mountebank docs: https://www.mbtest.org/docs/gettingStarted

## Nix

- Nix manual: https://nix.dev/manual/nix/latest/
- `nix develop`: https://nix.dev/manual/nix/latest/command-ref/new-cli/nix3-develop
- flakes: https://nix.dev/concepts/flakes.html

## Integration／UI／mobile

- Testcontainers: https://java.testcontainers.org/
- Storybook testing: https://storybook.js.org/docs/writing-tests
- Storybook Vitest addon: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
- Schemathesis: https://schemathesis.readthedocs.io/
- Appium 3 architecture: https://appium.io/docs/en/3.5/intro/appium/
- Testing Library guiding principles: https://testing-library.com/docs/guiding-principles
- Playwright best practices: https://playwright.dev/docs/best-practices

## 研究論文

論文の分類、DOI、peer-reviewed／preprintの区別、実務への含意は [13-research-and-modern-practice.md](13-research-and-modern-practice.md) にまとめています。
