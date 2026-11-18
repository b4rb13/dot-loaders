import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  new Bun.CryptoHasher('sha256')
    .update(await Bun.file(resolve(root, path)).arrayBuffer())
    .digest('hex');
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const previous = await read('docs/implementation/m4/final-api-evidence.json');
const packed = await read('.artifacts/m4/packed-report.json');
const prefix = '.artifacts/m4-text-variants';
type Artifact = { path: string; sha256: string };
for (const artifact of Object.values(packed.artifacts) as Artifact[])
  if ((await hash(artifact.path)) !== artifact.sha256)
    throw Error('Artifact changed');
const inputs = new Set<string>();
const changedProduction: string[] = [];
for (const directory of ['packages/core', 'packages/react'])
  for await (const name of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (
      name
        .split('/')
        .some((part) => ['node_modules', '.turbo'].includes(part)) ||
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
        throw Error(`Installed output differs ${path}`);
    }
  }
if (
  !same(changedProduction.sort(), [
    'packages/core/src/internal/text-definitions.ts',
    'packages/core/src/internal/text-scramble.ts',
    'packages/core/src/text-animations.ts',
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
  let expected = previous.sourceArchive[path];
  let packet = previous.archive;
  if (!expected) {
    for (const row of [...previous.previousArchives].reverse()) {
      const historical = await read(`${row.directory}/evidence.json`);
      expected = (historical.sourceArchive ?? historical.evidenceSha256)?.[
        path
      ];
      if (expected) {
        packet = row.directory;
        break;
      }
    }
  }
  if (!expected || (await hash(path)) !== expected)
    throw Error(`Policy/original statuses changed ${path}`);
  policyChecks.push({ path, archive: packet, sha256: expected });
}
const registry = await read('docs/implementation/m4/api-coverage.json');
const oldRegistry = await read(
  `${previous.archive}/docs/implementation/m4/api-coverage.json`,
);
if (!same(registry.clauses, oldRegistry.clauses))
  throw Error('Original clause mapping changed');
const index = await read('.artifacts/m4-api/coverage-report.json');
if (
  index.status !== 'index-integrity-pass' ||
  index.entries.length !== 42 ||
  index.sourceBlocksRetained !== 717
)
  throw Error('API index incomplete');
const declarationChanges: string[] = [];
for (const row of previous.publicDeclarations as {
  path: string;
  sha256: string;
}[])
  if ((await hash(row.path)) !== row.sha256) declarationChanges.push(row.path);
if (!same(declarationChanges, ['packages/core/dist/text-animations.d.ts']))
  throw Error('Unexpected public declaration change');
const key = 'core:./animations/text';
const oldExports = previous.apiReview.entries.find(
  (r: { key: string }) => r.key === key,
).exports as string[];
const newExports = index.entries.find((r: { key: string }) => r.key === key)
  .exports as string[];
if (
  oldExports.some((name) => !newExports.includes(name)) ||
  !same(newExports.filter((name) => !oldExports.includes(name)).sort(), [
    'scrambleCharacters',
    'scrambleWords',
  ])
)
  throw Error('Unexpected additive exports');
const browsers = [];
for (const [name, path, count] of [
  ['text', `${prefix}/text-browser-results.json`, 123],
  ['copies', `${prefix}/copies-browser-results.json`, 252],
  ['api', `${prefix}/api-browser-results.json`, 75],
  ['catalog', `${prefix}/catalog-browser-results.json`, 57],
] as const) {
  const report = await read(path),
    stats = report.stats;
  if (
    stats.expected !== count ||
    stats.unexpected ||
    stats.flaky ||
    stats.skipped ||
    !same(report.config.metadata.artifacts, packed.artifacts)
  )
    throw Error(`Browser scope failed ${name}`);
  browsers.push({
    name,
    path,
    passes: stats.expected,
    skips: stats.skipped,
    flaky: stats.flaky,
    sha256: await hash(path),
  });
}
const initial = await read(`${prefix}/api-initial/browser-results.json`);
if (initial.stats.expected !== 72 || initial.stats.unexpected !== 3)
  throw Error('Initial mismatch history changed');
const jobs = await read(`${prefix}/jobs.json`);
if (
  jobs.length !== 8 ||
  jobs.some((r: { code: number; expected: number }) => r.code !== r.expected)
)
  throw Error('Unexpected verification exit');
const boundary = await read('.artifacts/m4-final-api/boundaries.json');
if (boundary.status !== 'pass' || !same(boundary.artifacts, packed.artifacts))
  throw Error('Package boundary check changed');
const ssr = await read('.artifacts/m4-react-catalog/ssr.json');
if (
  Object.entries(packed.artifacts).some(
    ([name, artifact]) => ssr.artifacts[name] !== (artifact as Artifact).sha256,
  ) ||
  !ssr.functionalPass ||
  ssr.numericPass
)
  throw Error('Functional/numeric SSR status changed');
const clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  clean.result !== 'pass' ||
  Object.entries(packed.artifacts).some(
    ([name, value]) =>
      clean.reproducedTarballSha256[name] !== (value as Artifact).sha256,
  )
)
  throw Error('Clean reproduction failed');
const size = await read('.artifacts/m4/size-regressions.json');
if (
  !same(size.hardFailures, previous.sizes.hardFailures) ||
  size.regressions.length !== 52
)
  throw Error('Size holds changed; review actual results');
const oldPacked = await read(
  `${previous.archive}/.artifacts/m4/packed-report.json`,
);
const defaultChanges = [];
const newPassingModeFailures = [];
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
        before: before[mode],
        after: next[mode],
        limit,
      });
  }
}
if (newPassingModeFailures.length)
  throw Error('New passing-mode size failure needs explicit recording');
const closures = await read('.artifacts/m4/text-animation-closures.json');
const oldClosures = await read(
  `${previous.archive}/.artifacts/m4/text-animation-closures.json`,
);
if (!same(closures.artifacts, packed.artifacts))
  throw Error('Optional closure artifact mismatch');
const legacy = await read(`${prefix}/legacy-and-selective.json`);
if (
  !same(legacy.artifacts, packed.artifacts) ||
  legacy.synchronizedCommandCells !== 90 ||
  !legacy.exactLegacyCommands ||
  legacy.defaults.length !== 4
)
  throw Error('Legacy/selective comparison failed');
const controls = {
  repository: await read(`${prefix}/repository-control.json`),
  m2: await read(`${prefix}/m2-control.json`),
  m4: await read(`${prefix}/m4-control.json`),
};
if (
  controls.repository.visibility !== 'PRIVATE' ||
  controls.m2.state !== 'OPEN' ||
  controls.m4.state !== 'OPEN'
)
  throw Error('Control state changed');
for (const pkg of ['core', 'react']) {
  const manifest = await read(`packages/${pkg}/package.json`);
  if (
    !manifest.private ||
    !manifest.scripts.prepublishOnly.includes('npm publishing is disabled')
  )
    throw Error('Publishing guard changed');
}
const previousArchives = [];
for (const directory of [
  ...previous.previousArchives.map((r: { directory: string }) => r.directory),
  previous.archive,
]) {
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
      throw Error(`Historical record changed ${directory}/${path}`);
  previousArchives.push({ directory, records: Object.keys(records).length });
}
for (const row of previous.supplementalArchives) {
  if ((await hash(`${row.archive}/manifest.json`)) !== row.manifestSha256)
    throw Error('Diagnostic manifest changed');
  for (const [path, sha] of Object.entries(
    (await read(`${row.archive}/manifest.json`)).files,
  ))
    if ((await hash(`${row.archive}/${path}`)) !== sha)
      throw Error('Diagnostic record changed');
}
const supersededSeal = await read(
  'docs/implementation/m4/final-api-receipt.json',
);
const superseded = await read(
  `${supersededSeal.supersededSeal.archive}/evidence.json`,
);
const supersededRecords = {
  ...superseded.sourceArchive,
  ...superseded.consumerFiles,
  ...superseded.artifactFiles,
};
for (const [path, sha] of Object.entries(supersededRecords))
  if ((await hash(`${supersededSeal.supersededSeal.archive}/${path}`)) !== sha)
    throw Error('Superseded seal changed');
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
  'tests/copies',
  'tests/api',
  'examples/api',
  'prototypes/m4-owner-review',
  prefix,
  '.artifacts/m4-api',
  '.artifacts/m4-copies',
  '.artifacts/m4-shared-wrapper',
])
  for await (const name of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (
      name.split('/').some((part) => ['node_modules', '.turbo'].includes(part))
    )
      continue;
    inputs.add(`${directory}/${name}`);
  }
for (const path of [
  'AGENTS.md',
  'docs/roadmap.md',
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'biome.json',
  '.changeset/config.json',
  '.changeset/m4-text-cadence-variants.md',
  'playwright.m4.config.ts',
  'playwright.copies.config.ts',
  'playwright.api.config.ts',
  'docs/implementation/m4/text-variants-progress.md',
  'docs/implementation/m4/owner-motion-review.md',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/api-reference.md',
  'docs/implementation/m4/api-coverage.json',
  'docs/implementation/m4/final-review-matrix.json',
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
  '.artifacts/m4/text-animation-closures.json',
  '.artifacts/m4-react-catalog/ssr.json',
  '.artifacts/m4-final-api/boundaries.json',
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
const archive = `.artifacts/evidence-runs/m4-text-variants-${packed.artifacts.core.sha256.slice(0, 12)}-${Date.now()}`;
const sourceArchive: Record<string, string> = {},
  artifactFiles: Record<string, string> = {};
async function copy(from: string, to: string, records: Record<string, string>) {
  const destination = resolve(root, archive, to);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, from), destination);
  records[to] = await hash(destination);
}
for (const path of [...inputs].sort()) await copy(path, path, sourceArchive);
for (const [name, artifact] of Object.entries(packed.artifacts))
  await copy(
    (artifact as Artifact).path,
    `artifacts/${name}.tgz`,
    artifactFiles,
  );
const packet = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  label: 'text cadence candidate; owner review pending',
  status:
    'Two opt-in text idles implemented; visual approval, feature freeze and qualification pending',
  archive,
  artifacts: packed.artifacts,
  baseline: {
    packet: 'docs/implementation/m4/final-api-evidence.json',
    artifacts: previous.artifacts,
  },
  changedProduction,
  policyChecks,
  publicBoundary: {
    entries: 42,
    declarations: 22,
    changedDeclarations: declarationChanges,
    additiveExports: ['scrambleCharacters', 'scrambleWords'],
    otherPublicDeclarationsUnchanged: 21,
    originalClausesRetained: 717,
    originalMappedStatusesRetained: 136,
  },
  ownerFeedback:
    'Direction looks good, but owner unsure about final version and requested additional text variants. Not final visual approval.',
  browsers,
  browserPasses: browsers.reduce((sum, row) => sum + row.passes, 0),
  newBrowserCases: 54,
  environment: {
    bun: Bun.version,
    node: process.versions.node,
    browsers: versions,
  },
  jobs,
  boundary,
  index,
  ssr: { functionalPass: ssr.functionalPass, numericPass: ssr.numericPass },
  clean,
  sizes: {
    hardFailures: size.hardFailures,
    growthFlags: size.regressions.length,
    defaultChanges,
    newPassingModeFailures,
    optionalText: closures.sizes,
    previousOptionalText: oldClosures.sizes,
    baselines:
      'unchanged; no owner growth acceptance or ceiling amendment inferred',
  },
  legacy,
  controls,
  previousArchives,
  supplementalArchives: previous.supplementalArchives,
  supersededSeal: {
    directory: supersededSeal.supersededSeal.archive,
    records: Object.keys(supersededRecords).length,
  },
  sourceArchive,
  artifactFiles,
  gates: {
    m2: 'OPEN',
    m4: 'OPEN',
    renderers: 'provisional',
    npmPublishing: 'disabled',
    featureFreeze: false,
    ownerVisualReview: 'pending',
    remaining: [
      'All unchanged default/optional/adapter/SSR size and significant-growth holds',
      'M2 timing/init/setup/long-task/regression and equivalent renderer qualification',
      'Physical/reference/browser-floor/manual AT/OS/touch/forced-colors/zoom/flashing qualification',
      'Owner normal-speed review/corrections and explicit feature freeze before frozen qualification',
    ],
  },
  limitations: [
    'Scoped local functional evidence, not original full-clause or environment qualification',
    '54 new browser cases are included in 507 final passes, not added twice',
    'Initial API 72 passes/3 obsolete-inventory mismatches retained separately and not added to final total',
    'Intermediate successful text screenshot/video attachments were temporary outputs superseded by the catalog run; no media or owner visual qualification is claimed',
    'No M2 broad sampling, M5, publication, cloud/export, visibility change or deployment',
  ],
};
await mkdir(resolve(root, archive), { recursive: true });
const text = `${JSON.stringify(packet, null, 2)}\n`;
await writeFile(
  resolve(root, 'docs/implementation/m4/text-variants-evidence.json'),
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
      previousRecords: previousArchives.reduce((n, row) => n + row.records, 0),
    },
    null,
    2,
  ),
);
