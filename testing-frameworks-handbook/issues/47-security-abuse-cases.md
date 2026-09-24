# security: Threat modelからabuse-case testを実装する
<!-- labels: security,testing,priority-high -->

## Tasks

- [x] asset/trust boundary/attacker capabilityをmodel化
- [x] authorization、injection、replay、rate abuseをtest
- [x] SAST/SCA/DAST findingをriskでtriage
- [x] secret/log/artifact leakをtest

## Acceptance criteria

- [x] scanner件数ではなくexploit impactとmitigationを記録
- [x] critical abuse caseをCI/release gateへ接続
