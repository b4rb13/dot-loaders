import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { m4BudgetFailures } from './m4-budgets.js';

const root = resolve(import.meta.dir, '..');
const json = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
const native = await json('.artifacts/packed-report.json');
const react = await json('.artifacts/m3/packed-react-report.json');
const catalog = await json('.artifacts/m4/packed-report.json');
const sizeBaseline = await json('docs/implementation/m4/size-baseline.json');
const animationClosures = await json(
  '.artifacts/m4/text-animation-closures.json',
);
if (
  Object.keys(animationClosures.sizes ?? {}).length !== 8 ||
  ['core', 'react'].some(
    (name) =>
      animationClosures.artifacts?.[name]?.sha256 !==
      catalog.artifacts[name].sha256,
  )
)
  throw new Error('Missing or stale complete text animation closures');
for (const [key, row] of Object.entries(animationClosures.sizes) as [
  string,
  { source: string; sourceSha256: string; gzip: number; external: number },
][]) {
  if (
    !/^(firstParty|custom)-(root|family)-(native|react)$/.test(key) ||
    !Number.isSafeInteger(row.gzip) ||
    row.gzip < 0 ||
    !Number.isSafeInteger(row.external) ||
    row.external < row.gzip ||
    createHash('sha256').update(row.source).digest('hex') !== row.sourceSha256
  )
    throw new Error('Invalid text animation consumer');
}
const chartClosures = await json('.artifacts/m4/chart-animation-closures.json');
if (
  Object.keys(chartClosures.sizes ?? {}).length !== 8 ||
  ['core', 'react'].some(
    (name) =>
      chartClosures.artifacts?.[name]?.sha256 !==
      catalog.artifacts[name].sha256,
  )
)
  throw new Error('Stale complete chart animation closures');
for (const [key, row] of Object.entries(chartClosures.sizes) as [
  string,
  { source: string; sourceSha256: string; gzip: number; external: number },
][]) {
  if (
    !/^(firstParty|custom)-(root|family)-(native|react)$/.test(key) ||
    !Number.isSafeInteger(row.gzip) ||
    row.gzip < 0 ||
    !Number.isSafeInteger(row.external) ||
    row.external < row.gzip ||
    createHash('sha256').update(row.source).digest('hex') !== row.sourceSha256
  )
    throw new Error('Invalid chart closure');
}
const chartAnimationBudget = await json(
  '.artifacts/m4/chart-animation-budget.json',
);
const chartComparison = await json(
  '.artifacts/m4/chart-size-visual-comparison.json',
);
if (
  chartComparison.total !== 270 ||
  chartComparison.identical !== 270 ||
  ['core', 'react'].some(
    (name) =>
      chartComparison.artifacts?.[name]?.sha256 !==
        catalog.artifacts[name].sha256 ||
      chartAnimationBudget.artifacts?.[name]?.sha256 !==
        catalog.artifacts[name].sha256,
  )
)
  throw new Error('Missing or stale chart optimization evidence');
const optionalRuntime = await json('.artifacts/m4/chart-options-results.json');
if (
  optionalRuntime.stats.expected !== 24 ||
  optionalRuntime.stats.unexpected ||
  optionalRuntime.stats.flaky ||
  optionalRuntime.stats.skipped ||
  ['core', 'react'].some(
    (name) =>
      optionalRuntime.config.metadata.artifacts[name].sha256 !==
      catalog.artifacts[name].sha256,
  )
)
  throw new Error('Incomplete or stale minified optional chart runtime checks');
for (const row of Object.values(chartClosures.sizes) as {
  productionPath: string;
  productionSha256: string;
}[])
  if ((await hash(row.productionPath)) !== row.productionSha256)
    throw new Error('Changed measured optional chart JavaScript');
const commandReference = await json('tests/fixtures/chart-idle-commands.json');
if (commandReference.rows.length !== 288)
  throw new Error('Missing archived idle command reference');
const unitLog = await readFile(
  resolve(root, '.artifacts/m4/chart-size-development/unit-final.log'),
  'utf8',
);
const harnessLog = await readFile(
  resolve(root, '.artifacts/m4/chart-size-development/harness-final.log'),
  'utf8',
);
if (
  !unitLog.includes('29 pass') ||
  !unitLog.includes('6 pass') ||
  unitLog.includes('1 fail') ||
  !harnessLog.includes('23 pass') ||
  !harnessLog.includes('0 fail')
)
  throw new Error('Missing scoped unit validation');
const chartResults =
  '.artifacts/m4/chart-size-development/deterministic-current/test-results';
const chartVisuals: { path: string; sha256: string }[] = [];
for await (const path of new Bun.Glob('**/chart-fixed-*.png').scan(
  resolve(root, chartResults),
))
  chartVisuals.push({
    path,
    sha256: await hash(resolve(root, chartResults, path)),
  });
if (chartVisuals.length !== 270)
  throw new Error('Missing eighteen-combination fixed chart matrix');
for (const browser of ['chromium', 'firefox', 'webkit'])
  for (const variant of ['line', 'bar', 'scatter'])
    for (const idle of ['ridge', 'scan', 'terrain', 'bars', 'scatter', 'cycle'])
      for (let sample = 0; sample < 5; sample++)
        if (
          !chartVisuals.some(
            (item) =>
              item.path.includes(`${browser}/`) &&
              item.path.endsWith(
                `chart-fixed-${variant}-${idle}-${sample}.png`,
              ),
          )
        )
          throw new Error('Missing chart visual cell');
const chartVideos: { path: string; sha256: string }[] = [];
for await (const path of new Bun.Glob('**/chart-motion/*.webm').scan(
  resolve(root, chartResults),
))
  chartVideos.push({
    path,
    sha256: await hash(resolve(root, chartResults, path)),
  });
if (chartVideos.length !== 3)
  throw new Error('Missing normal-speed chart recordings');
const regressions = await json('.artifacts/m4/size-regressions.json');
const visualComparison = await json(
  '.artifacts/m4/text-size-visual-comparison.json',
);
if (
  visualComparison.total !== 60 ||
  visualComparison.identical !== 60 ||
  ['core', 'react'].some(
    (name) =>
      visualComparison.artifacts?.[name]?.sha256 !==
      catalog.artifacts[name].sha256,
  )
)
  throw new Error('Missing or stale unchanged fixed-progress visual evidence');
const clean = await json('.artifacts/m3/clean-reproduction.json');
if (
  catalog.artifacts.core.sha256 !== native.sha256 ||
  catalog.artifacts.react.sha256 !== react.sha256 ||
  react.native.sha256 !== native.sha256 ||
  react.result !== 'pass'
)
  throw new Error('Mismatched current packed artifacts');
for (const artifact of Object.values(catalog.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(artifact.path)) !== artifact.sha256)
    throw new Error('Changed artifact');
if (
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== native.sha256 ||
  clean.reproducedTarballSha256.react !== react.sha256
)
  throw new Error('Clean pair reproduction incomplete');
if (
  !['pass', 'review-required'].includes(regressions.result) ||
  regressions.hardFailures.length ||
  (regressions.result === 'pass') !== (regressions.regressions.length === 0)
)
  throw new Error('Invalid size regression disposition');
// This recorder seals observations. It never approves growth or changes the failing gate.
if (
  chartAnimationBudget.result !== 'pass' ||
  chartAnimationBudget.failures.length
)
  throw new Error('Complete optional chart size gate has not passed');
if (
  regressions.artifacts.core.sha256 !== native.sha256 ||
  regressions.artifacts.react.sha256 !== react.sha256
)
  throw new Error('Stale regression report');
const failures = m4BudgetFailures(catalog.sizes);
if (failures.length)
  throw new Error(`Unexpected absolute size failure: ${failures}`);
const matrices: Record<string, unknown> = {};
for (const [name, path, count, skipped] of [
  ['native', '.artifacts/browser-results.json', 298, 2],
  ['react', '.artifacts/m3/browser-results.json', 216, 0],
  ['next', '.artifacts/m3/next-browser-results.json', 60, 0],
  ['catalog', '.artifacts/m4/browser-results.json', 252, 0],
] as const) {
  const report = await json(path);
  const metadata = report.config.metadata;
  if (
    report.stats.expected !== count ||
    report.stats.skipped !== skipped ||
    report.stats.unexpected ||
    report.stats.flaky
  )
    throw new Error(`Incomplete ${name} matrix`);
  const matches =
    name === 'native'
      ? metadata.artifactSha256 === native.sha256
      : name === 'catalog'
        ? metadata.artifacts.core.sha256 === native.sha256 &&
          metadata.artifacts.react.sha256 === react.sha256
        : metadata.nativeArtifactSha256 === native.sha256 &&
          metadata.reactArtifactSha256 === react.sha256;
  if (!matches) throw new Error(`Stale ${name} matrix`);
  matrices[name] = report.stats;
}
for (const mode of ['reference', 'current']) {
  const report = await json(
    `.artifacts/m4/chart-size-development/deterministic-${mode}/results.json`,
  );
  if (
    report.stats.expected !== 3 ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.stats.skipped
  )
    throw new Error('Incomplete paired chart inspection');
  matrices[`chartInspection${mode}`] = report.stats;
}
const productionReport = await json(
  '.artifacts/m4/chart-production-results.json',
);
if (
  productionReport.stats.expected !== 12 ||
  productionReport.stats.unexpected ||
  productionReport.stats.flaky ||
  productionReport.stats.skipped ||
  productionReport.config.metadata.artifacts.core.sha256 !== native.sha256 ||
  productionReport.config.metadata.artifacts.react.sha256 !== react.sha256
)
  throw new Error('Optimized production chart matrix incomplete');
matrices.optimizedChart = productionReport.stats;
matrices.optionalMinifiedChart = optionalRuntime.stats;
for (const path of [
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/next-consumers.json',
]) {
  const report = await json(path);
  if (
    report.result !== 'pass' ||
    report.nativeSha256 !== native.sha256 ||
    report.reactSha256 !== react.sha256
  )
    throw new Error(`Stale ${path}`);
}
const controls = await json('.artifacts/m4/chart-controls.json');
if (!controls.private || controls.m2 !== 'open' || controls.m4 !== 'open')
  throw new Error('Private/open milestone controls changed');
const guards = [];
for (const pkg of ['core', 'react']) {
  const cwd = resolve(
    catalog.consumer,
    `node_modules/@dotquilt-internal/${pkg}`,
  );
  const manifest = await Bun.file(resolve(cwd, 'package.json')).json();
  if (
    !manifest.private ||
    !manifest.scripts.prepublishOnly.includes('publishing is disabled') ||
    (pkg === 'core' && Object.keys(manifest.dependencies ?? {}).length)
  )
    throw new Error('Publication/dependency guard changed');
  const proc = Bun.spawn(['bun', 'run', 'prepublishOnly'], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (
    exitCode !== 1 ||
    !`${stdout}${stderr}`.includes('publishing is disabled')
  )
    throw new Error('Publication guard did not reject');
  guards.push({ pkg, exitCode, registryWrites: 0 });
}
const inventory = await json('docs/implementation/requirements.json');
const review = await json('docs/implementation/m4/requirement-review.json');
if (
  inventory.requirements.length !== 717 ||
  review.requirements.length !== 717 ||
  inventory.requirements.some(
    (row: { id: string }, i: number) =>
      row.id !== review.requirements[i]?.id ||
      review.requirements[i]?.fullClauseStatus !== 'unverified',
  )
)
  throw new Error('Lossless requirement review changed');
const previousArchives = [];
for (const id of [
  'm2-bf8d927bccfb-1792181582369',
  'm3-ef78a87726b9-e75c5cb9f64b-1792185850664',
  'm4-fe0fa4e77756-1b2fb9464836-1792188520904',
  'm4-a9d7a4a36246-7c70462e728f-1792189889646',
  'm4-controller-1792192171463',
  'm4-motion-b9d06e8f8e33-1792195159953',
  'm4-text-1a065a0b5cde-1792198631329',
  'm4-text-f0d8560a4a7f-1792201203185',
  'm4-chart-9d8cae444c26-1792204922502',
  'm4-chart-8f199142cd4d-1792206523796',
  'm4-chart-size-5200245861fb-1792254210905',
  'm4-chart-size-990af3000c5d-1792257236486',
]) {
  const directory = `.artifacts/evidence-runs/${id}`;
  const prior = await json(`${directory}/evidence.json`);
  const records = {
    ...(prior.evidenceSha256 ?? {
      ...prior.sourceArchive,
      ...prior.nextBuildFiles,
      ...prior.consumerFiles,
    }),
    ...prior.artifactFiles,
  };
  let count = 0;
  for (const [path, expected] of Object.entries(records)) {
    if (path.startsWith('/') || path.split('/').includes('..'))
      throw new Error('Archive record escapes project evidence');
    if ((await hash(resolve(root, directory, path))) !== expected)
      throw new Error(`Historical archive changed: ${id}/${path}`);
    count++;
  }
  previousArchives.push({ directory, files: count });
}
const archive = `.artifacts/evidence-runs/m4-chart-size-${native.sha256.slice(0, 12)}-${Date.now()}`;
const inputs = new Set<string>([
  'AGENTS.md',
  'README.md',
  'docs/roadmap.md',
  'docs/implementation/native-quickstart.md',
  'docs/implementation/react-quickstart.md',
  'package.json',
  '.bun-version',
  'bunfig.toml',
  '.npmrc',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'biome.json',
  'docs/implementation/requirements.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/progress.md',
  'docs/implementation/m4/text-progress.md',
  'docs/implementation/m4/text-quickstart.md',
  'docs/implementation/m4/chart-progress.md',
  'docs/implementation/m4/chart-size-progress.md',
  'docs/implementation/m4/chart-size-growth-review.md',
  'docs/implementation/m4/chart-quickstart.md',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  'docs/implementation/m4/catalog-quickstart.md',
  'docs/planning/launch-specification-review.md',
  '.artifacts/packed-report.json',
  '.artifacts/browser-results.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/browser-results.json',
  '.artifacts/m3/next-browser-results.json',
  '.artifacts/m3/next-consumers.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
]);
for (const directory of [
  'packages/core/src',
  'packages/react/src',
  'packages/core/test',
  'packages/react/test',
  'scripts',
  'tests',
  '.changeset',
  'apps',
]) {
  for await (const path of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
    dot: true,
  }))
    if (!/(?:^|\/)(?:node_modules|dist|\.next|\.turbo)(?:\/|$)/.test(path))
      inputs.add(`${directory}/${path}`);
}
for (const pkg of ['core', 'react'])
  for (const file of ['package.json', 'README.md', 'LICENSE', 'tsconfig.json'])
    inputs.add(`packages/${pkg}/${file}`);
for (const name of [
  'playwright.config.ts',
  'playwright.react.config.ts',
  'playwright.next.config.ts',
  'playwright.m4.config.ts',
  'playwright.chart-production.config.ts',
  'playwright.chart-comparison.config.ts',
  'playwright.chart-options.config.ts',
])
  inputs.add(name);
for (const name of ['animation-fixtures.json', 'size-baseline.json'])
  inputs.add(`docs/implementation/m4/${name}`);
for await (const path of new Bun.Glob('**/*').scan({
  cwd: resolve(root, '.artifacts/m4'),
  onlyFiles: true,
  dot: true,
}))
  if (
    (/^[^/]+\.(?:log|json)$/.test(path) ||
      /^chart.*-production\.js$/.test(path) ||
      /^(?:test-results|production-results|chart-options-results|dissolve-initial-csp-failure|pre-capture-fix|text-development|chart-development|chart-size-development)\//.test(
        path,
      )) &&
    !path.endsWith('evidence.json')
  )
    inputs.add(`.artifacts/m4/${path}`);
const files: Record<string, string> = {};
for (const path of [...inputs].sort()) {
  const to = resolve(root, archive, path);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(resolve(root, path), to);
  files[path] = await hash(to);
}
const artifactFiles: Record<string, string> = {};
for (const [name, directory] of Object.entries({
  ...react.consumers,
  catalog: catalog.consumer,
}) as [string, string][]) {
  let locks = 0;
  for (const path of ['package.json', 'package-lock.json', 'bun.lock']) {
    if (!(await Bun.file(resolve(directory, path)).exists())) continue;
    const key = `consumer-records/${name}/${path}`;
    const to = resolve(root, archive, key);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(resolve(directory, path), to);
    files[key] = await hash(to);
    if (path !== 'package.json') locks++;
  }
  if (!locks) throw new Error(`Missing consumer lock: ${name}`);
}
const next = await json('.artifacts/m3/next-consumers.json');
for (const [name, directory] of Object.entries(next.consumers) as [
  string,
  string,
][])
  for (const path of [
    'package.json',
    'package-lock.json',
    '.next/BUILD_ID',
    '.next/routes-manifest.json',
    '.next/required-server-files.json',
  ]) {
    const key = `next-records/${name}/${path}`;
    const to = resolve(root, archive, key);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(resolve(directory, path), to);
    files[key] = await hash(to);
  }
for (const [name, artifact] of Object.entries(catalog.artifacts) as [
  string,
  { path: string; sha256: string },
][]) {
  const path = `artifacts/${name}.tgz`;
  const to = resolve(root, archive, path);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(artifact.path, to);
  artifactFiles[path] = await hash(to);
}
const evidence = {
  schemaVersion: 2,
  recordedAt: new Date().toISOString(),
  archive,
  decision:
    'https://github.com/b4rb13/dot-loaders/issues/9#issuecomment-6226666680',
  status: regressions.regressions.length
    ? 'Complete optional chart ceilings pass; existing-entry growth requires owner review; M4 held'
    : 'Complete optional chart ceilings and reviewed existing-entry size gates pass; full M4 qualification held',
  artifacts: catalog.artifacts,
  verificationProvenance: {
    exactPairObservations:
      '.artifacts/evidence-runs/m4-chart-size-990af3000c5d-1792257236486',
    followUp:
      'Owner approval recorded; numerical size and integrity gates rerun against unchanged tarballs. Browser and visual observations retained from the exact-pair packet, not rerun.',
  },
  environment: native.environment,
  matrices,
  guards,
  sizes: catalog.sizes,
  textAnimationClosures: animationClosures,
  chartAnimationClosures: chartClosures,
  chartAnimationBudget,
  chartComparison,
  commandReference: {
    path: 'tests/fixtures/chart-idle-commands.json',
    sha256: await hash(
      resolve(root, 'tests/fixtures/chart-idle-commands.json'),
    ),
    cells: 288,
    status: 'exact commands retained; owner visual approval separate',
  },
  scopedUnits: { native: 29, react: 6, harness: 23 },
  chartVisuals,
  chartVideos,
  chartFixture: {
    dimensions: { width: 320, height: 200 },
    fixedViewport: { width: 1280, height: 720 },
    videoViewport: { width: 640, height: 480 },
    dpr: 1,
    phaseSamples: [0, 0.25, 0.55, 0.8, 1],
    duration: 900,
    phaseCurve:
      'linear inspection override, final idle refresh at paused time; fresh paired capture from immutable previous tarballs; original uncontrolled PNGs retained. Natural recordings use authored defaults',
    data: 'Exact line/bar/scatter fixtures in retained chart-client.ts and server.ts',
    seed: 'deterministic, no random input',
    ownerReview: 'pending',
  },
  visualComparison,
  nativeSlice: native.sizes,
  regressions,
  controls,
  sourceBlockCount: 717,
  previousArchives,
  sourceArchive: files,
  artifactFiles,
  gates: {
    absoluteSliceSize: failures.length ? 'fail' : 'pass',
    absoluteSizeFailures: failures,
    approvedHistoricalGrowth: sizeBaseline.source,
    introducedTextAndChartReferences:
      'first measurements; owner baseline review pending',
    selectableAndCustomClosures: chartAnimationBudget.result,
    optionalAnimationSizeFailures: chartAnimationBudget.failures,
    sizeGrowth: regressions.regressions.length ? 'review-required' : 'pass',
    recordedSizeGate: regressions.result,
    normalSpeedOwnerReview: 'unverified',
    completeMotionMatrix: 'unverified',
    m2: 'open',
    renderer: 'provisional',
    publishing: 'disabled',
  },
  limitations: [
    'No new physical/reference whole-render/heap or actual-floor/manual-AT evidence; M2 remains open.',
    'ChartLoader and TextLoader are native/current-React/static slices. TableLoader, complete catalog and required reference/manual/visual qualification remain unfinished.',
    'Native/React/Next regressions retain their recorded fixture scopes; no full-nine-export claim.',
    'Snapshots and normal-speed recordings are implementation observations, not owner visual approval.',
    'WebKit screenshot instrumentation injects body {}; strict CSP paths use no screenshot operation and all policy assertions stay enabled. Initial failed capture reports retained.',
    'The complete optional chart download ceiling passes with only 1 B worst-case headroom. Existing-entry growth disposition uses the separately owner-approved durable baseline; this recorder does not grant approval. Text/Chart new-entry and owner visual acceptance remain separate. Earlier failed candidates and checkpoints remain historical.',
    'Implementation remains local/uncommitted; artifact hashes identify tested bytes. No external source inspected or npm publication performed.',
  ],
};
await writeFile(
  resolve(root, archive, 'evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
await writeFile(
  resolve(root, 'docs/implementation/m4/chart-size-evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
for (const [path, expected] of Object.entries({ ...files, ...artifactFiles }))
  if ((await hash(resolve(root, archive, path))) !== expected)
    throw new Error(`New archive mismatch: ${path}`);
console.log(
  JSON.stringify(
    {
      archive,
      files: Object.keys(files).length,
      matrices,
      regressions: regressions.regressions.length,
    },
    null,
    2,
  ),
);
