# Device test plan: <application / release>

## 1. Scope and protected risks

- Surfaces: native iOS / native Android / React Native / Flutter / desktop / game / embedded
- Supported OS versions:
- Device classes and usage share:
- Critical journeys:
- Hardware-coupled risks:
- Past device-specific incidents:
- Explicitly out of scope:

## 2. Automation mechanism

Execution substrate and automation mechanism are separate decisions.

| Surface / journey | Tool | Mechanism | Semantic locator / oracle | Why this layer |
|---|---|---|---|---|
| | | WebDriver / native UI / gray-box / in-app hooks / hierarchy / image / hardware protocol | | |

- Do not write `emulation` as the mechanism. Simulator/emulator/real device/HIL is the substrate.
- Prefer semantic hierarchy or accessibility locators before image recognition.
- Record the driver/plugin/framework version separately from the test runner.

## 3. Risk-based selected matrix

Declare the full supported values, then select cells from risk instead of taking
the Cartesian product.

| Scenario ID | Lane | Surface | OS | Device class | Input | Network | Substrate | Risks | Owner |
|---|---|---|---|---|---|---|---|---|---|
| | PR / nightly / release / hardware | | | | | | simulator / emulator / real device / HIL | | |

Selection rules:

- PR: primary supported OS/device and the changed critical journey.
- Nightly: minimum supported OS, low-resource/small/large form factors, and one degraded network path.
- Release: usage-leading real devices plus hardware, entitlement, vendor, and incident-derived cells.
- Hardware lane: camera/biometric/radio/gamepad/GPU/thermal/sensor/bus risks that virtual devices cannot establish.
- Add a regression cell for every escaped device-specific defect. Remove a cell only with usage/risk evidence and an owner.

## 4. Artifact contract

Artifact path: `artifacts/{runId}/{scenarioId}/{attempt}/`

| Artifact | Always / failure | Retention | Redaction / fallback |
|---|---|---:|---|
| result + runner log | always | | |
| device metadata: model, OS, build, locale, input, network | always | | |
| device/system log | always on device farm/HIL | | |
| screenshot | failure | | |
| video | failure when provider supports it | | timed screenshots + result bundle + device log |
| UI hierarchy / `.xcresult` / instrumentation output / rig telemetry | mechanism-specific | | |

- Store provider matrix/run ID and artifact manifest with the release record.
- If an artifact is unsupported, record capability metadata and the named fallback; do not silently omit it.
- Use synthetic accounts. Remove secrets, personal data, and unrelated notifications before upload.
- Treat a test retry and an infrastructure retry as different events.

## 5. Hardware ownership and reservation

| Scenario / rig | Test owner | Reservation owner | Lead time | Escalation |
|---|---|---|---:|---|
| | | | | |

Reservation request must include:

- scenario ID and protected risk
- device, farm model, or rig ID
- build SHA and signed artifact
- operator and exclusive time window
- OS/firmware/peripheral/network requirements
- data classification and synthetic account
- abort thresholds for safety, battery, thermal, privacy, and fixture integrity

Procedure:

1. Check capacity, device stability/deprecation, calibration, and current leases.
2. Submit the request and wait for the reservation owner to assign a queue/matrix/lease ID.
3. Record preflight metadata before running tests.
4. Stop and escalate on abort thresholds; never bypass a hardware interlock to make a test pass.
5. Upload the artifact manifest, reset data and credentials, restore the fixture, and release/cancel the reservation.

## 6. CI and execution contract

| Lane | Trigger | Budget | Retry policy | Required result |
|---|---|---:|---|---|
| PR virtual | pull request | | no test retry masking | |
| nightly virtual | schedule | | record first-attempt failure | |
| release real device | release candidate | | infra retry separately labeled | |
| reserved hardware / HIL | approved reservation | | operator + lease required | |

## 7. Reproducibility boundary

- Repository-local validator/tool versions:
- App/SDK lock files:
- Nix-provided tools:
- Host-only dependencies: Xcode, signed Apple device access, Android hardware acceleration, device-farm credentials, USB/peripheral drivers, physical rig
- Captured but not reproducible locally: exact farm hardware, radio conditions, thermal state, provider capacity

Validate the reference structure with:

```bash
nix develop --command make verify-device-matrix
```

## 8. Lifecycle

- Plan owner:
- Review date:
- Usage/incident data source:
- Device catalog refresh cadence:
- Retirement criteria:
- Related release / incident / issue:
