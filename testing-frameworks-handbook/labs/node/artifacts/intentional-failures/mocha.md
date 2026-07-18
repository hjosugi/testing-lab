# Intentional failure: Mocha

command: node --unhandled-rejections=strict <LAB>/node_modules/mocha/bin/mocha.js --no-color test/intentional-failures/mocha-unawaited.mjs
actual_exit: 7
required_sentinel: UNAWAITED_CHECKOUT_FAILURE

## stdout

```text
✔ INCORRECT: checkout promise is not returned or awaited

  1 passing (<duration>)
```

## stderr

```text
<LAB>/node_modules/mocha/lib/runner.js:1003
    throw err;
    ^

Error: UNAWAITED_CHECKOUT_FAILURE
    at Timeout._onTimeout (file://<LAB>/test/intentional-failures/unawaited-checkout.js:6:14)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)

Node.js v24.18.0
```
