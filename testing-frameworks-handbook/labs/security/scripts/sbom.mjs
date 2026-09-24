#!/usr/bin/env node
// Writes CycloneDX SBOMs for the npm labs, checks integrity/provenance, and
// signs each SBOM digest with an ephemeral Ed25519 key whose public half is
// published next to it (CI artifact). Production would use a KMS or Sigstore
// keyless identity instead of an ephemeral key.
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { provenanceProblems, sbomFromLock, signSbom, verifySbom } from '../src/sbom.mjs';

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const handbookRoot = resolve(labRoot, '../..');
const out = join(labRoot, 'build', 'sbom');
mkdirSync(out, { recursive: true });
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
writeFileSync(join(out, 'signing-key.pub.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
let failed = false;
for (const project of ['labs/node', 'labs/advanced', 'labs/system']) {
  const sbom = sbomFromLock(JSON.parse(readFileSync(join(handbookRoot, project, 'package-lock.json'), 'utf8')), { name: project });
  const problems = provenanceProblems(sbom);
  const envelope = signSbom(sbom, privateKey);
  const file = project.replace('/', '-');
  writeFileSync(join(out, `${file}.cdx.json`), `${JSON.stringify(sbom, null, 2)}\n`);
  writeFileSync(join(out, `${file}.cdx.sig.json`), `${JSON.stringify(envelope, null, 2)}\n`);
  const verified = verifySbom(JSON.parse(readFileSync(join(out, `${file}.cdx.json`), 'utf8')), envelope, publicKey);
  console.log(`${project}: ${sbom.components.length} components, provenance problems ${problems.length}, signature ${verified ? 'verified' : 'FAILED'}`);
  for (const problem of problems) console.error(`  ${problem}`);
  failed ||= problems.length > 0 || !verified;
}
if (failed) process.exit(1);
