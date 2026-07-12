# test(ai/data): data、ML、LLM、agent evaluationを実装する
<!-- labels: data-quality,ml-testing,llm-evals -->

## Tasks

- [ ] schema/null/range/unique/reconciliation test
- [ ] late/duplicate/out-of-order dataとidempotency
- [ ] model slice/robustness/drift/fairness test
- [ ] RAG retrieval recallとgroundedness dataset
- [ ] prompt/agent tool contractとstate transition test
- [ ] LLM-as-judgeをhuman sampleでcalibrate
- [ ] model/prompt/dataset/version provenanceを保存

## Acceptance criteria

- [ ] aggregate scoreだけでなくcritical slice failureをgate
- [ ] nondeterminismをdistribution/seed/repeatで評価

