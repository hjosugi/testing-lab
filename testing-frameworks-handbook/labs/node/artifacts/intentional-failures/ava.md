# Intentional failure: AVA

command: node --unhandled-rejections=strict <LAB>/node_modules/ava/entrypoints/cli.js --no-color --verbose test/intentional-failures/ava-unawaited.mjs
actual_exit: 1
required_sentinel: UNAWAITED_CHECKOUT_FAILURE

## stdout

```text
✔ INCORRECT: checkout promise is not returned or awaited

  Uncaught exception in test/intentional-failures/ava-unawaited.mjs

  Error: UNAWAITED_CHECKOUT_FAILURE

  Error: UNAWAITED_CHECKOUT_FAILURE
      at Timeout._onTimeout (file://<LAB>/test/intentional-failures/unawaited-checkout.js:6:14)
      at listOnTimeout (node:internal/timers:605:17)
      at process.processTimers (node:internal/timers:541:7)

  ✘ test/intentional-failures/ava-unawaited.mjs exited with a non-zero exit code: 1
  ─

  1 test passed
  1 uncaught exception
```

## stderr

```text
<empty>
```
