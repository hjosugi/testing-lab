# test(infra): IaC/Kubernetes/cloud emulator/upgrade testを実装する
<!-- labels: infrastructure,kubernetes,cloud-testing -->

## Tasks

- [ ] IaC syntax/policy/plan test
- [ ] LocalStack/Azurite等emulatorとreal cloud smokeを分離
- [ ] Kubernetes manifest admission/policy/ephemeral namespace
- [ ] Kuberhealthy等synthetic checkを評価
- [ ] install/upgrade/rollback/backup/restore test
- [ ] cloud quota/cost/cleanup guardrail

## Acceptance criteria

- [ ] emulatorとreal serviceのgapをdocument化
- [ ] leaked resourceを検知/cleanupできる

