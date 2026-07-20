# Mobile／desktop／game／device matrix設計

更新日: 2026-07-19

この章は、mobile app、desktop app、game、embedded deviceを同じ「UI test」
という箱へ入れず、automation mechanism、execution substrate、risk、artifact、
hardware運用を分けて設計します。copy可能な雛形は
[device test plan template](../templates/device-test-plan.md)、機械検証するreference
planは[device matrix JSON](../templates/device-test-matrix.example.json)です。

## 最初に分ける2軸

`emulatorでAppiumを使う`という1文には、別の判断が2つ含まれます。

1. **automation mechanism**: testがappをどう操作・観測するか
2. **execution substrate**: appをどの実行環境に載せるか

| 分類 | 意味 | 代表例 | 主に見えるもの | 主に見えないもの |
|---|---|---|---|---|
| WebDriver | HTTP protocol越しのblack-box automation | Appium 3 + platform driver | accessibility/UI hierarchy、platform driverが公開する操作 | app内部idle、未公開state |
| native UI API | platform標準のUI automation | XCUITest | Apple UI surface、system alert、accessibility element | cross-platform共通protocol、app内部state |
| gray-box | test build内のinstrumentationとhost runnerを協調 | Detox、EarlGrey 2、Espresso | idle/synchronization、application element、native action | production binaryそのもの、未instrumentationの外部app |
| in-app hooks | app component treeへtest hookを組み込む | Cavy、Flutter `integration_test` | component/widgetとapplication flow | native system UI、他application |
| hierarchy inspection | engine/platformのsemantic treeを読む | Poco | object/control ID、properties、engine hierarchy | treeに出ないrendered pixel |
| image recognition | screenshot templateから位置を認識 | Airtest | semantic treeがないrender surface | control identity、hidden state、意味 |
| hardware protocol | electrical/bus/sensor signalを注入・観測 | custom HIL runner | timing、sensor、bus、safety interlock | 人が見るUIだけのquality |

simulator、emulator、real device、HILはこの表のmechanismではありません。
例えばAppiumはemulatorでもreal deviceでも使えます。Airtestもreal game deviceや
Windows appへ使えます。`emulation`をWebDriverやgray-boxと並べてtool分類に
しないことが、責務混同を防ぐ最初のgateです。

## Surface別tool decision

| Tool | Surface | Mechanism | 強み | 採用判断 |
|---|---|---|---|---|
| Appium 3 | iOS、Android、desktop、driverがあるplatform | W3C WebDriver client/server | languageとplatformを跨ぐblack-box journey、device farm接続 | cross-platform smokeとsystem UIを含む少数journeyへ採用。server、client、driver、pluginを別々にpinする |
| Detox | React Native iOS/Android | gray-box | RN JS/native thread、network、layout、timer、animation等とのautomatic synchronization、device/artifact管理 | RN critical journeyのdefault。対応RN/device matrixをupgrade時に再確認 |
| XCUITest | native iOS | Apple native UI API | simulator/real device、system alert、accessibility UI、`.xcresult`とattachment | iOS platform default |
| EarlGrey 2 | native iOS | XCUITest + gray/white-box synchronization | animation、queue、network idle、RMIによるwhite-box補助 | plain XCUITestで同期不足が実測された範囲だけpilot。branch/build integration costを測る |
| Espresso | native Android | instrumentation gray-box | message queue、task、IdlingResourceとの同期、fast in-app UI action | Android native appのdefault。外部app/system surfaceはUiAutomator/Appiumへ分離 |
| Airtest | game、native app、Windows | image recognition | semantic hierarchyがないrendered UIにも適用可能 | hierarchyが取れない最後のfallback。template、resolution、locale、animationをversion管理 |
| Poco | Unity、Cocos、UE等のgame、native mobile | hierarchy inspection | engine UI tree、stable control path、property観測 | gameはPocoをAirtestより先に選ぶ。engine buildへPoco SDKを組み込む契約を持つ |
| Cavy | React Native | in-app refs/test hooks | pure JSのtargeted integration、deep componentへのhook | pilot候補。hook maintenanceを測り、system UI/black-box coverageの代替にしない |
| Flutter `integration_test` | Flutter mobile/desktop/web | in-app widget/application integration | official SDK package、physical device/emulator、`flutter_test` style | Flutter application journeyのdefault。native permission/share sheet等はXCUITest/Espresso/Appiumで補う |

Appiumはtest frameworkそのものではなくautomation serverです。test runner、
fixture、assertion、reporter、oracleを別に選びます。またAppium 3のdriver/pluginは
core serverから分離されるため、`appium`のversionだけを記録しても再現できません。

Detox、EarlGrey、Espressoの「同期」はsleepを短くする機能ではありません。
frameworkが把握するidle conditionと、applicationが実際にbusyである条件が一致する
場合にだけ有効です。long polling、untracked native work、animation loopは明示的な
idle resource、blacklist、test hook、または設計変更が必要です。

Airtestの画像認識とPocoのhierarchy inspectionも同義ではありません。Pocoでstable
object IDを得られるならそれをprimary locatorにし、画像はtreeに現れないcanvas、
shader、sprite、render corruptionのoracleに限定します。

## React NativeとFlutterのdefault

### React Native

```text
component behavior       React Native Testing Library等
in-app integration pilot Cavy
critical E2E             Detox
system UI / farm black-box Appium or platform-native UI tool
```

Detoxはhostのtester、appへ組み込むnative client、mediatorから成り、RNとnative
operationのidle情報を使います。CavyはReact refs/test hooksをappへ追加してcomponent
を操作します。したがってCavyは小さなin-app integrationには使えても、permission
dialog、他app、production binaryと同じblack-box surfaceを保証しません。

Cavyを採用する前に、対象RN version、New Architecture、test hook差分、CI exit code、
artifact、project activityを小さなpilotで確認します。defaultをDetoxからCavyへ
一括変更しません。

### Flutter

`integration_test`はFlutter SDKのofficial packageで、physical deviceとemulatorへ
application integration testを実行できます。一方、official docsが明記する通り
native platform UIは操作できません。

```text
widget/component          flutter_test
application journey      integration_test
permission/share/system  XCUITest / Espresso / Appium
vendor hardware          real device / HIL上のplatform tool
```

## Execution substrateの責務

| Substrate | 使うlane | 検出するrisk | passしても保証しないこと |
|---|---|---|---|
| iOS Simulator | PR、nightly | iOS API、screen size、locale、basic lifecycle、XCUITest/Detox flow | camera/biometric/radio/GPU/thermal、real signing、device-only entitlement |
| Android Emulator | PR、nightly | API level、form factor、rotation、config change、network/sensor simulation、Espresso/Appium flow | vendor HAL/OS差、actual memory/thermal/radio/camera性能 |
| cloud real device | release、scheduled | vendor device/OS、physical sensor/radio/GPU、real installation | local peripheral、providerが公開しないsensor、再現可能なqueue/thermal状態 |
| local real device | release、reserved | USB/Bluetooth/peripheral、offline、special account、local network | fleet全体のdevice diversity、自動resetの完全性 |
| HIL | reserved hardware | firmware、electrical signal、bus timing、sensor/actuator、safety interlock | production field environment全体、人間の長期使用 |

Android Emulatorは多くのdevice/API/sensor/network条件を高いfidelityで扱えますが、
real deviceと同一ではありません。Apple Simulatorも実機hardwareの証明には
使いません。virtual substrateを「偽物だから無価値」、real deviceを「本物だから
完全」と扱わず、検出したいfailureから配置します。

HILは単なるreal device laneではありません。product hardware/firmwareへrigから
電気信号、sensor値、bus frame、faultを注入し、timing、telemetry、actuator、
safety interlockを観測します。rig calibrationとfixture integrityがtest oracleの
一部です。

## Cartesian productを作らない

reference planは次のdimensionを宣言します。

- OS: current、minimum、platform/runtime固有
- device class: primary、小型、low-memory、tablet、desktop、game、HIL
- input: touch、biometric、camera、keyboard/mouse、gamepad、sensor
- network: normal、constrained、offline/resume、lossy cellular、LAN、hardware bus

単純な直積は`7 × 7 × 6 × 6 = 1764` cellsです。reference planは12 cellsだけを
選び、validatorが全dimension value、全substrate、必須mechanism、hardware riskを
少なくとも1回coverすることを確認します。

選定手順:

1. unsupported/不可能な組み合わせをconstraintで除く。
2. 各critical journeyにusage-leading OS/device/input/networkのprimary cellを置く。
3. minimum supported OS、small/large/low-resource、offline/resumeを追加する。
4. camera、biometric、radio、GPU、gamepad、sensor、bus等、virtualで証明できない
   riskをreal device/HILへ置く。
5. escaped defect、今回変更したboundary、vendor固有差をregression cellとして足す。
6. 残る低risk dimension interactionだけをpairwise/covering arrayで補う。
7. PR/nightly/release/hardwareのbudgetへ配置し、落としたcellのresidual riskとownerを
   release recordに残す。

usage shareだけでminimum OSを消さず、supported contractだけでrare hardwareを
全組み合わせに増やしません。最低1つのcellを置く条件は、利用率、重大incident、
変更量、platform固有API、hardware couplingのいずれかで説明します。

reference selection:

| Scenario | Lane | Substrate | Tool | 主risk |
|---|---|---|---|---|
| `rn-ios-primary-pr` | PR | simulator | Detox | RN critical journey/synchronization |
| `android-native-primary-pr` | PR | emulator | Espresso | Android instrumentation |
| `ios-minimum-nightly` | nightly | simulator | XCUITest + EarlGrey 2 pilot | minimum OS、offline resume |
| `android-low-memory-nightly` | nightly | emulator | Appium 3 | low memory、minimum OS、black-box contract |
| `flutter-tablet-nightly` | nightly | emulator | `integration_test` | Flutter/large screen |
| `rn-cavy-pilot-nightly` | nightly | emulator | Cavy pilot | hook cost/in-app integration |
| `android-vendor-farm-release` | release | cloud real device | Appium 3 | vendor OS、physical install、farm compatibility |
| `ios-biometric-real-release` | release | real device | XCUITest | biometric、radio、entitlement |
| `android-camera-vendor-release` | release | real device | Appium 3 | camera、vendor OS、process death |
| `windows-keyboard-release` | release | real machine | Appium 3 | keyboard/window/install |
| `unity-game-device-hardware` | hardware | real device | Poco + Airtest fallback | engine hierarchy、render、gamepad |
| `embedded-sensor-hil` | hardware | HIL | rig protocol | calibration、timing、safety |

## Artifact contract

device testのfailureをrerunだけで処理しません。すべてのartifactを
`artifacts/{runId}/{scenarioId}/{attempt}/`へ関連付けます。

| Artifact | Local virtual | Real device / farm | HIL |
|---|---|---|---|
| normalized result/JUnit + runner log | always | always | always |
| device metadata: model、OS、build、locale、input、network、provider capacity | always | always | always |
| device/system log: logcat、`.xcresult` log、crash、sysdiagnose等 | failure | always | always |
| screenshot | failure | failure | failure |
| video | failure | failure when supported | failure |
| semantic hierarchy / XCTest attachment / instrumentation output | mechanism別 | mechanism別 | optional |
| rig telemetry、bus trace、calibration | no | no | always/failure |

Detoxはlog、screenshot、video等のartifact pluginを持ちます。XCTestはscreenshotや
fileをattachmentとしてresultへ保存でき、`xcodebuild`の`.xcresult`はtest result、
coverage、log等を持ちます。Firebase Test Labはresult、video、screenshot、logを
Cloud Storageへ保存できます。

provider capabilityは変わるため、`video`を無条件に存在すると仮定しません。例えば
2026-07-19時点のFirebase Test LabはiOS 18以上でresult videoを提供しないと
明記しています。この場合はcapability metadataと理由をmanifestへ記録し、timed
screenshot、`.xcresult`/provider result bundle、device logをfallbackとして
必須にします。artifactの無言欠落をgreenにしません。

retention default:

- passed: 7日
- failed/flaky/inconclusive: 30日
- release/hardware incident: 90日以上またはrelease retention policy

credential、token、personal data、unrelated notificationはupload前にredactします。
synthetic accountを使い、run後にapp data、account session、download、mediaを
resetします。test retryとprovider/device infrastructure retryを別attemptとして
記録します。

## Hardware ownerと予約手順

hardware必須scenarioはtest ownerだけでなく、reservation procedureとlab ownerを
持ちます。role名だけで放置せず、実案件ではon-call/queue/calendarへ解決できるIDを
設定します。

### Device farm queue

Owner: Quality Infrastructure

1. provider catalogのcapacity、reduced stability、deprecationを確認する。
2. scenario、model、OS、build SHA、data classification、time budgetをsubmitする。
3. provider matrix ID、queue time、result bucketをrelease recordへ先に記録する。
4. abandoned releaseのqueueをcancelし、reasonをlinkする。
5. result URLとartifact manifestをreleaseへ添付する。

### Manual device lab / HIL

Owner: Quality InfrastructureまたはHardware Lab

1. 原則24時間前までにscenario、device/rig ID、build SHA、operator、time window、
   firmware/peripheral/network、data classification、abort thresholdをrequestする。
2. lab ownerがexclusive lease IDとpreflight stateを割り当てるまで実行しない。
3. OS/firmware、battery、thermal、calibration、cable、network、fixture stateを
   run前に記録する。
4. safety、thermal、battery、privacy、fixture integrity alarmで即時stopし、
   escalation ownerへ通知する。testを通すためinterlockを無効化しない。
5. artifactをuploadし、credential/app dataを消し、cable/network/fixtureを戻し、
   leaseをreleaseする。no-show/延長/cancelも記録する。

各hardware scenarioはapplication ownerとreservation ownerの双方を持ちます。
application ownerはoracleとrelease判断、reservation ownerはdevice/rig safety、
lease、reset、capacityを所有します。

## CI lane

```text
PR:
  primary simulator/emulator + changed critical journey
nightly:
  minimum OS + constrained/offline + form-factor/tool pilot
release:
  usage/risk selected real-device matrix
hardware:
  approved reservation + operator/lease + abort threshold
```

- test retryでflakeを隠さない。first-attempt failureをmetricへ送る。
- device unavailable、provider outage、lab safety abortはproduct failureと別分類する。
- infrastructure retryにも新しいattempt IDを付け、元failure artifactを保持する。
- device catalog、supported OS、usage、incidentを少なくとも四半期ごとにreviewする。

## Nixで固定する範囲

このhandbookにはmobile/desktop/game application binaryがないため、Appium driver、
Detox native test build、Xcode project、Android SDK image、Poco SDKを架空にinstall
しません。代わりに、reference matrixとvalidatorをrepositoryに持ち、Nixが供給する
Nodeでplan contractを検証します。

```bash
nix develop --command make verify-device-matrix
# 任意のcopyを検証
nix develop --command node scripts/verify-device-matrix.mjs path/to/plan.json
```

実application repositoryでは次を同じchangeでpinします。

- Appium server/client/driver/plugin
- Detox/Cavy npm lock、React Native version、Jest/runner
- Gradle、Android SDK/system image、Espresso、device profile
- Flutter SDKと`integration_test`
- Airtest/Poco Python lock、Poco SDK/engine build
- artifact collector、schema、retention policy

NixだけではXcode/iOS Simulatorのlicensed macOS runtime、Apple signing、physical
device、device-farm credential/capacity、USB/peripheral driver、HIL fixtureを作れません。
これらはhost/external runtimeとして明示し、Xcode/OS/device/driver/firmware/rig/
calibration/provider matrix IDをartifact metadataへ記録します。repository内の
plan validationをskipする理由にはしません。

validatorは次を拒否します。

- Appium 3、Detox、XCUITest/EarlGrey、Espresso、Airtest/Poco、Cavy、
  Flutter `integration_test`の評価漏れ
- WebDriver、gray-box、image recognition、hierarchy inspectionの分類漏れ
- `emulation`をautomation mechanismとして扱うこと
- simulator/emulator/real-device/HILのsubstrate漏れ
- full Cartesian product、未coverのdeclared dimension value
- real device/HILのowner、予約手順、artifact/video/device log漏れ
- video非対応時のfallback、retention、redaction漏れ

## Primary references

- [Appium: How Does Appium Work?](https://appium.io/docs/en/latest/intro/appium/)
- [Appium drivers](https://appium.io/docs/en/latest/ecosystem/drivers/)
- [Appium CLI: server, driver, plugin, setup](https://appium.io/docs/en/latest/reference/cli/)
- [Detox: How Detox Works](https://wix.github.io/Detox/docs/articles/how-detox-works/)
- [Detox artifacts](https://wix.github.io/Detox/docs/config/artifacts/)
- [Detox project setup and devices](https://wix.github.io/Detox/docs/introduction/project-setup/)
- [Apple: Testing in Xcode](https://developer.apple.com/documentation/xcode/testing)
- [Apple: Running tests and interpreting results](https://developer.apple.com/documentation/xcode/running-tests-and-interpreting-results)
- [Apple: Activities and attachments](https://developer.apple.com/documentation/xctest/activities-and-attachments)
- [EarlGrey 2](https://github.com/google/EarlGrey/tree/earlgrey2)
- [Android Espresso](https://developer.android.com/training/testing/espresso)
- [Android build-managed devices](https://developer.android.com/studio/test/managed-devices)
- [Airtest/Poco official documentation](https://airtest.doc.io.netease.com/en/)
- [Cavy documentation](https://cavy.app/docs/getting-started/running-tests)
- [Flutter integration tests](https://docs.flutter.dev/testing/integration-tests)
- [Firebase Test Lab](https://firebase.google.com/docs/test-lab)
- [Firebase Test Lab Android results](https://firebase.google.com/docs/test-lab/android/get-started)
- [Firebase Test Lab iOS device availability](https://firebase.google.com/docs/test-lab/ios/available-testing-devices)
