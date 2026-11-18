import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (p: string) => Bun.file(resolve(root, p)).json();
const hash = async (p: string) =>
  new Bun.CryptoHasher('sha256')
    .update(await Bun.file(resolve(root, p)).arrayBuffer())
    .digest('hex');
const approved = await read(
  'docs/implementation/m4/motion-review-evidence.json',
);
const receipt = await read('docs/implementation/m4/motion-review-receipt.json');
if ((await hash(receipt.evidence.path)) !== receipt.evidence.sha256)
  throw Error('Approved packet changed');
const packed = await read('.artifacts/m4/packed-report.json');
if (JSON.stringify(packed.artifacts) !== JSON.stringify(approved.artifacts))
  throw Error('Not the approved pair');
for (const [p, h] of Object.entries(approved.sourceArchive))
  if (p.startsWith('packages/') && (await hash(p)) !== h)
    throw Error(`Approved package source changed: ${p}`);
for (const a of Object.values(packed.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(a.path)) !== a.sha256) throw Error('Package changed');
const archive = `.artifacts/evidence-runs/m4-feature-freeze-${packed.artifacts.core.sha256.slice(0, 12)}-${Date.now()}`;
const files: Record<string, string> = {},
  artifacts: Record<string, string> = {};
const inputs = new Set<string>();
for (const directory of [
  'packages/core',
  'packages/react',
  'tests',
  'examples',
  'scripts',
  'prototypes/m4-owner-review',
  'docs/planning',
])
  for await (const name of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (
      name
        .split('/')
        .some((p) => ['node_modules', '.turbo', '.next'].includes(p)) ||
      /\.(tgz|log)$/.test(name)
    )
      continue;
    inputs.add(`${directory}/${name}`);
  }
for (const path of [
  'AGENTS.md',
  'GLOSSARY.md',
  'README.md',
  'docs/roadmap.md',
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'turbo.json',
  'biome.json',
  '.changeset/config.json',
  'docs/implementation/m4/api-coverage.json',
  'docs/implementation/m4/api-reference.md',
  'docs/implementation/m4/final-review-matrix.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  'docs/implementation/m4/feature-freeze.md',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/owner-motion-review.md',
  'docs/implementation/m4/motion-review-evidence.json',
  'docs/implementation/m4/motion-review-receipt.json',
  'docs/implementation/m2/catalog-trace-manifest.json',
  'docs/implementation/m2/closure-checklist.md',
])
  inputs.add(path);
for await (const path of new Bun.Glob('playwright*.config.ts').scan({
  cwd: root,
  onlyFiles: true,
}))
  inputs.add(path);
async function copy(path: string, to: string, records: Record<string, string>) {
  const destination = resolve(root, archive, to);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, path), destination);
  records[to] = await hash(destination);
}
for (const path of [...inputs].sort()) await copy(path, path, files);
for (const [name, a] of Object.entries(packed.artifacts))
  await copy((a as { path: string }).path, `artifacts/${name}.tgz`, artifacts);
const packet = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  ownerDecision:
    'Current visual review approved; feature freeze approved; future improvements possible through subsequent review',
  ownerInstruction:
    "looks good, approve the visual review (for now, later maybe we'll improve something else), and feature freeze. record it, update the map, and let's return to size and performance optimization. keep M2 open, renderers provisional and npm publishing disabled.",
  archive,
  artifacts: packed.artifacts,
  approvedEvidence: {
    path: receipt.evidence.path,
    sha256: receipt.evidence.sha256,
    archive: approved.archive,
  },
  frozenFiles: files,
  artifactFiles: artifacts,
  publicBoundary: approved.publicBoundary,
  scopedChecks: {
    browserPasses: 597,
    nativeUnits: 69,
    reactUnits: 7,
    harness: 24,
    scope:
      'Original exact motion-review packet; no fresh environment/full-clause qualification inferred',
  },
  sizePolicy:
    'All original ceilings, accepted growth baselines and outstanding flags unchanged; feature comparison baseline only',
  existingHolds: {
    sizeGroups: 16,
    growthFlags: 52,
    ssrNumericPass: false,
    referenceManualPhysical: 'unverified or held per original packets',
  },
  gates: {
    ownerVisualReview: 'approved-current-pair',
    featureFreeze: true,
    m2: 'OPEN',
    m4: 'OPEN',
    renderers: 'provisional',
    npmPublishing: 'disabled',
    repository: 'PRIVATE',
    milestoneAcceptance: false,
  },
  next: 'Fresh frozen-pair full local sampling and measured size/SSR optimization; compare candidates without weakening approved API/behavior/accessibility',
};
await mkdir(resolve(root, archive), { recursive: true });
const text = `${JSON.stringify(packet, null, 2)}\n`;
await writeFile(resolve(root, archive, 'freeze.json'), text);
await writeFile(
  resolve(root, 'docs/implementation/m4/feature-freeze.json'),
  text,
);
console.log(
  JSON.stringify(
    {
      archive,
      records: Object.keys(files).length + Object.keys(artifacts).length,
      artifacts: packed.artifacts,
    },
    null,
    2,
  ),
);
