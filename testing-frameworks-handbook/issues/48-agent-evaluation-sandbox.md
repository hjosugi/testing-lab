# ai: LLM/Agentをtool sandboxとversioned evalで検証する
<!-- labels: ai,testing,evaluation,security -->

## Tasks

- [x] deterministic parser/tool-schema tests
- [x] golden dataset、rubric、slice、adversarial casesをversion化
- [x] tool emulatorでfailure/timeout/permissionを注入
- [x] trajectory、final outcome、cost、latencyを分離評価
- [x] judgeをhuman sampleでcalibrate

## Acceptance criteria

- [x] prompt injectionで権限外tool/actionが起きない
- [x] model/prompt/tool/data versionを再現可能
