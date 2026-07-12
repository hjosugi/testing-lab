# integration: Messagingの重複・順序・redeliveryを検証する
<!-- labels: integration-testing,messaging,resilience -->

## Tasks

- [ ] real brokerでpublish/consumeを確認
- [ ] duplicate、out-of-order、late、poison messageを注入
- [ ] consumer crashとredeliveryを再現
- [ ] schema evolution、DLQ、correlationを確認

## Acceptance criteria

- [ ] at-least-once下でbusiness side effectがidempotent
- [ ] eventual assertionにdeadlineとdiagnosticsがある

