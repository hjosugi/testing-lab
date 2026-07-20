import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_PLAN = new URL(
  '../templates/device-test-matrix.example.json',
  import.meta.url,
);
const REQUIRED_DIMENSIONS = [
  'os',
  'deviceClass',
  'input',
  'network',
];
const REQUIRED_LANES = [
  'pr',
  'nightly',
  'release',
  'hardware',
];
const REQUIRED_SUBSTRATES = [
  'simulator',
  'emulator',
  'real-device',
  'hil',
];
const KNOWN_MECHANISMS = new Set([
  'webdriver',
  'native-ui',
  'gray-box',
  'in-app-hooks',
  'image-recognition',
  'hierarchy-inspection',
  'hardware-protocol',
]);
const REQUIRED_MECHANISMS = [
  'webdriver',
  'gray-box',
  'image-recognition',
  'hierarchy-inspection',
];
const REQUIRED_TOOLS = [
  'Appium 3',
  'Detox',
  'XCUITest',
  'EarlGrey 2',
  'Espresso',
  'Airtest',
  'Poco',
  'Cavy',
  'Flutter integration_test',
];
const REQUIRED_DEVICE_ARTIFACTS = [
  'result',
  'runner-log',
  'device-log',
  'device-metadata',
  'screenshot',
  'video',
];

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`device matrix: ${message}`);
  }
}

function isRecord(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value);
}

function requireRecord(value, name) {
  invariant(isRecord(value), `${name} must be an object`);
  return value;
}

function requireString(value, name) {
  invariant(
    typeof value === 'string' && value.trim() !== '',
    `${name} must be a non-empty string`,
  );
  return value;
}

function requirePositiveInteger(value, name) {
  invariant(
    Number.isSafeInteger(value) && value > 0,
    `${name} must be a positive safe integer`,
  );
  return value;
}

function requireStringArray(value, name, { allowEmpty = false } = {}) {
  invariant(Array.isArray(value), `${name} must be an array`);
  invariant(allowEmpty || value.length > 0, `${name} must not be empty`);
  for (const [index, item] of value.entries()) {
    requireString(item, `${name}[${index}]`);
  }
  invariant(
    new Set(value).size === value.length,
    `${name} must not contain duplicates`,
  );
  return value;
}

function requireReference(value, collection, name) {
  requireString(value, name);
  invariant(
    Object.hasOwn(collection, value),
    `${name} references unknown value "${value}"`,
  );
  return value;
}

function artifactSet(profile, name) {
  const artifactProfile = requireRecord(profile, name);
  const always = requireStringArray(
    artifactProfile.always,
    `${name}.always`,
  );
  const onFailure = requireStringArray(
    artifactProfile.onFailure,
    `${name}.onFailure`,
  );
  return new Set([...always, ...onFailure]);
}

export function validateDeviceMatrix(plan) {
  requireRecord(plan, 'plan');
  invariant(plan.schemaVersion === 1, 'schemaVersion must be 1');
  requireString(plan.planId, 'planId');
  invariant(
    /^\d{4}-\d{2}-\d{2}$/.test(plan.asOf),
    'asOf must use YYYY-MM-DD',
  );
  invariant(
    /^\d{4}-\d{2}-\d{2}$/.test(plan.reviewBy),
    'reviewBy must use YYYY-MM-DD',
  );
  invariant(
    plan.reviewBy >= plan.asOf,
    'reviewBy must not be earlier than asOf',
  );

  const owners = requireRecord(plan.owners, 'owners');
  invariant(Object.keys(owners).length > 0, 'owners must not be empty');
  for (const [ownerId, owner] of Object.entries(owners)) {
    requireRecord(owner, `owners.${ownerId}`);
    requireString(owner.primary, `owners.${ownerId}.primary`);
    requireString(owner.escalation, `owners.${ownerId}.escalation`);
  }

  const dimensions = requireRecord(plan.dimensions, 'dimensions');
  let cartesianCells = 1;
  for (const dimension of REQUIRED_DIMENSIONS) {
    const values = requireStringArray(
      dimensions[dimension],
      `dimensions.${dimension}`,
    );
    cartesianCells *= values.length;
    invariant(
      Number.isSafeInteger(cartesianCells),
      'Cartesian matrix size must be a safe integer',
    );
  }

  const lanes = requireRecord(plan.lanes, 'lanes');
  for (const laneName of REQUIRED_LANES) {
    const lane = requireRecord(lanes[laneName], `lanes.${laneName}`);
    requireString(lane.trigger, `lanes.${laneName}.trigger`);
    requirePositiveInteger(
      lane.budgetMinutes,
      `lanes.${laneName}.budgetMinutes`,
    );
  }

  invariant(
    Array.isArray(plan.toolEvaluations),
    'toolEvaluations must be an array',
  );
  const toolNames = new Set();
  const evaluatedMechanisms = new Set();
  for (const [index, evaluation] of plan.toolEvaluations.entries()) {
    requireRecord(evaluation, `toolEvaluations[${index}]`);
    const name = requireString(
      evaluation.name,
      `toolEvaluations[${index}].name`,
    );
    invariant(!toolNames.has(name), `tool evaluation is duplicated: ${name}`);
    toolNames.add(name);
    requireStringArray(
      evaluation.surfaces,
      `toolEvaluations[${index}].surfaces`,
    );
    const mechanisms = requireStringArray(
      evaluation.mechanisms,
      `toolEvaluations[${index}].mechanisms`,
    );
    for (const mechanism of mechanisms) {
      invariant(
        mechanism !== 'emulation',
        'emulation is a substrate, not an automation mechanism',
      );
      invariant(
        KNOWN_MECHANISMS.has(mechanism),
        `${name} has unknown mechanism "${mechanism}"`,
      );
      evaluatedMechanisms.add(mechanism);
    }
    requireString(
      evaluation.decision,
      `toolEvaluations[${index}].decision`,
    );
    requireStringArray(
      evaluation.limitations,
      `toolEvaluations[${index}].limitations`,
    );
  }
  for (const tool of REQUIRED_TOOLS) {
    invariant(toolNames.has(tool), `missing tool evaluation: ${tool}`);
  }
  for (const mechanism of REQUIRED_MECHANISMS) {
    invariant(
      evaluatedMechanisms.has(mechanism),
      `missing mechanism evaluation: ${mechanism}`,
    );
  }

  const artifactPolicy = requireRecord(
    plan.artifactPolicy,
    'artifactPolicy',
  );
  const profiles = requireRecord(
    artifactPolicy.profiles,
    'artifactPolicy.profiles',
  );
  const profileArtifacts = new Map();
  for (const [profileName, profile] of Object.entries(profiles)) {
    profileArtifacts.set(
      profileName,
      artifactSet(profile, `artifactPolicy.profiles.${profileName}`),
    );
  }
  const deviceFarmArtifacts = profileArtifacts.get('device-farm');
  invariant(
    deviceFarmArtifacts !== undefined,
    'artifactPolicy must define a device-farm profile',
  );
  for (const artifact of REQUIRED_DEVICE_ARTIFACTS) {
    invariant(
      deviceFarmArtifacts.has(artifact),
      `device-farm profile must retain ${artifact}`,
    );
  }
  const pathTemplate = requireString(
    artifactPolicy.pathTemplate,
    'artifactPolicy.pathTemplate',
  );
  for (const placeholder of ['{runId}', '{scenarioId}', '{attempt}']) {
    invariant(
      pathTemplate.includes(placeholder),
      `artifact pathTemplate must include ${placeholder}`,
    );
  }
  const retentionDays = requireRecord(
    artifactPolicy.retentionDays,
    'artifactPolicy.retentionDays',
  );
  for (const className of ['passed', 'failed', 'release']) {
    requirePositiveInteger(
      retentionDays[className],
      `artifactPolicy.retentionDays.${className}`,
    );
  }
  invariant(
    retentionDays.failed >= retentionDays.passed,
    'failed artifacts must live at least as long as passed artifacts',
  );
  invariant(
    retentionDays.release >= retentionDays.failed,
    'release artifacts must live at least as long as failed artifacts',
  );
  requireStringArray(artifactPolicy.redaction, 'artifactPolicy.redaction');
  requireString(
    artifactPolicy.unsupportedVideoFallback,
    'artifactPolicy.unsupportedVideoFallback',
  );

  const reservationProcedures = requireRecord(
    plan.reservationProcedures,
    'reservationProcedures',
  );
  invariant(
    Object.keys(reservationProcedures).length > 0,
    'reservationProcedures must not be empty',
  );
  for (const [procedureId, procedure] of Object.entries(
    reservationProcedures,
  )) {
    requireRecord(procedure, `reservationProcedures.${procedureId}`);
    requireReference(
      procedure.owner,
      owners,
      `reservationProcedures.${procedureId}.owner`,
    );
    requirePositiveInteger(
      procedure.leadTimeHours,
      `reservationProcedures.${procedureId}.leadTimeHours`,
    );
    const steps = requireStringArray(
      procedure.steps,
      `reservationProcedures.${procedureId}.steps`,
    );
    invariant(
      steps.length >= 4,
      `reservation procedure ${procedureId} needs at least four steps`,
    );
  }

  invariant(Array.isArray(plan.scenarios), 'scenarios must be an array');
  invariant(plan.scenarios.length > 0, 'scenarios must not be empty');
  invariant(
    plan.scenarios.length < cartesianCells,
    'selected scenarios must reduce the Cartesian matrix',
  );

  const scenarioIds = new Set();
  const selectedSubstrates = new Set();
  const selectedMechanisms = new Set();
  const selectedTools = new Set();
  const selectedReservationProcedures = new Set();
  const coveredDimensionValues = Object.fromEntries(
    REQUIRED_DIMENSIONS.map(dimension => [dimension, new Set()]),
  );
  let hardwareScenarioCount = 0;

  for (const [index, scenario] of plan.scenarios.entries()) {
    const prefix = `scenarios[${index}]`;
    requireRecord(scenario, prefix);
    const scenarioId = requireString(scenario.id, `${prefix}.id`);
    invariant(
      !scenarioIds.has(scenarioId),
      `scenario id is duplicated: ${scenarioId}`,
    );
    scenarioIds.add(scenarioId);
    requireReference(scenario.lane, lanes, `${prefix}.lane`);
    requireString(scenario.surface, `${prefix}.surface`);
    const tools = requireStringArray(
      scenario.tools,
      `${prefix}.tools`,
      { allowEmpty: true },
    );
    for (const tool of tools) {
      invariant(toolNames.has(tool), `${scenarioId} uses unknown tool ${tool}`);
      selectedTools.add(tool);
    }
    const mechanisms = requireStringArray(
      scenario.mechanisms,
      `${prefix}.mechanisms`,
    );
    for (const mechanism of mechanisms) {
      invariant(
        mechanism !== 'emulation',
        `${scenarioId} treats emulation as an automation mechanism`,
      );
      invariant(
        KNOWN_MECHANISMS.has(mechanism),
        `${scenarioId} has unknown mechanism ${mechanism}`,
      );
      selectedMechanisms.add(mechanism);
    }
    const substrate = requireString(
      scenario.substrate,
      `${prefix}.substrate`,
    );
    invariant(
      REQUIRED_SUBSTRATES.includes(substrate),
      `${scenarioId} has unknown substrate ${substrate}`,
    );
    selectedSubstrates.add(substrate);
    if (substrate !== 'hil') {
      invariant(tools.length > 0, `${scenarioId} must select a UI tool`);
    }

    const environment = requireRecord(
      scenario.environment,
      `${prefix}.environment`,
    );
    for (const dimension of REQUIRED_DIMENSIONS) {
      const value = requireString(
        environment[dimension],
        `${prefix}.environment.${dimension}`,
      );
      invariant(
        dimensions[dimension].includes(value),
        `${scenarioId} uses unknown ${dimension} value ${value}`,
      );
      coveredDimensionValues[dimension].add(value);
    }
    requireStringArray(scenario.risks, `${prefix}.risks`);
    requireReference(scenario.owner, owners, `${prefix}.owner`);
    const artifactProfile = requireReference(
      scenario.artifactProfile,
      profiles,
      `${prefix}.artifactProfile`,
    );
    invariant(
      typeof scenario.hardwareRequired === 'boolean',
      `${prefix}.hardwareRequired must be boolean`,
    );

    const needsHardware = substrate === 'real-device' || substrate === 'hil';
    invariant(
      scenario.hardwareRequired === needsHardware,
      `${scenarioId} hardwareRequired must match substrate ${substrate}`,
    );
    if (needsHardware) {
      hardwareScenarioCount += 1;
      const reservationProcedure = requireReference(
        scenario.reservationProcedure,
        reservationProcedures,
        `${prefix}.reservationProcedure`,
      );
      selectedReservationProcedures.add(reservationProcedure);
      const artifacts = profileArtifacts.get(artifactProfile);
      for (const artifact of REQUIRED_DEVICE_ARTIFACTS) {
        invariant(
          artifacts.has(artifact),
          `${scenarioId} hardware profile must retain ${artifact}`,
        );
      }
    } else {
      invariant(
        scenario.reservationProcedure === undefined,
        `${scenarioId} must not reserve hardware for ${substrate}`,
      );
    }
  }

  for (const substrate of REQUIRED_SUBSTRATES) {
    invariant(
      selectedSubstrates.has(substrate),
      `missing execution substrate: ${substrate}`,
    );
  }
  for (const mechanism of REQUIRED_MECHANISMS) {
    invariant(
      selectedMechanisms.has(mechanism),
      `no selected scenario exercises ${mechanism}`,
    );
  }
  for (const tool of REQUIRED_TOOLS) {
    invariant(
      selectedTools.has(tool),
      `no selected scenario exercises evaluated tool ${tool}`,
    );
  }
  for (const dimension of REQUIRED_DIMENSIONS) {
    for (const value of dimensions[dimension]) {
      invariant(
        coveredDimensionValues[dimension].has(value),
        `selected scenarios never cover ${dimension}=${value}`,
      );
    }
  }
  invariant(
    hardwareScenarioCount > 0,
    'at least one owned and reserved hardware scenario is required',
  );
  invariant(
    selectedReservationProcedures.has('device-farm-queue'),
    'at least one hardware scenario must exercise the device-farm queue',
  );

  return {
    cartesianCells,
    selectedScenarios: plan.scenarios.length,
    evaluatedTools: toolNames.size,
    hardwareScenarios: hardwareScenarioCount,
  };
}

const input = process.argv[2] === undefined
  ? DEFAULT_PLAN
  : resolve(process.cwd(), process.argv[2]);
const plan = JSON.parse(await readFile(input, 'utf8'));
const summary = validateDeviceMatrix(plan);

console.log(
  'device matrix:'
  + ` ${summary.selectedScenarios}/${summary.cartesianCells} selected cells,`
  + ` ${summary.evaluatedTools} tool decisions,`
  + ` ${REQUIRED_SUBSTRATES.length} substrates,`
  + ` ${summary.hardwareScenarios} owned hardware scenarios`,
);
