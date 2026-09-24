# test(ai/data): data、ML、LLM、agent evaluationを実装する
<!-- labels: data-quality,ml-testing,llm-evals -->

## Tasks

- [x] schema/null/range/unique/reconciliation test
- [x] late/duplicate/out-of-order dataとidempotency
- [x] model slice/robustness/drift/fairness test
- [x] RAG retrieval recallとgroundedness dataset
- [x] prompt/agent tool contractとstate transition test
- [x] LLM-as-judgeをhuman sampleでcalibrate
- [x] model/prompt/dataset/version provenanceを保存

## Acceptance criteria

- [x] aggregate scoreだけでなくcritical slice failureをgate
- [x] nondeterminismをdistribution/seed/repeatで評価
