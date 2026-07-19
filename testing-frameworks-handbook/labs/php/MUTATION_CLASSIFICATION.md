# Mutation classification

Mutation results are triaged by semantics before changing tests. An escaped
mutant is either a real oracle gap or an equivalent transformation; a green
threshold alone does not decide which.

## Escaped mutants converted into assertions

The original three-test suite generated 13 covered mutants and let four escape.
Each changed observable behavior, so each was classified as non-equivalent and
received the smallest public assertion that distinguishes it.

| Mutator | Changed behavior | Assertion added |
|---|---|---|
| `LessThanOrEqualTo` | accepts quantity `0` | invalid-item data case |
| `LessThan` | rejects allowed unit price `0` | free-item subtotal |
| `LogicalOr` | accepts an item when only one validation branch fails | zero/negative quantity and negative-price cases |
| `Throw_` | continues checkout for an empty cart | exception plus no collaborator calls |

`scripts/run-mutation.sh` now requires all 14 high-risk mutants to be killed,
with MSI and covered MSI both at 100%.

## E-001: equivalent `CastBool`

`mutation-fixtures/BooleanIdentity.php` deliberately exposes one reviewable
equivalent mutant:

```diff
- return (bool) $value;
+ return $value;
```

The parameter type is `bool`, so the input domain is exactly `true | false`.
Removing the cast cannot change the value or type for either input. The fixture
uses a `mixed` return declaration only so Infection can emit the otherwise
suppressed cast mutant. The two data-provider cases exhaust the input domain,
which is a semantic proof rather than a request for another assertion.

`scripts/verify-equivalent-mutant.sh` runs only `CastBool` against the isolated
fixture and requires exactly one covered escaped mutant. E-001 is excluded from
the high-risk checkout threshold; it is not hidden with a broad mutator ignore.
