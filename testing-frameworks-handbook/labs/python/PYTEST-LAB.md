# pytest fixture / property / patch / mutation lab

## 実行結果

2026-07-19にpinned Nix Python shellで確認した結果:

| Gate | Result |
|---|---|
| `pytest -q` | 33 passed |
| `pytest -q -n 2` | 33 passed |
| branch coverage | 100%（87 statements、16 branches） |
| targeted mutation | 6/6 killed、100% |

## fixture scopeとparallel safety

`tests/conftest.py`はstateとlifecycleに合わせてscopeを変えます。

| Fixture | Scope | 内容 | 安全性 |
|---|---|---|---|
| `checkout_component` | function | mutable payment/repository/service | test caseごとに新規作成しstateを共有しない |
| `ten_percent_discount` | module | frozen discount policy | immutableなのでmodule内共有可 |
| `immutable_catalog` | session | frozen `CartItem`のtuple | read-only dataだけをworker session内で共有 |
| pytest `tmp_path` | function | artifact directory | parameter case/workerごとに固有path |

xdistではsession/module fixtureもworker processごとに生成されます。processをまたぐsingletonとは見なしません。DB、port、file名などhost上で共有されるresourceは`worker_id`、unique ID、transaction/schema分離を追加します。

`test_function_scoped_component_starts_clean`はparametrizeされた各caseでpayment/repositoryが空から始まることを確認します。`test_parallel_cases_receive_unique_tmp_paths`は4 caseを`-n 2`で実行し、各caseが固有directoryだけへ書きます。

## autouse fixtureを使う/避ける判断

このlabではautouse fixtureを使いません。domain object、mock、test dataをautouseにすると、test signatureから前提が消え、fixture graphと変更影響が読みにくくなるためです。

autouseを使える条件:

- 全testに例外なく必要なsafety invariant
- teardownまでreversible
- function scopeまたはworker-safe
- business dataを作らない
- `conftest.py`の近いscopeで意図が明記される

例はglobal registryの確実なreset、禁止networkのguard、timezone/localeの固定です。特定testだけが必要なresource、mock、ログイン状態、DB dataは引数で明示します。`monkeypatch`も必要なtestだけがrequestし、自動cleanupだけをfixtureへ任せます。

## Hypothesis total invariant

`test_properties.py`は1〜12 item、quantity 1〜100、price 0〜100000、threshold、percentageを100 examples生成します。

守るinvariant:

```text
subtotal = sum(item subtotal)
0 <= discount <= subtotal
total = subtotal - discount
0 <= total <= subtotal
captured amount = total
persisted order = returned order
```

Hypothesisの1 test invocation内ではfunction-scoped fixtureがexampleごとに再生成されません。そのためproperty testはpayment/repository/serviceを各generated exampleのbody内で作り、state leakを防ぎます。

## patchはlookup siteへ

`checkout.receipt`は次のimportを使います。

```python
from uuid import uuid4
```

この場合production codeがlookupするnameは`uuid.uuid4`ではなく`checkout.receipt.uuid4`です。

- wrong: `monkeypatch.setattr(uuid, "uuid4", fake_uuid4)`
- correct: `monkeypatch.setattr(receipt, "uuid4", fake_uuid4)`

`test_patching_definition_site_misses_an_imported_lookup`はdefinition siteをpatchしてもimport済みreferenceが変わらないことを再現します。次のtestがlookup siteをpatchし、固定receipt IDを検証します。

## branch coverageとmutationの比較

`scripts/mutation_demo.py`はtemp copyへ6個の決定的mutantを1つずつ適用し、同じpytest suiteでkill/surviveを判定します。これは全operatorを網羅するmutation frameworkではなく、coverageとoracle strengthの違いを再現する教材gateです。

| Stage | Tests | Branch coverage | Mutation | Survivors |
|---|---:|---:|---:|---|
| Before | 18 | 94% | 3/6、50% | zero quantity、over-discount guard、payment ID |
| After | 33 | 100% | 6/6、100% | none |

baselineでは`payment_id=payment_id`の行は実行されていましたが、改変された値をassertしていなかったためmutantがsurviveしました。coverageは「通った」を示し、mutationは「test oracleが誤実装を区別した」を測ります。

追加したdiagnostic tests:

- zero quantity / negative price validation
- over-discount policyをside effect前にreject
- persisted/returned payment ID
- threshold inclusive boundary
- notification omission
- empty cart prohibition

## Commands

```bash
nix develop .#python --command pytest -q labs/python
nix develop .#python --command pytest -q -n 2 labs/python
nix develop .#python --command pytest \
  --cov=checkout --cov-branch --cov-fail-under=100 labs/python
nix develop .#python --command python \
  labs/python/scripts/mutation_demo.py --require-all-killed
```
