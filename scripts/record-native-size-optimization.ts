import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..');
const prefix = '.artifacts/native-size-continuation';
const read = (p: string) => Bun.file(resolve(root, p)).json();
const hash = async (p: string) =>
  new Bun.CryptoHasher('sha256')
    .update(await Bun.file(resolve(root, p)).arrayBuffer())
    .digest('hex');
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const frozen = await read('docs/implementation/m4/feature-freeze.json');
const prior = await read('docs/implementation/m4/optimization-evidence.json');
const packed = await read('.artifacts/m4/packed-report.json');
for (const a of Object.values(packed.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(a.path)) !== a.sha256) throw Error('Artifact changed');
let frozenRecords = 0,
  priorRecords = 0,
  priorTraceRecords = 0;
for (const [p, h] of Object.entries({
  ...frozen.frozenFiles,
  ...frozen.artifactFiles,
})) {
  if ((await hash(`${frozen.archive}/${p}`)) !== h)
    throw Error(`Frozen record changed ${p}`);
  frozenRecords++;
}
for (const [p, h] of Object.entries({
  ...prior.sourceArchive,
  ...prior.artifactFiles,
})) {
  if ((await hash(`${prior.archive}/${p}`)) !== h)
    throw Error(`Prior record changed ${p}`);
  priorRecords++;
}
for (const [p, h] of Object.entries(prior.traceRecords)) {
  if ((await hash(p)) !== h) throw Error(`Prior trace changed ${p}`);
  priorTraceRecords++;
}
const inputs = new Set<string>(),
  changedProduction: string[] = [];
for (const directory of ['packages/core', 'packages/react'])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (
      file.split('/').some((p) => ['node_modules', '.turbo'].includes(p)) ||
      /\.(log|tgz)$/.test(file)
    )
      continue;
    const path = `${directory}/${file}`;
    inputs.add(path);
    if (
      file.endsWith('.css') &&
      (await hash(path)) !== frozen.frozenFiles[path]
    )
      throw Error('Frozen CSS changed');
    if (
      file.startsWith('src/') &&
      (await hash(path)) !== prior.sourceArchive[path]
    )
      changedProduction.push(path);
    if (file.startsWith('dist/')) {
      const pkg = directory.endsWith('core') ? 'core' : 'react';
      if (
        (await hash(path)) !==
        (await hash(
          `${packed.consumer}/node_modules/@dotquilt-internal/${pkg}/${file}`,
        ))
      )
        throw Error('Installed dist mismatch');
    }
  }
const expectedScope = [
  'chart',
  'internal/element',
  'internal/loading-controller',
  'internal/preset-data',
  'internal/preset',
  'skeleton-block',
  'table',
  'text',
  'typing',
]
  .map((p) => `packages/core/src/${p}.ts`)
  .sort();
if (!same(changedProduction.sort(), expectedScope))
  throw Error('Production scope changed');
const index = await read('.artifacts/m4-api/coverage-report.json');
const oldIndex = await read(
  `${prior.archive}/.artifacts/m4-api/coverage-report.json`,
);
if (
  index.status !== 'index-integrity-pass' ||
  index.sourceBlocksRetained !== 717 ||
  !same(index.entries, oldIndex.entries)
)
  throw Error('Public boundary changed');
for (const p of [
  'packages/core/package.json',
  'packages/react/package.json',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/api-coverage.json',
  'scripts/check-m4-budgets.ts',
  'scripts/verify-packed.ts',
  'scripts/prepare-m4.ts',
  'scripts/check-chart-options.ts',
  'scripts/check-table-options.ts',
  'scripts/measure-text-options.ts',
  'scripts/measure-chart-options.ts',
  'scripts/measure-table-options.ts',
])
  if ((await hash(p)) !== frozen.frozenFiles[p])
    throw Error(`Policy changed ${p}`);
const comparison = await read(`${prefix}/comparison.json`),
  preset = await read(`${prefix}/preset-comparison.json`),
  scope = await read(`${prefix}/runtime-scope.json`),
  stripping = await read(`${prefix}/stripping.json`);
if (
  comparison.htmlCells !== 2592 ||
  comparison.documents !== 24 ||
  preset.cells !== 1576 ||
  preset.kindCoercions !== 0 ||
  preset.publicDeclarations !== 22 ||
  scope.result !== 'pass' ||
  scope.rows.length !== 7 ||
  stripping.rows.length !== 10 ||
  stripping.result !== 'pass'
)
  throw Error('Differential check failed');
const ssr = await read('.artifacts/m4-react-catalog/ssr.json');
if (
  !ssr.functionalPass ||
  !ssr.numericPass ||
  ssr.rows.length !== 8 ||
  ssr.artifacts.core !== packed.artifacts.core.sha256 ||
  ssr.artifacts.react !== packed.artifacts.react.sha256
)
  throw Error('SSR mismatch');
const native = await read('.artifacts/packed-report.json'),
  adapter = await read('.artifacts/m3/packed-react-report.json'),
  clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  native.sha256 !== packed.artifacts.core.sha256 ||
  adapter.sha256 !== packed.artifacts.react.sha256 ||
  adapter.native.sha256 !== native.sha256 ||
  clean.result !== 'pass' ||
  Object.entries(packed.artifacts).some(
    ([name, a]) =>
      clean.reproducedTarballSha256[name] !== (a as { sha256: string }).sha256,
  )
)
  throw Error('Consumer or clean reproduction mismatch');
const browserPaths = [
  ['presets', '.artifacts/m4-presets/browser-results.json'],
  ['native', '.artifacts/browser-results.json'],
  ['react', '.artifacts/m3/browser-results.json'],
  ['catalog', '.artifacts/m4/browser-results.json'],
  ['table', '.artifacts/m4/table-results.json'],
  ['table-options', '.artifacts/m4/table-options-results.json'],
  ['copies', '.artifacts/m4-copies/browser-results.json'],
  ['shared', '.artifacts/m4-shared-wrapper/browser-results.json'],
  ['motion', '.artifacts/m4-motion-review/current/browser-results.json'],
] as const;
const browsers = [];
for (const [name, path] of browserPaths) {
  const report = await read(path),
    s = report.stats,
    m = report.config.metadata;
  if (s.unexpected || s.flaky || s.skipped !== (name === 'native' ? 2 : 0))
    throw Error(`Browser failure ${name}`);
  if (
    name === 'native'
      ? m.artifactSha256 !== native.sha256
      : name === 'react'
        ? m.nativeArtifactSha256 !== native.sha256 ||
          m.reactArtifactSha256 !== adapter.sha256
        : !same(m.artifacts, packed.artifacts)
  )
    throw Error(`Browser pair mismatch ${name}`);
  browsers.push({
    name,
    path,
    passes: s.expected,
    skips: s.skipped,
    flaky: s.flaky,
    unexpected: s.unexpected,
    sha256: await hash(path),
  });
  inputs.add(path);
}
const jobs = await read(`${prefix}/jobs.json`),
  browserJobs = await read(`${prefix}/browser-jobs.json`);
if (
  jobs.length !== 23 ||
  jobs.some((r: { code: number; expected: number }) => r.code !== r.expected) ||
  browserJobs.length !== 9 ||
  browserJobs.some((r: { code: number }) => r.code !== 0)
)
  throw Error('Check job failed');
const sizes = await read('.artifacts/m4/size-regressions.json');
if (
  !same(sizes.hardFailures, prior.sizes.hardFailures) ||
  sizes.regressions.length !== 52
)
  throw Error('Held default inventory changed');
const options = {} as Record<string, unknown>;
for (const family of ['text', 'chart', 'table']) {
  const path = `.artifacts/m4/${family}-animation-closures.json`,
    report = await read(path);
  if (!same(report.artifacts, packed.artifacts))
    throw Error('Stale optional closure');
  const previousOptions = await read(`${prior.archive}/${path}`);
  if (!same(Object.keys(report.sizes), Object.keys(previousOptions.sizes)))
    throw Error('Optional fixture inventory changed');
  for (const [key, fixture] of Object.entries(report.sizes))
    if (
      (fixture as { sourceSha256: string }).sourceSha256 !==
      previousOptions.sizes[key].sourceSha256
    )
      throw Error('Optional fixture source changed');
  options[family] = report.sizes;
  inputs.add(path);
  for (const r of Object.values(report.sizes) as {
    productionPath?: string;
    productionSha256?: string;
  }[]) {
    if (!r.productionPath) {
      if (family !== 'text') throw Error('Missing optional runtime output');
      continue; // Text records measurements/source, not an emitted runtime file.
    }
    if ((await hash(r.productionPath)) !== r.productionSha256)
      throw Error('Optional runtime differs');
    inputs.add(r.productionPath.replace(`${root}/`, ''));
  }
}
const versions = [];
for (const type of [chromium, firefox, webkit]) {
  const b = await type.launch();
  try {
    versions.push({ engine: type.name(), version: b.version() });
  } finally {
    await b.close();
  }
}
for (const directory of [
  'scripts',
  'examples',
  'tests/browser',
  'tests/react',
  'tests/m4',
  'tests/table',
  'tests/presets',
  'tests/copies',
  'tests/shared-wrapper',
  'tests/motion-review',
  prefix,
  '.artifacts/native-size-kind-rejected',
  '.artifacts/m4-presets',
  '.artifacts/m4-copies',
  '.artifacts/m4-shared-wrapper',
  '.artifacts/m4-motion-review/current',
  '.artifacts/m4-react-catalog',
  '.artifacts/m4/test-results',
  '.artifacts/m4/table-results',
  '.artifacts/m4/table-options-results',
])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (file.split('/').some((p) => ['node_modules', '.turbo'].includes(p)))
      continue;
    inputs.add(`${directory}/${file}`);
  }
for (const p of Object.keys(frozen.frozenFiles))
  if (p.startsWith('tests/') || p.startsWith('examples/')) inputs.add(p);
for (const p of [
  'AGENTS.md',
  'README.md',
  'docs/roadmap.md',
  'docs/implementation/m4/native-size-progress.md',
  'docs/implementation/m4/feature-freeze.json',
  'docs/implementation/m4/feature-freeze.md',
  'docs/implementation/m4/feature-freeze-receipt.json',
  'docs/implementation/m4/optimization-evidence.json',
  'docs/implementation/m4/optimization-progress.md',
  'docs/implementation/m4/optimization-receipt.json',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/owner-motion-review.md',
  'docs/implementation/m4/api-coverage.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  'package.json',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'biome.json',
  '.changeset/m4-specialized-presets.md',
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
  '.artifacts/m4/packed-report.json',
  '.artifacts/m4/size-regressions.json',
  '.artifacts/m4-api/coverage-report.json',
  '.artifacts/m4-api/fixtures.json',
  '.artifacts/m4-final-api/boundaries.json',
  '.artifacts/m4/table-production.json',
  '.artifacts/m4/chart-production.json',
])
  inputs.add(p);
for await (const p of new Bun.Glob('playwright*.config.ts').scan(root))
  inputs.add(p);
for (const name of ['core', 'react']) {
  const p = await read(`packages/${name}/package.json`);
  if (
    !p.private ||
    !p.scripts.prepublishOnly.includes('npm publishing is disabled')
  )
    throw Error('Publishing guard changed');
}
const archive = `.artifacts/evidence-runs/m4-native-size-${packed.artifacts.core.sha256.slice(0, 12)}-${Date.now()}`;
const sourceArchive: Record<string, string> = {},
  artifactFiles: Record<string, string> = {};
async function copy(from: string, to: string, records: Record<string, string>) {
  const path = resolve(root, archive, to);
  await mkdir(dirname(path), { recursive: true });
  await copyFile(resolve(root, from), path);
  records[to] = await hash(path);
}
for (const p of [...inputs].sort()) await copy(p, p, sourceArchive);
for (const [name, a] of Object.entries(packed.artifacts))
  await copy(
    (a as { path: string }).path,
    `artifacts/${name}.tgz`,
    artifactFiles,
  );
const packet = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  performanceTask: 'https://github.com/b4rb13/dot-loaders/issues/16',
  archive,
  artifacts: packed.artifacts,
  changedProduction,
  baseline: {
    featureFreeze: {
      path: 'docs/implementation/m4/feature-freeze.json',
      sha256: await hash('docs/implementation/m4/feature-freeze.json'),
      archive: frozen.archive,
      verifiedRecords: frozenRecords,
    },
    previousOptimization: {
      path: 'docs/implementation/m4/optimization-evidence.json',
      sha256: await hash('docs/implementation/m4/optimization-evidence.json'),
      archive: prior.archive,
      verifiedRecords: priorRecords,
      verifiedPriorTraceRecords: priorTraceRecords,
    },
    sizeBaselines: 'unchanged; no growth allowance or reset',
  },
  publicBoundary: {
    entries: 42,
    declarations: 22,
    changedDeclarations: [],
    originalClauseStatuses: 717,
  },
  preset,
  scope,
  stripping,
  comparison,
  ssr: {
    functionalPass: ssr.functionalPass,
    numericPass: ssr.numericPass,
    cells: 8,
    htmlCells: 2592,
    documents: 24,
  },
  browsers,
  browserPasses: browsers.reduce((n, r) => n + r.passes, 0),
  browserSkips: browsers.reduce((n, r) => n + r.skips, 0),
  jobs,
  browserJobs,
  clean,
  sizes: {
    default: packed.sizes,
    hardFailures: sizes.hardFailures,
    growthFlags: sizes.regressions.length,
    optional: options,
    externalModeGzip: native.externalModeGzip,
  },
  environment: {
    bun: Bun.version,
    node: native.environment.node,
    verifierProcessVersion: process.version,
    browsers: versions,
  },
  sourceArchive,
  artifactFiles,
  gates: {
    ownerVisualReview: 'approved-frozen-baseline; no motion enhancement',
    featureFreeze: true,
    m2: 'OPEN',
    m4: 'OPEN',
    renderers: 'provisional',
    npmPublishing: 'disabled',
    repositoryAndPackages: 'PRIVATE',
    nativeDownload: 'FAIL',
    performance: 'unqualified-current-pair; all prior misses held',
    manualAndPhysical: 'unverified',
    m5: 'not started',
  },
  limitations: [
    'Configuration/preset boundary only; no painter, scheduler, recipe, geometry, CSS or render/handoff body change.',
    'Full browser-floor/manual AT/reference/physical/Next/environment qualification remains open.',
    'Prior timing/heap/visual observations retain their original artifacts; no current performance claim or renderer selection.',
    '14 native complete default rows and two Table adapter rows still fail in M4 matrix; optional closures and bare Region external CSS also fail.',
    'No ceiling, baseline, fixture, animation, API, motion-window or accessibility reduction; no new size acceptance.',
    'Packaged README slice/size wording is historical and must be refreshed before distribution; current numerical evidence takes precedence.',
    'Sources remain local/uncommitted; no external source inspection, cloud export, publication, deployment, distribution or visibility change.',
  ],
};
for (const p of [
  'docs/implementation/m4/native-size-evidence.json',
  `${archive}/evidence.json`,
])
  await Bun.write(resolve(root, p), `${JSON.stringify(packet, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      archive,
      artifacts: packed.artifacts,
      sourceRecords: Object.keys(sourceArchive).length,
      artifactRecords: Object.keys(artifactFiles).length,
      browserPasses: packet.browserPasses,
      skips: packet.browserSkips,
      frozenRecords,
      priorRecords,
      priorTraceRecords,
      hardFailures: sizes.hardFailures.length,
      growthFlags: sizes.regressions.length,
    },
    null,
    2,
  ),
);
