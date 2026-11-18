import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const packet = await read('.artifacts/m4/packed-report.json');
const native = await read('.artifacts/packed-report.json');
const adapter = await read('.artifacts/m3/packed-react-report.json');
const previous = await read('docs/implementation/m4/presets-evidence.json');
const jobs = await read('.artifacts/m4-coordination/verification/jobs.json');
if (
  jobs.length !== 27 ||
  jobs.some(
    (job: { exitCode: number; expectedExitCode: number }) =>
      job.exitCode !== job.expectedExitCode,
  )
)
  throw new Error('Incomplete or failed functional verification');
if (
  !(
    await readFile(
      resolve(
        root,
        '.artifacts/m4-coordination/verification/native-packed.log',
      ),
      'utf8',
    )
  ).includes('Closure size gate failed; report retained.')
)
  throw new Error('Native packed failure must be its retained size gate');
if (
  native.sha256 !== packet.artifacts.core.sha256 ||
  adapter.native.sha256 !== native.sha256 ||
  adapter.sha256 !== packet.artifacts.react.sha256 ||
  adapter.result !== 'pass'
)
  throw new Error('Stale or failed package pair');
for (const [path, sha] of Object.entries({
  ...native.sourceFiles,
  ...native.buildInputs,
  ...adapter.sources,
}) as [string, string][])
  if ((await hash(path)) !== sha)
    throw new Error(`Changed verified input ${path}`);
for (const artifact of Object.values(packet.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(artifact.path)) !== artifact.sha256)
    throw new Error('Changed artifact');

const coordinationFixture = await read(
  '.artifacts/m4-coordination/fixtures.json',
);
if (
  JSON.stringify(coordinationFixture.artifacts) !==
  JSON.stringify(packet.artifacts)
)
  throw new Error('Stale coordination fixture');
for (const [path, sha] of Object.entries(coordinationFixture.hashes) as [
  string,
  string,
][]) {
  const source = path.startsWith('tests/')
    ? path
    : `.artifacts/m4-coordination/${path}`;
  if ((await hash(source)) !== sha)
    throw new Error(`Changed coordination fixture ${source}`);
}
const fixtureCSP = await read(
  '.artifacts/m4-coordination/diagnostics/firefox-csp/favicon-policy-probe.json',
);
if (
  fixtureCSP.allowedFaviconStatus !== 200 ||
  fixtureCSP.correctedPageViolations.length ||
  fixtureCSP.negativeImageViolations.length !== 1 ||
  fixtureCSP.negativeImageViolations[0].directive !== 'img-src' ||
  fixtureCSP.negativeImageViolations[0].uri !==
    'http://127.0.0.1:4201/not-allowed.svg' ||
  !fixtureCSP.correctedHeader.includes(
    'img-src http://127.0.0.1:4201/favicon.svg;',
  )
)
  throw new Error('Fixture CSP probe did not retain its image boundary');
const browserPaths = [
  '.artifacts/browser-results.json',
  '.artifacts/m3/browser-results.json',
  '.artifacts/m3/next-browser-results.json',
  '.artifacts/m4-presets/browser-results.json',
  '.artifacts/m4/browser-results.json',
  '.artifacts/m4/table-parts-results.json',
  '.artifacts/m4-coordination/browser-results.json',
];
const browsers = [];
for (const path of browserPaths) {
  const report = await read(path),
    metadata = report.config.metadata;
  const sha =
    metadata.artifactSha256 ??
    metadata.nativeArtifactSha256 ??
    metadata.artifacts?.core.sha256;
  if (
    sha !== native.sha256 ||
    !report.stats.expected ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.errors.length
  )
    throw new Error(`Stale or failed browser report ${path}`);
  if (report.stats.skipped !== (path === browserPaths[0] ? 2 : 0))
    throw new Error(`Unexpected skips ${path}`);
  browsers.push({ path, ...report.stats });
}
if (browsers[3]?.expected !== 51 || browsers[6]?.expected !== 84)
  throw new Error('Incomplete preset/coordination matrix');
if (
  browsers[0]?.expected !== 322 ||
  browsers[1]?.expected !== 216 ||
  browsers[2]?.expected !== 60 ||
  browsers[5]?.expected !== 27
)
  throw new Error('Incomplete selected regression matrix');
const clean = await read('.artifacts/m3/clean-reproduction.json');
const ssr = await read('.artifacts/m3/ssr-output.json');
if (
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== native.sha256 ||
  clean.reproducedTarballSha256.react !== adapter.sha256 ||
  ssr.result !== 'pass' ||
  ssr.nativeSha256 !== native.sha256 ||
  ssr.reactSha256 !== adapter.sha256
)
  throw new Error('Clean/SSR proof mismatch');
const sizes = {
  defaults: packet.sizes,
  native: { sizes: native.sizes, external: native.externalModeGzip },
  text: await read('.artifacts/m4/text-animation-closures.json'),
  chart: await read('.artifacts/m4/chart-animation-closures.json'),
  table: await read('.artifacts/m4/table-animation-closures.json'),
  regressions: await read('.artifacts/m4/size-regressions.json'),
};
if (
  sizes.regressions.artifacts.core.sha256 !== native.sha256 ||
  !sizes.regressions.hardFailures.length ||
  !sizes.regressions.regressions.length
)
  throw new Error('Missing retained download failures/growth review');
for (const name of ['text', 'chart', 'table'] as const)
  if (
    sizes[name].artifacts.core.sha256 !== native.sha256 ||
    sizes[name].artifacts.react.sha256 !== adapter.sha256
  )
    throw new Error(`Stale ${name} closure sizes`);
const requirements = await read('docs/implementation/requirements.json');
const review = await read('docs/implementation/m4/requirement-review.json');
const postSourceChecks = await read(
  '.artifacts/m4-coordination/post-source-checks.json',
);
if (
  postSourceChecks.length !== 2 ||
  postSourceChecks.some((row: { exitCode: number }) => row.exitCode)
)
  throw new Error('Final source checks incomplete');
if (
  sizes.regressions.baselineReportSha256 !==
  previous.sizes.regressions.baselineReportSha256
)
  throw new Error('Size baseline changed');
for (const path of [
  'scripts/check-m4-budgets.ts',
  'scripts/check-chart-options.ts',
  'scripts/check-table-options.ts',
])
  if ((await hash(path)) !== previous.sourceArchive[path])
    throw new Error('Download gate implementation changed');
if (
  requirements.requirements.length !== 717 ||
  review.coordinationContinuation.requirementIds.some(
    (id: string) =>
      !requirements.requirements.some((row: { id: string }) => row.id === id),
  )
)
  throw new Error('Requirement traceability mismatch');
const changedProduction = [];
for (const [path, sha] of Object.entries(previous.sourceArchive) as [
  string,
  string,
][]) {
  if (/^packages\/(core|react)\/src\//.test(path) && (await hash(path)) !== sha)
    changedProduction.push(path);
}
const expectedChanges = [
  'packages/core/src/internal/loading-controller.ts',
  'packages/core/src/internal/services.ts',
  'packages/core/src/styles.ts',
];
if (
  JSON.stringify(changedProduction.sort()) !==
  JSON.stringify(expectedChanges.sort())
)
  throw new Error('Unexpected production changes');
const unchangedRendering: Record<string, string> = {};
for (const file of [
  'internal/painter.ts',
  'internal/runner.ts',
  'internal/frames.ts',
  'internal/handoff.ts',
  'internal/chart-idle.ts',
  'internal/chart-definitions.ts',
  'internal/table-definitions.ts',
  'internal/text-playback.ts',
]) {
  const path = `packages/core/src/${file}`,
    sha = await hash(path);
  if (sha !== previous.sourceArchive[path])
    throw new Error(`Unexpected drawing/scheduling change ${path}`);
  unchangedRendering[path] = sha;
}
const previousArchives = [];
for (const directory of [
  ...previous.previousArchives.map(
    (row: { directory: string }) => row.directory,
  ),
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
  for (const [path, sha] of Object.entries(records) as [string, string][]) {
    if (
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      (await hash(`${directory}/${path}`)) !== sha
    )
      throw new Error(`Changed historical evidence ${directory}/${path}`);
  }
  previousArchives.push({ directory, records: Object.keys(records).length });
}
const guards = [];
for (const pkg of ['core', 'react']) {
  const manifest = await read(`packages/${pkg}/package.json`);
  if (
    !manifest.private ||
    manifest.scripts.prepublishOnly !==
      `node -e "throw new Error('npm publishing is disabled during private validation')"`
  )
    throw new Error('Publication policy changed');
  const child = Bun.spawn(['bun', 'run', 'prepublishOnly'], {
    cwd: resolve(root, 'packages', pkg),
    stdout: 'ignore',
    stderr: 'ignore',
  });
  const exitCode = await child.exited;
  if (exitCode !== 1)
    throw new Error('Publication guard no longer fails closed');
  guards.push({
    pkg,
    private: true,
    rejectedPrepublishExitCode: exitCode,
    registryWrites: 0,
  });
}
const controls = await read('.artifacts/m4-coordination/controls.json');
if (
  controls.visibility !== 'PRIVATE' ||
  controls.m2 !== 'OPEN' ||
  controls.m4 !== 'OPEN'
)
  throw new Error('Project control changed');
const archive = `.artifacts/evidence-runs/m4-coordination-${native.sha256.slice(0, 12)}-${Date.now()}`;
const inputs = new Set<string>([
  ...Object.keys(native.sourceFiles),
  ...Object.keys(native.buildInputs),
  ...Object.keys(adapter.sources),
  ...browserPaths,
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
  'AGENTS.md',
  'docs/roadmap.md',
  'docs/implementation/requirements.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/coordination-quickstart.md',
  'docs/implementation/m4/coordination-progress.md',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  'docs/implementation/m4/animation-fixtures.json',
  'docs/implementation/m4/table-fixtures.json',
  '.artifacts/m4-coordination/diagnostics/pre-final-guard/core.tgz',
  '.artifacts/m4-coordination/diagnostics/pre-final-guard/react.tgz',
  '.artifacts/m4-coordination/diagnostics/observer-only/core.tgz',
  '.artifacts/m4-coordination/diagnostics/visibility-red/core.tgz',
  '.artifacts/m4-coordination/diagnostics/visibility-red/react.tgz',
  'package.json',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'biome.json',
  'packages/core/package.json',
  'packages/react/package.json',
]);
for (const directory of [
  'packages/core/src',
  'packages/core/dist',
  'packages/core/test',
  'packages/react/src',
  'packages/react/dist',
  'packages/react/test',
  'scripts',
  'tests',
  '.artifacts/m4-coordination',
  '.artifacts/m3/react-test-results',
  '.artifacts/m3/next-test-results',
  '.artifacts/m4/test-results',
  '.artifacts/m4/table-parts-results',
  'test-results',
  '.artifacts/m4-presets/test-results',
]) {
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  }))
    if (!file.split('/').includes('node_modules') && !file.endsWith('.tgz'))
      inputs.add(`${directory}/${file}`);
}
for (const directory of ['.artifacts/m3', '.artifacts/m4'])
  for await (const file of new Bun.Glob('*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  }))
    if (!file.endsWith('.tgz')) inputs.add(`${directory}/${file}`);
for await (const file of new Bun.Glob('playwright*.config.ts').scan(root))
  inputs.add(file);
const sourceArchive: Record<string, string> = {};
for (const path of [...inputs].sort()) {
  const target = resolve(root, archive, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, path), target);
  sourceArchive[path] = await hash(`${archive}/${path}`);
}
const artifactFiles: Record<string, string> = {};
for (const [name, artifact] of Object.entries(packet.artifacts) as [
  string,
  { path: string; sha256: string },
][]) {
  const path = `artifacts/${name}.tgz`,
    target = resolve(root, archive, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(artifact.path, target);
  artifactFiles[path] = await hash(`${archive}/${path}`);
  if (artifactFiles[path] !== artifact.sha256)
    throw new Error('Archive artifact mismatch');
}
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  status:
    'Mixed/nested ownership checkpoint; M4 implementation and qualification remain incomplete',
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  sequenceApproval:
    'https://github.com/b4rb13/dot-loaders/issues/18#issuecomment-6251884195',
  archive,
  artifacts: packet.artifacts,
  implemented: [
    'Nested mutations invalidate the nearest owner; simple outer wrapper reveals continue, while captured rich/custom plans conservatively settle. Structural removal and owned-content changes still settle stale plans.',
    'Placeholder/refresh layers inherit ancestor visibility, preventing nested pending layers from escaping hidden replacement content.',
    'Meaningful presentation changes invalidate cached descendant eligibility; equal attribute writes cannot create a notification loop.',
    'Current native/React mixed nine-export scene: independent rich readiness, three-level nesting, targets/focus/content identity, reentrancy/supersession, insertion/removal and document saturation/teardown.',
  ],
  browsers,
  nativePacked: {
    path: '.artifacts/packed-report.json',
    declarationsAndImports: 'pass',
    downloadGate: 'fail',
  },
  reactPacked: {
    path: '.artifacts/m3/packed-react-report.json',
    result: adapter.result,
  },
  ssr: { path: '.artifacts/m3/ssr-output.json', result: ssr.result },
  clean: {
    path: '.artifacts/m3/clean-reproduction.json',
    result: clean.result,
  },
  jobs,
  postSourceChecks,
  sizes,
  changedProduction,
  fixtureCSP,
  unchangedRendering,
  previousArchives,
  sourceArchive,
  artifactFiles,
  guards,
  controls,
  gates: {
    coordinationFunctionalScope: 'pass; explicit fixture scope only',
    m4FunctionalCompletion: 'incomplete; see functional-checklist.md',
    nativeDownload: 'fail',
    completeOptionalDownload: 'fail',
    significantGrowth: 'held; no owner acceptance or baseline reset',
    m2: 'open',
    m4: 'open',
    renderer: 'provisional',
    npmPublishing: 'disabled',
    performanceSampling:
      'deferred under implementation-first sequence; previous measurements retain their original artifacts',
    referenceAndManualQualification: 'unverified',
    fullCatalogAndNewFrameworkMatrix: 'incomplete',
    ownerVisualReview: 'unverified',
  },
  limitations: [
    'Tests retain the existing first-primary-source policy in a single region; independent rich presentations use separately controlled nested regions. Complete same-owner rich/custom source/projection coverage is not certified.',
    'Only mutation routing, presentation eligibility and inherited visibility change in production; painting, definitions, geometry bounds, frame service and public API remain unchanged.',
    'Resource inspection verifies 4096 per painter and 16384 document dots plus final teardown; it is not the three-by-100 heap experiment, performance sampling or physical memory qualification.',
    'Current React scene covers native commit/runtime ownership; complete new-family maintained-line Next/RSC/SSR and normal-speed owner visual acceptance remain open.',
    'Earlier failed fixture/setup reports are retained. No assertion, duration, budget, baseline, visual tolerance or approval rule is relaxed.',
    'No cloud session/export, external source consultation, publication, deployment or visibility change occurred.',
  ],
};
const text = `${JSON.stringify(evidence, null, 2)}\n`;
await writeFile(resolve(root, archive, 'evidence.json'), text);
await writeFile(
  resolve(root, 'docs/implementation/m4/coordination-evidence.json'),
  text,
);
console.log(
  JSON.stringify(
    {
      archive,
      records:
        Object.keys(sourceArchive).length + Object.keys(artifactFiles).length,
      priorRecords: previousArchives.reduce((sum, row) => sum + row.records, 0),
      browserPasses: browsers.reduce((sum, row) => sum + row.expected, 0),
      gates: evidence.gates,
    },
    null,
    2,
  ),
);
