# 公式情報源と確認日

確認日: 2026-07-19

可能な限り公式documentation、official repository、project siteを参照しています。versionは教材生成時点のものであり、実行前にlockfileとrelease noteを再確認してください。

## 思想

- Martin Fowler, Mocks Aren't Stubs: https://martinfowler.com/articles/mocksArentStubs.html
- Growing Object-Oriented Software, Guided by Tests（London schoolの代表的文献）: http://www.growing-object-oriented-software.com/
- Test Double wiki（Detroit/Londonの整理）: https://github.com/testdouble/contributing-tests/wiki/Test-Double

## JavaScript／TypeScript

- Node.js v26 test runner: https://nodejs.org/api/test.html
- Node.js HTTP: https://nodejs.org/api/http.html
- Node.js AbortController / AbortSignal: https://nodejs.org/api/globals.html#class-abortcontroller
- Mocha docs: https://mochajs.org/
- Mocha parallel mode: https://mochajs.org/#parallel-tests
- AVA: https://avajs.dev/
- fast-check core blocks: https://fast-check.dev/docs/core-blocks/
- fast-check arbitraries/shrinking: https://fast-check.dev/docs/core-blocks/arbitraries/
- fast-check configuration: https://fast-check.dev/docs/configuration/
- Playwright Test: https://playwright.dev/docs/test-intro
- Vitest browser mode: https://vitest.dev/guide/browser/
- TestCafe architecture: https://testcafe.io/documentation/402631/guides/overview/why-testcafe

確認したnpm version: Node docs 26.5.0、fast-check 4.9.0、Mocha 11.7.6、AVA 8.0.1、Sinon 22.0.0、TypeScript 7.0.2（2026-07-19 registry）。

## Python

- pytest stable docs: https://docs.pytest.org/en/stable/
- fixtures: https://docs.pytest.org/en/stable/explanation/fixtures.html
- parametrization: https://docs.pytest.org/en/stable/how-to/parametrize.html
- Psycopg 3 docs: https://www.psycopg.org/psycopg3/docs/
- Psycopg package: https://pypi.org/project/psycopg/
- Testcontainers Python: https://testcontainers-python.readthedocs.io/
- Testcontainers Python package: https://pypi.org/project/testcontainers/

確認したPython integration version: Psycopg 3.3.4、Testcontainers 4.14.2（2026-07-19 PyPI）。

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
- coverage-guided fuzzing and corpus: https://go.dev/doc/security/fuzz/

## Rust

- Rust Book, testing: https://doc.rust-lang.org/book/ch11-00-testing.html
- test execution: https://doc.rust-lang.org/book/ch11-02-running-tests.html
- test organization: https://doc.rust-lang.org/book/ch11-03-test-organization.html
- Rust rstest crate: https://docs.rs/rstest/0.26.1/rstest/
- Proptest book: https://proptest-rs.github.io/proptest/
- cargo-mutants guide: https://mutants.rs/

## PHP

- PHPUnit 13 announcement: https://phpunit.de/announcements/phpunit-13.html
- PHPUnit 13.2 announcement: https://phpunit.de/announcements/phpunit-13.2.html
- PHPUnit 12.5 manual: https://docs.phpunit.de/en/12.5/
- supported versions: https://phpunit.de/supported-versions.html
- Infection guide: https://infection.github.io/guide/
- Infection metrics: https://infection.github.io/guide/#Metrics
- Infection command-line options: https://infection.github.io/guide/command-line-options.html

PHPUnit 13は2026-02-06公開、PHP 8.4以上。PHPUnit 13.2は2026-06-05公開。InfectionはPHP 8.3以上。

## Contract／specialized

- RFC 9457, Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457
- Schemathesis CLI: https://schemathesis.readthedocs.io/en/stable/reference/cli/
- Schemathesis checks: https://schemathesis.readthedocs.io/en/stable/reference/checks/
- Schemathesis stateful testing: https://schemathesis.readthedocs.io/en/latest/guides/stateful-testing/
- Schemathesis 4.23.0: https://pypi.org/project/schemathesis/
- Dredd: https://dredd.org/
- Dredd supported description formats: https://dredd.org/en/latest/quickstart.html
- Prism: https://github.com/stoplightio/prism
- Hurl manual: https://hurl.dev/docs/manual.html
- PactumJS API testing: https://pactumjs.github.io/api/requests/spec.html
- PactumJS fuzz testing: https://pactumjs.github.io/guides/fuzz-testing.html
- Karate: https://docs.karatelabs.io/
- Pact introduction: https://docs.pact.io/
- How Pact works: https://docs.pact.io/getting_started/how_pact_works
- Pact consumer tests: https://docs.pact.io/consumer
- Pact JS consumer API: https://docs.pact.io/implementation_guides/javascript/docs/consumer
- Pact JS provider verification: https://github.com/pact-foundation/pact-js/blob/master/docs/provider.md
- Pending pacts and WIP pacts: https://docs.pact.io/pact_broker/advanced_topics/pending_pacts
- `can-i-deploy`: https://docs.pact.io/pact_broker/can_i_deploy
- mountebank docs: https://www.mbtest.org/docs/gettingStarted

## Nix

- Nix manual: https://nix.dev/manual/nix/latest/
- `nix develop`: https://nix.dev/manual/nix/latest/command-ref/new-cli/nix3-develop
- flakes: https://nix.dev/concepts/flakes.html

## Integration／UI／mobile

- Testcontainers: https://java.testcontainers.org/
- Docker Official Image for Postgres: https://hub.docker.com/_/postgres
- PostgreSQL 18.4 release: https://www.postgresql.org/docs/release/18.4/
- Storybook testing: https://storybook.js.org/docs/writing-tests
- Storybook Vitest addon: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
- Storybook interaction testing: https://storybook.js.org/docs/writing-tests/interaction-testing
- Storybook accessibility testing: https://storybook.js.org/docs/writing-tests/accessibility-testing
- Storybook test-runner migration guide: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/migration-guide
- Storybook for Web Components with Vite: https://storybook.js.org/docs/get-started/frameworks/web-components-vite
- Schemathesis: https://schemathesis.readthedocs.io/
- Appium 3 architecture: https://appium.io/docs/en/latest/intro/appium/
- Appium driver ecosystem: https://appium.io/docs/en/latest/ecosystem/drivers/
- Appium CLI: https://appium.io/docs/en/latest/reference/cli/
- Detox architecture and synchronization: https://wix.github.io/Detox/docs/articles/how-detox-works/
- Detox artifact collection: https://wix.github.io/Detox/docs/config/artifacts/
- Detox project/device setup: https://wix.github.io/Detox/docs/introduction/project-setup/
- Apple testing in Xcode: https://developer.apple.com/documentation/xcode/testing
- XCTest result bundles: https://developer.apple.com/documentation/xcode/running-tests-and-interpreting-results
- XCTest activities and attachments: https://developer.apple.com/documentation/xctest/activities-and-attachments
- EarlGrey 2: https://github.com/google/EarlGrey/tree/earlgrey2
- Android Espresso: https://developer.android.com/training/testing/espresso
- Android build-managed devices: https://developer.android.com/studio/test/managed-devices
- Airtest/Poco docs: https://airtest.doc.io.netease.com/en/
- Cavy: https://cavy.app/docs/getting-started/running-tests
- Flutter integration tests: https://docs.flutter.dev/testing/integration-tests
- Firebase Test Lab: https://firebase.google.com/docs/test-lab
- Firebase Test Lab Android results: https://firebase.google.com/docs/test-lab/android/get-started
- Firebase Test Lab iOS device availability: https://firebase.google.com/docs/test-lab/ios/available-testing-devices
- Testing Library guiding principles: https://testing-library.com/docs/guiding-principles
- Testing Library query priority: https://testing-library.com/docs/queries/about#priority
- Playwright browsers: https://playwright.dev/docs/browsers
- Playwright projects: https://playwright.dev/docs/api/class-testproject
- Playwright browser-context isolation: https://playwright.dev/docs/browser-contexts
- Playwright auto-retrying assertions: https://playwright.dev/docs/test-assertions
- Playwright retries: https://playwright.dev/docs/test-retries
- Playwright sharding: https://playwright.dev/docs/test-sharding
- Playwright trace and screenshot options: https://playwright.dev/docs/test-use-options
- Playwright video options: https://playwright.dev/docs/videos
- Playwright custom reporter API: https://playwright.dev/docs/api/class-reporter
- Playwright best practices: https://playwright.dev/docs/best-practices

## 研究論文

論文の分類、DOI、peer-reviewed／preprintの区別、実務への含意は [13-research-and-modern-practice.md](13-research-and-modern-practice.md) にまとめています。

- Metamorphic Testing: A Review of Challenges and Opportunities: https://nottingham-repository.worktribe.com/output/925152/metamorphic-testing-a-review-of-challenges-and-opportunities
