# ops: canary/shadow/synthetic/runtime invariantを実装する
<!-- labels: continuous-testing,observability,sre -->

## Tasks

- [x] synthetic accountとidempotent cleanup
- [x] canary metric/abort/rollback
- [x] sanitized shadow traffic
- [x] runtime business invariantとSLO alert
- [x] OpenTelemetry traceでcritical flowを検証
- [x] feature flag cohort/kill switchをtest

## Acceptance criteria

- [ ] production verificationのblast radius/privacyをreview
- [x] pre-deploy testをproduction monitoringで置換しない
