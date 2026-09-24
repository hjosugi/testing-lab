# Security verification lab

threat modelからabuse-case testを導き、SAST・SCA・secret・workflow（CI-as-IaC）scan、API fuzz、SBOM/provenance/signatureを**1つのfinding ledger**で運用します。scanner件数ではなく、exploit impactとmitigationで判断するための教材です。

## Threat model

[`threat-model.json`](threat-model.json)が正です。

| 種類 | 内容 |
|---|---|
| Asset | A1 tenantの注文data、A2 refund権限、A3 token/署名secret/card番号、A4 他tenantへの可用性 |
| Trust boundary | TB1 client→HTTP API（bearer token）、TB2 API→SQL（query parameter）、TB3 API→log/CI artifact |
| Attacker | T1 他tenantの認証済みuser、T2 非admin、T3 通信を再送できる観測者、T4 token偽造者、T5 crafted query送信者、T6 単一principalのflood、T7 log/artifact閲覧者 |

| Abuse case | Severity / gate | Mitigation | Test | ASVS 5.0 / WSTG |
|---|---|---|---|---|
| AC-01 cross-tenant read（IDOR） | critical / release | 全queryにtenant条件、他tenantと不在で同一404 | `AC-01 …` | V8 / ATHZ-04 |
| AC-02 refundへの権限昇格 | critical / release | refund処理前のrole check、role claimは署名対象 | `AC-02 …` | V8 / ATHZ-03 |
| AC-03 署名済みrefundのreplay | critical / release | method/path/timestamp/nonce/bodyのHMAC、60秒window、nonce一回限り | `AC-03 …` | V4・V2 / BUSL-05 |
| AC-04 偽造・改ざん・期限切れ・`alg=none` token | critical / release | HS256固定、定数時間比較、`exp`必須 | `AC-04 …` | V9 / SESS-10 |
| AC-05 search経由のSQL injection | critical / release | prepared statementのみ、長さ上限 | `AC-05 …`（+ string連結版で漏れる対照） | V1 / INPV-05 |
| AC-06 単一principalのflood | high / CI | principal単位token bucket、`Retry-After` | `AC-06 …` | V2 / BUSL-07 |
| AC-07 log・artifactへのsecret/PAN漏洩 | critical / release | 構造化audit eventを`redact()`経由で出力、fixture/artifactのsecret scan | `AC-07 …`（2件） | V16・V14 |
| AC-08 malformed inputでの5xx・stack露出 | high / CI | size上限、shape検証、correlation ID付きgeneric error | `AC-08 …` | V16・V2 / ERRH-01 |

ASVSはversionごとに要件番号が変わるため、chapter単位で対応付けています（requirement単位のmappingは採用version決定後のfollow-up）。

各controlには`unsafe`切替（tenant条件なし、role checkなし、nonce storeなし、SQL文字列連結、limiterなし）があり、testは**controlを外すと同じoracleが失敗する**ことも確認します。AC-08のAPI fuzzは実装中に本物の欠陥（JSON `null` bodyが500になる）を見つけ、shape検証を追加しました。

## Release gate

このrepositoryにはrelease workflowがないため、`main`のrequired check（Reproducibility workflowの`STRICT=1 ./scripts/test-all.sh`）がrelease gateです。critical abuse case（gate=`release`）はすべて`Security-portfolio`としてそこへ入り、`traceability` testがthreat modelのtest名と実在するtestの一致を強制します。critical caseからtestを消すと、そのcommitはmainへ入れません。

## Scanner portfolio

| 種類 | 実装（lab） | 実行場所 | 本番での置換候補 |
|---|---|---|---|
| Secret | `scanText`: cloud key、GitHub/Slack token、private key、JWT、代入されたsecret、Luhn有効な非test PAN | 毎push（lab/templates全体） | gitleaks、trufflehog |
| SAST | `sastText`: `eval`/`new Function`、shell文字列の`exec`、template literal SQL | 毎push（labsの全JS） | Semgrep、CodeQL |
| Workflow（CI-as-IaC） | `scanWorkflow`: SHA pin、`permissions`明示、`pull_request_target`禁止、untrusted contextのshell埋込禁止 | 毎push（`.github/workflows`） | zizmor、actionlint |
| SCA | `scripts/sca-triage.mjs`: `npm audit --json`をledgerと照合 | 週次・manual（advisory DBがcommitと無関係に変わるため） | Dependabot、OSV-Scanner、Trivy |
| Registry signature / provenance | `npm audit signatures` | 週次・manual | 同左 |
| SBOM | `scripts/sbom.mjs`: CycloneDX 1.6、sha512 integrityとregistry hostの確認、Ed25519署名と検証 | 毎push（生成・検証）、週次artifact | Syft + cosign / Sigstore |
| API fuzz / DAST | `AC-08`: path traversal風path、NUL、長大ID、壊れたJSON、`__proto__`、20KB body | 毎push（test環境のephemeral server） | Schemathesis（`labs/system`で使用中）、ZAP |

IaC templateはまだありません（Terraform/Kubernetesは#32の範囲）。このlabのIaC scanはGitHub Actions workflowを対象にしています。

## Finding ledger

[`findings.json`](findings.json)の各findingは`owner`、`impact`（exploit impact）、triage後の`severity`、`status`（`open`または`suppressed`）を持ちます。

- `open`はseverity別SLA（critical 7日、high 30日、medium 90日、low 180日）を超えるとtestが失敗します。
- `suppressed`は`rationale`と180日以内の`suppressionExpires`が必須で、期限切れはtestが失敗します。
- scannerのfindingがledgerにない（untriaged）場合も、ledgerにあるのにscannerが出さなくなった（resolved、削除忘れ）場合も失敗します。
- SCAの6件（brace-expansion、js-yaml、tar、nanoid）はscanner上highですが、すべてtest tooling由来のdev dependencyで、入力はrepository内のglob/configだけです。攻撃者が入力を制御できないため、triage後severityをlowとし、lockfile更新までのSLAを180日にしています。

## Fixture policy

- test secretは`syntheticSecret(label)`で`test-only-`接頭辞付きに生成し、production credentialをfixtureへ置けない形にしています。
- card番号はcard networkが公開するtest PAN（`4111 1111 1111 1111`等）だけを許可し、それ以外のLuhn有効な13〜19桁はreal PANとして検出します。
- `AC-07 fixtures and test artifacts …`は`labs/`と`templates/`の全text fileを走査します。

## 実行

```bash
nix develop --command make test-security        # abuse case + portfolio（test-allにも含む）
nix develop --command make test-security-sbom   # SBOM生成・provenance・署名検証
nix develop .#node --command make test-security-sca   # npm audit triage（network必要）
```

## このlabが保証しないこと

- 自作scannerは説明用に小さく保っています。検出rule数はproduction toolに及びません。ledger契約はtoolを置換しても同じです。
- `npm audit signatures`はregistry署名とprovenance attestationの確認で、package内容の安全性は保証しません。
- threat modelは1 serviceの教材規模です。認証基盤、network、infrastructureのthreatは対象外です。
