# Intentional failure: node:test

command: node --unhandled-rejections=strict --test test/intentional-failures/node-unawaited.mjs
actual_exit: 1
required_sentinel: UNAWAITED_CHECKOUT_FAILURE

## stdout

```text
✔ INCORRECT: checkout promise is not returned or awaited (<duration>)
ℹ Error: Test "INCORRECT: checkout promise is not returned or awaited" at test/intentional-failures/node-unawaited.mjs:4:1 generated asynchronous activity after the test ended. This activity created the error "Error: UNAWAITED_CHECKOUT_FAILURE" and would have caused the test to fail, but instead triggered an uncaughtException event.
ℹ Error: Test "INCORRECT: checkout promise is not returned or awaited" at test/intentional-failures/node-unawaited.mjs:4:1 generated asynchronous activity after the test ended. This activity created the error "Error: UNAWAITED_CHECKOUT_FAILURE" and would have caused the test to fail, but instead triggered an unhandledRejection event.
✖ test/intentional-failures/node-unawaited.mjs (<duration>)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms: <duration>

✖ failing tests:

test at test/intentional-failures/node-unawaited.mjs:1:1
✖ test/intentional-failures/node-unawaited.mjs (<duration>)
  'test failed'
```

## stderr

```text
<empty>
```
