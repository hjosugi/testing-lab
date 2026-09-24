// Static oracle audit across the polyglot labs. It finds tests with no
// assertion, assertions that are always true, expected values computed with
// the production algorithm, and oversized snapshots. Heuristic by design:
// every finding is reviewed and recorded in decisions.json.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const LANGUAGES = [
  { ext: /\.(test|spec|pact\.test)\.(js|mjs|ts)$|\.spike\.js$/, start: /^\s*(?:test|it)(?:\.\w+)?\s*\(\s*[`'"]([^`'"]+)/, assertion: /\bassert\w*(\.\w+)?\s*\(|\bexpect\s*\(|\bt\.(is|not|deepEqual|notDeepEqual|true|false|truthy|falsy|throws|throwsAsync|notThrows|regex|like|pass|fail)\b|\bassert\.(equal|deepEqual|ok|match|throws|rejects)|assertOracle|\bverify\w*\(|\.rejects\(|\.toBe|\.toEqual|toHaveText|toBeVisible|toHaveURL/ },
  { ext: /(^|\/)test_[^/]+\.py$|_test\.py$|postgres_engine_semantics\.py$|repository_postgres_contract\.py$/, start: /^\s*(?:async\s+)?def\s+(test_\w+)/, assertion: /\bassert\b|pytest\.raises|\.assert_\w+\(|self\.assert/ },
  { ext: /_test\.go$/, start: /^func\s+(Test\w+|Fuzz\w+)\s*\(/, assertion: /t\.(Fatal|Fatalf|Error|Errorf|Fail)\b|\.EXPECT\(\)|goleak\.Verify/ },
  { ext: /Test\.java$/, start: /@(Test|ParameterizedTest|TestFactory)\b/, assertion: /assert\w*\(|assertThat\(|verify\w*\(|assertThrows|dynamicTest|OrderSubject\.assertThat/ },
  { ext: /\/tests\/.*\.rs$/, start: /#\[(test|rstest)\]/, assertion: /assert(_eq|_ne)?!|prop_assert(_eq)?!|should_panic|\.expect_err\(/ },
  { ext: /Test\.php$/, start: /public function (test\w+)|#\[Test\]/, assertion: /\$this->assert\w+|expectException|->expects\(|self::assert\w+/ },
  { ext: /Tests?\.cs$/, start: /^\s*public\s+(?:async\s+)?(?:Task|void)\s+(\w+)\s*\(/, attribute: /\[(Test|TestMethod|TestCase|DataRow|DataTestMethod)\b/, assertion: /Assert\.\w+|Assert\.That|Throws/ },
  { ext: /_test\.cpp$/, start: /^TEST_CASE\s*\(\s*"([^"]+)"/, assertion: /\b(REQUIRE|CHECK)\w*\s*\(|BENCHMARK/ },
];

const SKIP = new Set(['node_modules', 'build', 'vendor', 'target', '.venv', 'bin', 'obj', '.gradle', 'test-results', 'playwright-report', 'intentional-failures', 'intentional', 'fixtures', 'fixture-project', 'mutation-fixtures', 'reports']);

export function testFiles(root) {
  const files = [];
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (!SKIP.has(name) && !name.startsWith('.')) walk(path); continue; }
      const rel = relative(root, path);
      if (LANGUAGES.some(language => language.ext.test(rel))) files.push(rel);
    }
  };
  walk(root);
  return files.sort();
}

const TAUTOLOGY = /assert\.ok\(\s*true\s*\)|assert\(\s*true\s*\)|expect\(\s*true\s*\)\.toBe\(\s*true\s*\)|assertTrue\(\s*true\s*\)|assert\s+True\s*$|assert!\(\s*true\s*\)|REQUIRE\(\s*true\s*\)|t\.pass\(\)/m;
const SELF_COMPARE = /assert\.(?:equal|strictEqual|deepEqual)\(\s*([\w.]+)\s*,\s*\1\s*\)|expect\(\s*([\w.]+)\s*\)\.toBe\(\s*\2\s*\)|assertEquals\(\s*([\w.]+)\s*,\s*\3\s*\)/;
const SAME_ALGORITHM = /(?:const|let|var)\s+expected\w*\s*=\s*[^;\n]*(?:reduce\s*\(|\*\s*\w*\.?unit_?[Pp]rice|quantity\s*\*)/;

export function auditSource(path, source) {
  const language = LANGUAGES.find(candidate => candidate.ext.test(path));
  const lines = source.split('\n');
  const starts = [];
  lines.forEach((line, index) => {
    if (!language.start.test(line)) return;
    // C# helpers look like test methods; require a test attribute just above.
    if (language.attribute && !lines.slice(Math.max(0, index - 6), index).some(previous => language.attribute.test(previous))) return;
    starts.push(index);
  });
  const findings = [];
  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : lines.length;
    const chunk = lines.slice(start, end).join('\n');
    const name = (lines[start].match(language.start)?.[1] ?? lines[start].trim()).slice(0, 80);
    const at = { path, line: start + 1, test: name };
    // The test body may be a helper call; look for an assertion in the chunk
    // or a call into a local helper that asserts.
    if (!language.assertion.test(chunk)) findings.push({ ...at, rule: 'no-assertion' });
    if (TAUTOLOGY.test(chunk) || SELF_COMPARE.test(chunk)) findings.push({ ...at, rule: 'always-true' });
    if (SAME_ALGORITHM.test(chunk)) findings.push({ ...at, rule: 'same-algorithm-expected' });
    if (/toMatchSnapshot\(|toMatchInlineSnapshot\(/.test(chunk)) findings.push({ ...at, rule: 'snapshot-assertion' });
  });
  return { tests: starts.length, findings };
}

export function auditTree(root, { exclude = [/^oracles\/test\//] } = {}) {
  let tests = 0;
  const findings = [];
  // The audit's own tests embed bad-test fixtures as strings.
  for (const file of testFiles(root).filter(path => !exclude.some(pattern => pattern.test(path)))) {
    const result = auditSource(file, readFileSync(join(root, file), 'utf8'));
    tests += result.tests;
    findings.push(...result.findings);
  }
  return { tests, findings };
}
