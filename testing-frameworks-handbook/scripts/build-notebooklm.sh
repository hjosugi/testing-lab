#!/usr/bin/env bash
# Build NotebookLM-ready source bundles from docs/ and issues/.
# NotebookLM works best with a small number of large, themed sources,
# so the 30+ chapters are grouped by "観点" (perspective) into 6 files.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="$root/notebooklm"
mkdir -p "$out"

bundle() {
  local target="$out/$1"
  local title="$2"
  shift 2
  {
    echo "# $title"
    echo
    echo "> Testing Frameworks Handbook のNotebookLM取り込み用バンドル。"
    echo "> 生成元: https://github.com/hjosugi/testing-lab （scripts/build-notebooklm.sh で再生成）"
    for file in "$@"; do
      echo
      echo "---"
      echo
      echo "<!-- SOURCE: $file -->"
      echo
      cat "$root/$file"
    done
  } > "$target"
  echo "built: ${target#"$root/"} ($(wc -l < "$target") lines)"
}

bundle 01-foundations-schools-frameworks.md \
  "観点1 基礎・思想・フレームワーク" \
  docs/00-beginner-friendly-all-tests.md docs/00-map.md docs/01-foundations.md \
  docs/02-london-vs-classical.md docs/adr/0001-hybrid-testing-policy.md \
  docs/03-framework-catalog.md \
  docs/04-language-differences.md docs/29-glossary.md

bundle 02-design-oracles-levels.md \
  "観点2 設計・oracle・テストレベル" \
  docs/05-boundaries-and-portfolio.md docs/06-test-doubles.md \
  docs/14-complete-testing-taxonomy.md docs/16-how-to-design-any-test.md \
  docs/17-test-oracles-deep-dive.md docs/18-test-levels-deep-dive.md \
  docs/30-decision-tree.md

bundle 03-generative-research-frontier.md \
  "観点3 生成型テスト・研究・最先端" \
  docs/07-advanced-testing.md docs/19-generative-and-search-based-testing.md \
  docs/13-research-and-modern-practice.md docs/27-research-guide.md \
  docs/31-frontier-multi-perspective.md

bundle 04-integration-e2e-operations.md \
  "観点4 integration・E2E・運用" \
  docs/20-integration-testing-deep-dive.md docs/21-e2e-and-acceptance-deep-dive.md \
  docs/22-performance-security-resilience.md docs/24-ci-flakiness-economics.md \
  docs/09-production-strategy.md docs/28-case-study-commerce.md \
  docs/32-mobile-desktop-game-device-matrix.md

bundle 05-ai-data-tools-2026.md \
  "観点5 AI・データ・2026ツール地図" \
  docs/23-data-ml-llm-agent-testing.md docs/15-tool-landscape-2026.md \
  docs/25-language-framework-internals.md docs/26-100-test-types.md \
  docs/08-selection-guide.md

issue_files=()
while IFS= read -r file; do
  issue_files+=("${file#"$root/"}")
done < <(find "$root/issues" -maxdepth 1 -type f -name '[0-9][0-9]-*.md' | sort)

bundle 06-hands-on-roadmap-issues.md \
  "観点6 ハンズオン・ロードマップ・全Issue" \
  docs/10-interview-guide.md docs/11-sources.md docs/12-nix-setup.md \
  issues/README.md "${issue_files[@]}"
