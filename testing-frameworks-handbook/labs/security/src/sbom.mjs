// Minimal CycloneDX 1.6 SBOM from an npm lockfile plus Ed25519 signing, so
// the lab can show "what did we ship" and "is this the SBOM we produced".
// npm's own registry signature/provenance check runs as `npm audit signatures`
// in the scheduled security workflow (it needs the registry).
import { createHash, sign, verify } from 'node:crypto';

export function sbomFromLock(lock, { name, version = '0.0.0' }) {
  const components = Object.entries(lock.packages)
    .filter(([path]) => path.startsWith('node_modules/'))
    .map(([path, entry]) => {
      const packageName = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
      const [algorithm, digest] = (entry.integrity ?? '').split('-');
      return {
        type: 'library',
        name: packageName,
        version: entry.version,
        purl: `pkg:npm/${packageName.replace('@', '%40')}@${entry.version}`,
        scope: entry.dev ? 'excluded' : 'required',
        hashes: digest ? [{ alg: algorithm.toUpperCase().replace('SHA', 'SHA-'), content: Buffer.from(digest, 'base64').toString('hex') }] : [],
        externalReferences: entry.resolved ? [{ type: 'distribution', url: entry.resolved }] : [],
      };
    })
    .sort((a, b) => a.purl.localeCompare(b.purl));
  return { bomFormat: 'CycloneDX', specVersion: '1.6', version: 1, metadata: { component: { type: 'application', name, version } }, components };
}

export function provenanceProblems(sbom, { allowedHosts = ['registry.npmjs.org'] } = {}) {
  const problems = [];
  for (const component of sbom.components) {
    if (component.hashes.length === 0 || !component.hashes.some(hash => hash.alg === 'SHA-512')) problems.push(`${component.purl}: no sha512 integrity`);
    const url = component.externalReferences[0]?.url;
    if (!url) problems.push(`${component.purl}: no resolved URL`);
    else if (!allowedHosts.includes(new URL(url).host)) problems.push(`${component.purl}: resolved from ${new URL(url).host}`);
  }
  return problems;
}

const canonical = value => JSON.stringify(value, Object.keys(value).sort());
export const digestOf = sbom => createHash('sha256').update(JSON.stringify(sbom)).digest('hex');

export function signSbom(sbom, privateKey) {
  const digest = digestOf(sbom);
  return { digest, signature: sign(null, Buffer.from(digest), privateKey).toString('base64') };
}

export function verifySbom(sbom, envelope, publicKey) {
  const digest = digestOf(sbom);
  return digest === envelope.digest && verify(null, Buffer.from(digest), publicKey, Buffer.from(envelope.signature, 'base64'));
}

export { canonical };
