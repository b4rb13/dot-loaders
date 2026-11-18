import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..');
const prefix = '.artifacts/region-table-inline';
const read = (p: string) => Bun.file(resolve(root, p)).json();
const hash = async (p: string) =>
  new Bun.CryptoHasher('sha256')
    .update(await Bun.file(resolve(root, p)).arrayBuffer())
    .digest('hex');
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const frozen = await read('docs/implementation/m4/feature-freeze.json');
const prior = await read('docs/implementation/m4/primitive-size-evidence.json');
const ssrPrior = await read(
  'docs/implementation/m4/optimization-evidence.json',
);
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
for (const [p, h] of Object.entries(ssrPrior.traceRecords)) {
  if ((await hash(p)) !== h) throw Error(`Prior trace changed ${p}`);
  priorTraceRecords++;
}
let immediatePriorTraceRecords = 0;
for (const [path, expected] of Object.entries(prior.traceRecords)) {
  if ((await hash(path)) !== expected)
    throw Error(`Prior raw record changed ${path}`);
  immediatePriorTraceRecords++;
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
  ...[
    'chart',
    'internal/event-element',
    'internal/loading-controller',
    'internal/skeleton-source',
    'internal/table-model',
    'region',
    'skeleton-block',
    'table',
    'text',
  ].map((p) => `packages/core/src/${p}.ts`),
  'packages/react/src/static.tsx',
  'packages/react/src/table.tsx',
].sort();
if (!same(changedProduction.sort(), expectedScope))
  throw Error('Production scope changed');
const index = await read('.artifacts/m4-api/coverage-report.json');
const oldIndex = await read(
  `${prior.archive}/.artifacts/m4-api/coverage-report.json`,
);
if (
  index.status !== 'index-integrity-pass' ||
  index.sourceBlocksRetained !== 717 ||
  !same(
    index.entries.map(({ sha256, ...row }: { sha256: string }) => row),
    oldIndex.entries.map(({ sha256, ...row }: { sha256: string }) => row),
  )
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
  scope = await read(`${prefix}/contracts.json`),
  stripping = await read(`${prefix}/stripping.json`);
const bodies = await read(`${prefix}/bodies.json`);
if (bodies.result !== 'pass' || bodies.rows.length !== 9)
  throw Error('Runtime body preservation failed');
if (
  comparison.htmlCells !== 2592 ||
  comparison.documents !== 24 ||
  preset.cells !== 1576 ||
  preset.kindCoercions !== 0 ||
  scope.publicEntries !== 42 ||
  scope.declarations.length !== 28 ||
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
const expectedBrowserPasses: Record<string, number> = {
  presets: 54,
  native: 322,
  react: 312,
  catalog: 312,
  table: 90,
  'table-options': 24,
  copies: 252,
  shared: 294,
  motion: 42,
};
const browsers = [];
for (const [name, path] of browserPaths) {
  const report = await read(path),
    s = report.stats,
    m = report.config.metadata;
  if (
    s.expected !== expectedBrowserPasses[name] ||
    s.unexpected ||
    s.flaky ||
    s.skipped !== (name === 'native' ? 2 : 0)
  )
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
const primitives = await read('.artifacts/m4-primitives/evidence.json');
if (
  !same(primitives.artifacts, packed.artifacts) ||
  primitives.rows.length !== 24 ||
  primitives.rows.some(
    (r: { result: string; released: boolean; pausedEffects: number }) =>
      r.result !== 'pass' || !r.released || r.pausedEffects !== 0,
  )
)
  throw Error('Exact minified primitive checks failed');
for (const fixture of primitives.fixtures)
  if (
    (await hash(fixture.file)) !== fixture.sha256 ||
    fixture.gzip !== packed.sizes[fixture.key].gzip
  )
    throw Error('Primitive payload differs');
const regions = await read('.artifacts/m4-region-inline/evidence.json');
if (
  regions.coreSha256 !== packed.artifacts.core.sha256 ||
  regions.rows.length !== 12 ||
  regions.rows.some((r: { result: string }) => r.result !== 'pass')
)
  throw Error('Exact minified Region checks failed');
for (const fixture of regions.fixtures)
  if (
    (await hash(fixture.file)) !== fixture.sha256 ||
    fixture.gzip !== native.sizes[fixture.key].gzip
  )
    throw Error('Region payload differs');
for (const key of ['regionRoot', 'region'])
  if (native.sizes[key].gzip > 6144) throw Error('Region inline miss');
for (const key of ['table-root-react', 'table-family-react'])
  if (packed.sizes[key].increment > 2048)
    throw Error('Table inline increment miss');
const pairedInputs = await read(`${prefix}/paired-inputs.json`);
const tableCaptures = await read(`${prefix}/table-captures.json`);
const pairedTable = await read(`${prefix}/paired-table-v5.json`);
if (
  pairedInputs.result !== 'pass' ||
  !same(pairedInputs.before, prior.artifacts) ||
  !same(pairedInputs.after, packed.artifacts) ||
  tableCaptures.rows.length !== 84 ||
  tableCaptures.mismatches.some(
    (r: { path: string }) => !r.path.includes('webkit'),
  ) ||
  pairedTable.pairs.length !== 28 ||
  pairedTable.rows.length !== 56 ||
  pairedTable.rows.some(
    (r: { data: { epoch: number; svgs: unknown[] } }) =>
      r.data.epoch !== 1000000 || r.data.svgs.length !== 2,
  ) ||
  pairedTable.pairs.some(
    (r: { commandsAndEffectsExact: boolean; pixelsExact: boolean }) =>
      !r.commandsAndEffectsExact || !r.pixelsExact,
  ) ||
  !same(pairedTable.before, prior.artifacts) ||
  !same(pairedTable.after, packed.artifacts)
)
  throw Error('Table diagnostic or matched input proof failed');
const captures = await read(`${prefix}/captures.json`),
  pairedDissolve = await read(`${prefix}/paired-dissolve.json`);
if (
  captures.rows.length !== 339 ||
  captures.rows.filter((r: { path: string }) =>
    /(?:chart-fixed-|text-fixed-progress)/.test(r.path),
  ).length !== 330 ||
  captures.rows.filter(
    (r: { path: string; exact: boolean }) =>
      /(?:chart-fixed-|text-fixed-progress)/.test(r.path) && !r.exact,
  ).length > 0 ||
  pairedDissolve.pairs.length !== 3 ||
  pairedDissolve.pairs.some(
    (r: { numericAndSvgExact: boolean; pixelsExact: boolean }) =>
      !r.numericAndSvgExact || !r.pixelsExact,
  )
)
  throw Error('Capture comparison inventory or paired proof changed');
if (
  !same(pairedDissolve.before, prior.artifacts) ||
  !same(pairedDissolve.after, packed.artifacts)
)
  throw Error('Paired dissolve artifact mismatch');
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
const priorSizes = await read(
  `${prior.archive}/.artifacts/m4/size-regressions.json`,
);
if (
  sizes.hardFailures.length !== 12 ||
  sizes.regressions.length !== 8 ||
  sizes.hardFailures.some(
    (key: string) => !prior.sizes.hardFailures.includes(key),
  ) ||
  sizes.regressions.some(
    (row: { key: string; metric: string }) =>
      !priorSizes.regressions.some(
        (old: { key: string; metric: string }) =>
          row.key === old.key && row.metric === old.metric,
      ),
  )
)
  throw Error('Unexpected default group or regression flag');

for (const key of [
  'block-root-native',
  'block-family-native',
  'typing-root-native',
  'typing-family-native',
])
  if (
    !packed.sizes[key].pass ||
    packed.sizes[key].external > packed.sizes[key].limit
  )
    throw Error('Primitive budget miss');
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
// Fresh local workload evidence is separate from absolute download passes.
const samplingJobs = await read(`${prefix}/sampling-jobs.json`);
if (
  samplingJobs.length !== 5 ||
  samplingJobs.some(
    (r: { name: string; code: number }) =>
      r.code !== 0 && !['cleanup', 'active-heap'].includes(r.name),
  )
)
  throw Error('Sampling campaign incomplete');
const traceRecords: Record<string, string> = {};
const sampling = [];
for (const job of samplingJobs) {
  if ((await hash(job.report)) !== job.sha256)
    throw Error('Sampling report changed');
  const report = await read(job.report);
  if (report.artifactSha256 !== packed.artifacts.core.sha256 || report.fatal)
    throw Error('Stale or failed sampling');
  const trace = ['normal-idle', 'normal-handoff', 'list-idle'].includes(
    job.name,
  );
  if (
    trace &&
    (!report.protocolComplete ||
      !report.collectionPass ||
      report.warmups.length !== 3 ||
      report.summary.validPairs !== 20)
  )
    throw Error('Timing protocol incomplete');
  if (
    job.name === 'cleanup' &&
    (!report.protocolComplete || report.repetitions.length !== 3)
  )
    throw Error('Cleanup protocol incomplete');
  if (job.name === 'active-heap' && report.rows.length !== 18)
    throw Error('Active heap protocol incomplete');
  traceRecords[job.report] = job.sha256;
  for (const [path, expected] of Object.entries(report.evidenceFiles)) {
    const key = trace ? path : `${report.directory}/${path}`;
    if (
      key.startsWith('/') ||
      key.split('/').includes('..') ||
      (await hash(key)) !== expected
    )
      throw Error(`Sampling evidence changed ${key}`);
    traceRecords[key] = expected as string;
  }
  for (const [path, expected] of Object.entries(report.inputs)) {
    const key = `${report.directory}/inputs/${path}`;
    if ((await hash(key)) !== expected)
      throw Error(`Sampling input changed ${key}`);
    traceRecords[key] = expected as string;
  }
  sampling.push({
    name: job.name,
    report: job.report,
    sha256: job.sha256,
    nativeSha256: report.artifactSha256,
    collectionPass: report.collectionPass,
    protocolComplete: report.protocolComplete,
    result: report.result,
    summary: report.summary,
    wholeWork: report.wholeWork,
    phaseTotals: report.phaseTotals,
    qualification: report.qualification,
    repetitions: report.repetitions,
    rows: report.rows,
  });
}
const samplingSummary = await read(`${prefix}/sampling-summary.json`);
if (
  samplingSummary.timings.length !== 3 ||
  samplingSummary.timings.some(
    (r: { nativeSha256: string }) =>
      r.nativeSha256 !== packed.artifacts.core.sha256,
  ) ||
  samplingSummary.memory.cycles !== 300 ||
  samplingSummary.memory.activeCells !== 18
)
  throw Error('Sampling summary scope mismatch');
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
  '.artifacts/m4-primitives',
  '.artifacts/m4-region-inline',
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
  '.changeset/m4-region-table-inline.md',
  'docs/implementation/m4/primitive-size-evidence.json',
  'docs/implementation/m4/primitive-size-progress.md',
  'docs/implementation/m4/inline-size-progress.md',
  'docs/implementation/m2/closure-checklist.md',
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
const archive = `.artifacts/evidence-runs/m4-inline-recovery-${packed.artifacts.core.sha256.slice(0, 12)}-${Date.now()}`;
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
      path: 'docs/implementation/m4/primitive-size-evidence.json',
      sha256: await hash('docs/implementation/m4/primitive-size-evidence.json'),
      archive: prior.archive,
      verifiedRecords: priorRecords,
      verifiedPriorTraceRecords: priorTraceRecords,
      verifiedImmediatePriorTraceRecords: immediatePriorTraceRecords,
    },
    sizeBaselines: 'unchanged; no growth allowance or reset',
  },
  publicBoundary: {
    entries: 42,
    declarations: 22,
    changedDeclarations: scope.declarations.filter(
      (r: { byteIdentical: boolean }) => !r.byteIdentical,
    ),
    declarationComparison:
      'unchanged supported public string members; documented private/protected implementation seams change',
    originalClauseStatuses: 717,
  },
  preset,
  scope,
  stripping,
  bodies,
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
  exactMinifiedPrimitives: primitives,
  exactMinifiedRegions: regions,
  captures,
  pairedDissolve,
  tableCaptures,
  pairedTable,
  pairedInputs,
  samplingJobs,
  samplingSummary,
  sampling,
  traceRecords,
  jobs,
  browserJobs,
  clean,
  sizes: {
    default: packed.sizes,
    hardFailures: sizes.hardFailures,
    growthFlags: sizes.regressions.length,
    optional: options,
    externalModeGzip: native.externalModeGzip,
    recoveredInlineModes: [
      {
        entry: 'regionRoot',
        before: 6206,
        after: native.sizes.regionRoot.gzip,
        cap: 6144,
        status: 'pass; complete external group held',
      },
      {
        entry: 'region',
        before: 6205,
        after: native.sizes.region.gzip,
        cap: 6144,
        status: 'pass; complete external group held',
      },
      {
        entry: 'table-root-react',
        before: 2063,
        after: packed.sizes['table-root-react'].increment,
        cap: 2048,
        status: 'pass; external increment held',
      },
      {
        entry: 'table-family-react',
        before: 2155,
        after: packed.sizes['table-family-react'].increment,
        cap: 2048,
        status: 'pass; external increment held',
      },
    ],
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
    primitiveAbsoluteDownload:
      'PASS: four unchanged complete CSS-mode consumers; growth acceptance separate',
    inlineRecovery:
      'PASS: both bare Region imports and both Table adapter increments; complete external groups held',
    nativeDownload:
      'FAIL: remaining default/optional/adapter/Region and growth holds',
    performance:
      'fresh local sampling; numerical/reference qualification remains held; see full retained reports',
    manualAndPhysical: 'unverified',
    m5: 'not started',
  },
  limitations: [
    'Private family upgrade replay, direct Region-owned skeleton coordination and a private DOM-free Table layout capability; no supported control, painter, scheduler, recipe or accessibility contract removed.',
    'Stable frozen React hydration snapshots use object identity; inert Table markup remains captured once. Ten core stylesheets, 2592 SSR HTML fields and 24 documents are exact.',
    'Full browser-floor/manual AT/reference/physical/Next/environment qualification remains open. All prior raw traces and observed misses retain their original artifacts; local performance is not renderer qualification.',
    'Ten native default groups and two Table adapter groups still fail; eight retained Typing growth flags need review. Table native complete costs grow 16/27 B while remaining held; no new significant-growth flag or owner approval is inferred.',
    'Block/Typing complete absolute CSS-mode passes remain. Region/Table inline modes pass; complete external Region/Table, optional closures and all M2 obligations stay held under unchanged caps and baselines.',
    'Packaged README slice/size wording is historical and needs review before distribution. Sources remain local/uncommitted; no external source/cloud/publication/distribution/deployment/visibility/M5 action.',
  ],
};
for (const p of [
  'docs/implementation/m4/inline-size-evidence.json',
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
