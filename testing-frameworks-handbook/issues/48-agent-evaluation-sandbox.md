# ai: LLM/Agentをtool sandboxとversioned evalで検証する
<!-- labels: ai,testing,evaluation,security -->

## Tasks

- [ ] deterministic parser/tool-schema tests
- [ ] golden dataset、rubric、slice、adversarial casesをversion化
- [ ] tool emulatorでfailure/timeout/permissionを注入
- [ ] trajectory、final outcome、cost、latencyを分離評価
- [ ] judgeをhuman sampleでcalibrate

## Acceptance criteria

- [ ] prompt injectionで権限外tool/actionが起きない
- [ ] model/prompt/tool/data versionを再現可能

