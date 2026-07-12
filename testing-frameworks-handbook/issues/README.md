# Issue backlog

各Issueは依存順に番号を付けています。`gh`で投入する前にrepositoryのlabelを作成してください。

```bash
./scripts/create-issues.sh --dry-run
./scripts/create-issues.sh --apply
```

## Phase

| Phase | Issues | Exit criteria |
|---|---|---|
| Foundation | 00-04 | 用語、Nix、Classical/Londonを説明可能 |
| Polyglot | 05-12 | 8言語の同一behaviorがgreen |
| Integration/UI | 13-18 | real boundary、contract、E2Eを分離 |
| Specialized | 19-27 | mobile、performance、security、data/AI等をrisk-based設計 |
| Operations/research | 28-34 | continuous verification、論文再現、品質audit |
| Deep-dive practice | 35-50 | oracle、state、concurrency、data、運用、AIまで実証 |

`blocked`、`needs-hardware`、`needs-cloud`を使い、localで完了できない検証を曖昧にcloseしないでください。
