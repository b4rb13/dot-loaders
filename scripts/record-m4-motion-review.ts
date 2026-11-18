import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..');
const prefix = '.artifacts/m4-motion-review';
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  new Bun.CryptoHasher('sha256')
    .update(await Bun.file(resolve(root, path)).arrayBuffer())
    .digest('hex');
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const previous = await read(
  'docs/implementation/m4/text-variants-evidence.json',
);
const packed = await read('.artifacts/m4/packed-report.json');
type Artifact = { path: string; sha256: string };
for (const artifact of Object.values(packed.artifacts) as Artifact[])
  if ((await hash(artifact.path)) !== artifact.sha256)
    throw Error('Artifact changed');
const inputs = new Set<string>();
const changedProduction = [];
for (const directory of ['packages/core', 'packages/react'])
  for await (const name of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (
      name.split('/').some((p) => ['node_modules', '.turbo'].includes(p)) ||
      /\.(tgz|log)$/.test(name)
    )
      continue;
    const path = `${directory}/${name}`;
    inputs.add(path);
    if (
      name.startsWith('src/') &&
      (await hash(path)) !== previous.sourceArchive[path]
    )
      changedProduction.push(path);
    if (name.startsWith('dist/')) {
      const pkg = directory.endsWith('core') ? 'core' : 'react';
      if (
        (await hash(path)) !==
        (await hash(
          resolve(
            packed.consumer,
            `node_modules/@dotquilt-internal/${pkg}`,
            name,
          ),
        ))
      )
        throw Error(`Installed mismatch ${path}`);
    }
  }
if (
  !same(changedProduction.sort(), [
    'packages/core/src/chart.ts',
    'packages/core/src/internal/chart-idle.ts',
  ])
)
  throw Error('Unexpected production changes');
const policyChecks = [];
for (const path of [
  'packages/core/package.json',
  'packages/react/package.json',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  'docs/implementation/m4/requirement-review.json',
]) {
  const expected = previous.policyChecks.find(
    (row: { path: string }) => row.path === path,
  )?.sha256;
  if (!expected || (await hash(path)) !== expected)
    throw Error(`Policy changed ${path}`);
  policyChecks.push({ path, sha256: expected });
}
const index = await read('.artifacts/m4-api/coverage-report.json');
if (
  index.status !== 'index-integrity-pass' ||
  index.entries.length !== 42 ||
  index.sourceBlocksRetained !== 717 ||
  !same(index.entries, previous.index.entries)
)
  throw Error('API/declarations changed');
const declarations = new Map<string, string>();
for (const row of index.entries)
  if (row.declaration) {
    if ((await hash(row.declaration)) !== row.sha256)
      throw Error('Public declaration changed');
    declarations.set(row.declaration, row.sha256);
  }
if (declarations.size !== 22) throw Error('Declaration inventory changed');
const registry = await read('docs/implementation/m4/api-coverage.json');
const oldRegistry = await read(
  `${previous.archive}/docs/implementation/m4/api-coverage.json`,
);
if (!same(registry, oldRegistry)) throw Error('Coverage register changed');
const browsers = [];
for (const [name, path] of [
  ['motion', `${prefix}/current/browser-results.json`],
  ['catalog', `${prefix}/catalog-browser-results.json`],
  ['table', `${prefix}/table-browser-results.json`],
  ['shared', `${prefix}/shared-browser-results.json`],
] as const) {
  const report = await read(path),
    stats = report.stats;
  if (
    !stats.expected ||
    stats.unexpected ||
    stats.flaky ||
    stats.skipped ||
    !same(report.config.metadata.artifacts, packed.artifacts)
  )
    throw Error(`Browser scope failed ${name}`);
  if (name === 'motion' && stats.expected !== 42)
    throw Error('Motion inventory changed');
  browsers.push({
    name,
    path,
    passes: stats.expected,
    skips: stats.skipped,
    flaky: stats.flaky,
    sha256: await hash(path),
  });
}
const jobs = await read(`${prefix}/jobs.json`);
if (
  jobs.length !== 13 ||
  jobs.some((j: { code: number; expected: number }) => j.code !== j.expected)
)
  throw Error('Verification job failed');
const browserJobs = await read(`${prefix}/browser-jobs.json`);
if (
  browserJobs.length !== 4 ||
  browserJobs.some((j: { code: number }) => j.code)
)
  throw Error('Browser execution failed');
const boundary = await read('.artifacts/m4-final-api/boundaries.json');
if (boundary.status !== 'pass' || !same(boundary.artifacts, packed.artifacts))
  throw Error('Boundary failed');
const ssr = await read('.artifacts/m4-react-catalog/ssr.json');
const clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  !ssr.functionalPass ||
  ssr.numericPass ||
  clean.result !== 'pass' ||
  Object.entries(packed.artifacts).some(
    ([name, a]) =>
      ssr.artifacts[name] !== (a as Artifact).sha256 ||
      clean.reproducedTarballSha256[name] !== (a as Artifact).sha256,
  )
)
  throw Error('SSR/clean mismatch');
const size = await read('.artifacts/m4/size-regressions.json');
if (
  !same(size.hardFailures, previous.sizes.hardFailures) ||
  size.regressions.length !== 52
)
  throw Error('Size holds changed');
const oldPacked = await read(
  `${previous.archive}/.artifacts/m4/packed-report.json`,
);
const defaultChanges = [],
  newPassingModeFailures = [];
for (const [entry, value] of Object.entries(packed.sizes)) {
  const next = value as Record<string, number>,
    before = oldPacked.sizes[entry];
  for (const mode of ['gzip', 'external', 'increment', 'externalIncrement']) {
    if (typeof next[mode] !== 'number' || typeof before?.[mode] !== 'number')
      continue;
    if (next[mode] !== before[mode])
      defaultChanges.push({
        entry,
        mode,
        before: before[mode],
        after: next[mode],
        delta: next[mode] - before[mode],
      });
    const limit = mode.includes('ncrement') ? next.incrementLimit : next.limit;
    if (
      typeof limit === 'number' &&
      before[mode] <= limit &&
      next[mode] > limit
    )
      newPassingModeFailures.push({
        entry,
        mode,
        limit,
        before: before[mode],
        after: next[mode],
      });
  }
}
if (newPassingModeFailures.length) throw Error('New mode failure');
const closures: Record<string, unknown> = {};
for (const family of ['text', 'chart', 'table']) {
  const result = await read(`.artifacts/m4/${family}-animation-closures.json`);
  if (!same(result.artifacts, packed.artifacts))
    throw Error('Closure mismatch');
  closures[family] = result.sizes;
}
const controls = await read(`${prefix}/controls.json`);
if (
  controls.repository.visibility !== 'PRIVATE' ||
  controls.m2.state !== 'OPEN' ||
  controls.m4.state !== 'OPEN'
)
  throw Error('Control state changed');
for (const name of ['core', 'react']) {
  const pkg = await read(`packages/${name}/package.json`);
  if (
    !pkg.private ||
    !pkg.scripts.prepublishOnly.includes('npm publishing is disabled')
  )
    throw Error('Publication guard changed');
}
const previousArchives = [];
async function verifyArchive(directory: string) {
  const old = await read(`${directory}/evidence.json`);
  const records = {
    ...(old.evidenceSha256 ?? {
      ...old.sourceArchive,
      ...old.nextBuildFiles,
      ...old.consumerFiles,
    }),
    ...old.artifactFiles,
  };
  for (const [path, sha] of Object.entries(records))
    if (
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      (await hash(`${directory}/${path}`)) !== sha
    )
      throw Error(`History changed ${directory}/${path}`);
  return { directory, records: Object.keys(records).length };
}
for (const directory of [
  ...previous.previousArchives.map(
    (row: { directory: string }) => row.directory,
  ),
  previous.archive,
])
  previousArchives.push(await verifyArchive(directory));
for (const row of previous.supplementalArchives) {
  if ((await hash(`${row.archive}/manifest.json`)) !== row.manifestSha256)
    throw Error('Diagnostic manifest changed');
  for (const [path, sha] of Object.entries(
    (await read(`${row.archive}/manifest.json`)).files,
  ))
    if ((await hash(`${row.archive}/${path}`)) !== sha)
      throw Error('Diagnostic changed');
}
const receipt = await read('docs/implementation/m4/text-variants-receipt.json');
const supersededSeals = [];
for (const directory of [
  previous.supersededSeal.directory,
  receipt.supersededCollectorSeal.archive,
])
  supersededSeals.push(await verifyArchive(directory));
const versions = [];
for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  try {
    versions.push({ engine: type.name(), version: browser.version() });
  } finally {
    await browser.close();
  }
}
for (const directory of [
  'scripts',
  'tests/m4',
  'tests/table',
  'tests/shared-wrapper',
  'tests/motion-review',
  'examples/api',
  'prototypes/m4-owner-review',
  prefix,
  '.artifacts/m4-shared-wrapper',
  '.artifacts/m4/test-results',
  '.artifacts/m4/table-results',
  '.artifacts/m4-react-catalog',
]) {
  for await (const name of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (name.split('/').some((p) => ['node_modules', '.turbo'].includes(p)))
      continue;
    inputs.add(`${directory}/${name}`);
  }
}
for (const path of [
  'AGENTS.md',
  'docs/roadmap.md',
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'biome.json',
  '.changeset/config.json',
  '.changeset/m4-chart-cycle-pointer.md',
  'playwright.motion-review.config.ts',
  'playwright.m4.config.ts',
  'playwright.table.config.ts',
  'playwright.shared-wrapper.config.ts',
  'docs/implementation/m4/motion-review-progress.md',
  'docs/implementation/m4/owner-motion-review.md',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/api-coverage.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
  '.artifacts/m4/packed-report.json',
  '.artifacts/m4/size-regressions.json',
  '.artifacts/m4-api/coverage-report.json',
  '.artifacts/m4-final-api/boundaries.json',
  ...['text', 'chart', 'table'].map(
    (name) => `.artifacts/m4/${name}-animation-closures.json`,
  ),
  ...[
    'native',
    'react',
    'text',
    'text-react',
    'chart',
    'chart-react',
    'table',
    'table-react',
  ].map((name) => `.artifacts/m4/${name}.js`),
])
  inputs.add(path);
const archive = `.artifacts/evidence-runs/m4-motion-review-${packed.artifacts.core.sha256.slice(0, 12)}-${Date.now()}`;
const sourceArchive: Record<string, string> = {},
  artifactFiles: Record<string, string> = {};
async function copy(from: string, to: string, records: Record<string, string>) {
  const destination = resolve(root, archive, to);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, from), destination);
  records[to] = await hash(destination);
}
for (const path of [...inputs].sort()) await copy(path, path, sourceArchive);
for (const [name, a] of Object.entries(packed.artifacts))
  await copy((a as Artifact).path, `artifacts/${name}.tgz`, artifactFiles);
const packet = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  label: 'Cycle and pointer correction candidate; freeze pending',
  status:
    'Scoped motion defects corrected; owner quality disposition and explicit feature freeze pending',
  archive,
  artifacts: packed.artifacts,
  baseline: {
    packet: 'docs/implementation/m4/text-variants-evidence.json',
    artifacts: previous.artifacts,
  },
  changedProduction,
  policyChecks,
  publicBoundary: {
    entries: 42,
    declarations: 22,
    changedDeclarations: [],
    originalClausesRetained: 717,
    coverageRegisterUnchanged: true,
  },
  ownerFeedback:
    'Positive text-direction feedback; not blanket visual approval or explicit feature freeze.',
  browsers,
  browserPasses: browsers.reduce((n, r) => n + r.passes, 0),
  newBrowserCases: 42,
  normalSpeedBrowserCases: 15,
  deterministicMotionBrowserCases: 27,
  earlierCleanMotionPassesNotAdded: 42,
  unitCyclePhaseCells: 180,
  exactArchivedChartCommandCells: 288,
  environment: {
    bun: Bun.version,
    node: process.versions.node,
    browsers: versions,
  },
  jobs,
  browserJobs,
  boundary,
  ssr: { functionalPass: ssr.functionalPass, numericPass: ssr.numericPass },
  clean,
  sizes: {
    hardFailures: size.hardFailures,
    growthFlags: size.regressions.length,
    defaultChanges,
    newPassingModeFailures,
    optionalClosures: closures,
    baselines: 'unchanged; no owner growth approval inferred',
  },
  controls,
  previousArchives,
  supplementalArchives: previous.supplementalArchives,
  supersededSeals,
  sourceArchive,
  artifactFiles,
  gates: {
    m2: 'OPEN',
    m4: 'OPEN',
    renderers: 'provisional',
    npmPublishing: 'disabled',
    featureFreeze: false,
    ownerVisualReview: 'pending',
    remaining: previous.gates.remaining,
  },
  limitations: [
    'Scoped local engine evidence, not physical/reference/browser-floor/manual AT or full-clause qualification',
    'Normal-speed videos aid owner review; no aesthetic approval or timing qualification inferred',
    'All failed red, favicon/select-control diagnostics and orchestration attempts retained separately; not added to final pass totals',
    'Strict CSP unchanged; only exact automatic favicon excluded, unrelated fixture select controls absent from new API-driven motion tests',
    'No broad M2 sampling, M5, cloud transfer, publication, visibility change or deployment',
  ],
};
await mkdir(resolve(root, archive), { recursive: true });
const text = `${JSON.stringify(packet, null, 2)}\n`;
await writeFile(
  resolve(root, 'docs/implementation/m4/motion-review-evidence.json'),
  text,
);
await writeFile(resolve(root, archive, 'evidence.json'), text);
console.log(
  JSON.stringify(
    {
      archive,
      records:
        Object.keys(sourceArchive).length + Object.keys(artifactFiles).length,
      browserPasses: packet.browserPasses,
      previousRecords: previousArchives.reduce((n, r) => n + r.records, 0),
    },
    null,
    2,
  ),
);
