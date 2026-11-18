import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const previous = await read(
  'docs/implementation/m4/shared-wrapper-evidence.json',
);
const policy = await read(
  `${previous.archive}/docs/implementation/m4/coordination-evidence.json`,
);
const packet = await read('.artifacts/m4/packed-report.json');
const native = await read('.artifacts/packed-report.json');
const adapter = await read('.artifacts/m3/packed-react-report.json');
const jobs = await read('.artifacts/m4-multi-rich/verification/jobs.json');
if (
  jobs.length !== 32 ||
  jobs.some(
    (job: { exitCode: number; expectedExitCode: number }) =>
      job.exitCode !== job.expectedExitCode,
  )
)
  throw new Error('Incomplete final verification');
if (
  !(
    await Bun.file(
      resolve(root, '.artifacts/m4-multi-rich/verification/native-packed.log'),
    ).text()
  ).includes('Closure size gate failed; report retained.')
)
  throw new Error('Unexpected native packed failure');
if (
  native.sha256 !== packet.artifacts.core.sha256 ||
  adapter.sha256 !== packet.artifacts.react.sha256 ||
  adapter.native.sha256 !== native.sha256 ||
  adapter.result !== 'pass'
)
  throw new Error('Stale pair');
for (const artifact of Object.values(packet.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(artifact.path)) !== artifact.sha256)
    throw new Error('Changed tarball');
for (const [path, sha] of Object.entries({
  ...native.sourceFiles,
  ...native.buildInputs,
  ...adapter.sources,
}) as [string, string][])
  if ((await hash(path)) !== sha)
    throw new Error(`Changed verified input ${path}`);
const changedProduction = [];
for (const directory of ['packages/core/src', 'packages/react/src'])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    const path = `${directory}/${file}`;
    if ((await hash(path)) !== previous.sourceArchive[path])
      changedProduction.push(path);
  }
const expectedChanges = [
  'packages/core/src/chart.ts',
  'packages/core/src/table.ts',
  'packages/core/src/region.ts',
  'packages/core/src/internal/chart-participant.ts',
  'packages/core/src/internal/coordinated-handoff.ts',
  'packages/core/src/internal/handoff.ts',
  'packages/core/src/internal/loading-controller.ts',
  'packages/core/src/internal/dom.ts',
  'packages/core/src/internal/element.ts',
  'packages/core/src/internal/table-definitions.ts',
];
if (
  JSON.stringify(changedProduction.sort()) !==
  JSON.stringify(expectedChanges.sort())
)
  throw new Error('Unexpected production change set');
for (const path of [
  'packages/core/src/internal/painter.ts',
  'packages/core/src/internal/frames.ts',
  'packages/core/src/internal/runner.ts',
  'packages/core/src/internal/chart-definitions.ts',
  'packages/core/src/internal/chart-field.ts',
  'packages/core/src/internal/text-playback.ts',
  'packages/core/src/styles.ts',
])
  if ((await hash(path)) !== previous.sourceArchive[path])
    throw new Error(`Unexpected painter/recipe/style change ${path}`);
for (const path of [
  'docs/implementation/requirements.json',
  'docs/implementation/m4/size-baseline.json',
  'scripts/check-m4-budgets.ts',
  'scripts/check-chart-options.ts',
  'scripts/check-table-options.ts',
])
  if (
    (await hash(path)) !==
    (previous.sourceArchive[path] ?? policy.sourceArchive[path])
  )
    throw new Error(`Changed policy ${path}`);
const fixture = await read('.artifacts/m4-shared-wrapper/fixtures.json');
if (JSON.stringify(fixture.artifacts) !== JSON.stringify(packet.artifacts))
  throw new Error('Stale shared fixture');
for (const [path, sha] of Object.entries(fixture.hashes) as [string, string][])
  if (
    (await hash(
      path.startsWith('tests/') ? path : `.artifacts/m4-shared-wrapper/${path}`,
    )) !== sha
  )
    throw new Error(`Stale fixture ${path}`);
const reportJobs = [
  ['.artifacts/browser-results.json', 'native-browser', 322],
  ['.artifacts/m3/browser-results.json', 'react-browser', 216],
  ['.artifacts/m3/next-browser-results.json', 'next-browser', 60],
  ['.artifacts/m4-presets/browser-results.json', 'preset-browser', 51],
  [
    '.artifacts/m4-coordination/browser-results.json',
    'coordination-browser',
    84,
  ],
  ['.artifacts/m4-shared-wrapper/browser-results.json', 'shared-browser', 246],
  ['.artifacts/m4/browser-results.json', 'catalog-browser', 252],
  ['.artifacts/m4/table-results.json', 'table-browser', 90],
  ['.artifacts/m4/table-options-results.json', 'table-options-browser', 24],
  ['.artifacts/m4/table-parts-results.json', 'table-parts-browser', 27],
] as const;
const browsers = [];
for (const [path, name, minimum] of reportJobs) {
  const report = await read(path),
    metadata = report.config.metadata;
  const sha =
    metadata.artifactSha256 ??
    metadata.nativeArtifactSha256 ??
    metadata.artifacts?.core.sha256;
  const job = jobs.find((entry: { name: string }) => entry.name === name);
  if (
    sha !== native.sha256 ||
    report.stats.expected !== minimum ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.stats.skipped !== (name === 'native-browser' ? 2 : 0) ||
    report.errors.length ||
    Date.parse(report.stats.startTime) < Date.parse(job.start)
  )
    throw new Error(`Stale or failed browser scope ${path}`);
  browsers.push({ path, ...report.stats });
}
const captures = await read('.artifacts/m4-multi-rich/media/captures.json');
if (
  JSON.stringify(captures.artifacts) !== JSON.stringify(packet.artifacts) ||
  captures.rows.length !== 3 ||
  captures.rows.some(
    (row: {
      csp: unknown[];
      diagnostics: unknown[];
      identity: boolean;
      calls: { chart: number; table: number; table2: number };
    }) =>
      row.csp.length ||
      row.diagnostics.length ||
      !row.identity ||
      row.calls.chart !== 1 ||
      row.calls.table !== 1 ||
      row.calls.table2 !== 1,
  )
)
  throw new Error('Real-time capture mismatch');
for (const [path, sha] of Object.entries(captures.files) as [string, string][])
  if ((await hash(`.artifacts/m4-multi-rich/media/${path}`)) !== sha)
    throw new Error('Changed media');
const diagnostics = [];
for (const [directory, passes, failures] of [
  ['first-primary-red', 0, 6],
  ['virtual-clock-sampling', 177, 9],
  ['child-pause-red', 0, 12],
  ['source-output-red', 0, 6],
  ['persistent-output-red', 0, 6],
  ['live-cache-inspection', 132, 6],
  ['variant-row-ownership', 132, 12],
] as const) {
  const report = await read(
    `.artifacts/m4-multi-rich/diagnostics/${directory}/browser-results.json`,
  );
  if (
    report.stats.expected !== passes ||
    report.stats.unexpected !== failures ||
    report.stats.flaky ||
    report.stats.skipped
  )
    throw new Error('Original finding missing');
  diagnostics.push({ directory, ...report.stats });
}
const samplingJobs = await read('.artifacts/m4-multi-rich/sampling/jobs.json');
if (
  samplingJobs.length !== 3 ||
  samplingJobs.some((row: { exitCode: number }) => row.exitCode)
)
  throw new Error('Incomplete full sampling');
const sampling = [];
const traceFiles = new Set<string>();
for (const [profile, phase] of [
  ['normal', 'idle'],
  ['normal', 'handoff'],
  ['list', 'idle'],
] as const) {
  const pointerPath = `.artifacts/m2-catalog-native-${profile}-mixed-trace-latest-${phase}.json`;
  const pointer = await read(pointerPath),
    report = await read(pointer.report);
  if (
    (await hash(pointer.report)) !== pointer.sha256 ||
    report.artifactSha256 !== native.sha256 ||
    report.smoke ||
    report.fatal ||
    !report.protocolComplete ||
    !report.collectionPass ||
    report.warmups.length !== 3 ||
    report.wholeWork.validPairs !== 20
  )
    throw new Error('Incomplete or stale sampling cell');
  for (const [path, sha] of Object.entries(report.evidenceFiles) as [
    string,
    string,
  ][]) {
    if ((await hash(path)) !== sha) throw new Error(`Changed trace ${path}`);
    traceFiles.add(path);
  }
  traceFiles.add(pointer.report);
  traceFiles.add(pointerPath);
  sampling.push({
    pointer: pointerPath,
    report: pointer.report,
    profile,
    phase,
    wholeWork: report.wholeWork,
    summary: report.summary,
    phaseTotals: report.phaseTotals,
    qualification: report.qualification,
  });
}
const ssr = await read('.artifacts/m3/ssr-output.json'),
  clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  ssr.result !== 'pass' ||
  ssr.nativeSha256 !== native.sha256 ||
  ssr.reactSha256 !== adapter.sha256 ||
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== native.sha256 ||
  clean.reproducedTarballSha256.react !== adapter.sha256
)
  throw new Error('SSR/clean mismatch');
const sizes = {
  defaults: packet.sizes,
  native: { sizes: native.sizes, external: native.externalModeGzip },
  text: await read('.artifacts/m4/text-animation-closures.json'),
  chart: await read('.artifacts/m4/chart-animation-closures.json'),
  table: await read('.artifacts/m4/table-animation-closures.json'),
  regressions: await read('.artifacts/m4/size-regressions.json'),
};
for (const name of ['text', 'chart', 'table'] as const)
  if (
    sizes[name].artifacts.core.sha256 !== native.sha256 ||
    sizes[name].artifacts.react.sha256 !== adapter.sha256
  )
    throw new Error('Stale closure measurement');
if (
  sizes.regressions.artifacts.core.sha256 !== native.sha256 ||
  sizes.regressions.artifacts.react.sha256 !== adapter.sha256 ||
  !sizes.regressions.hardFailures.length ||
  !sizes.regressions.regressions.length
)
  throw new Error('Expected held download/growth failures missing');
const requirements = await read(
    'docs/implementation/m4/requirement-review.json',
  ),
  oldReview = await read(
    `${previous.archive}/docs/implementation/m4/requirement-review.json`,
  );
if (
  JSON.stringify(requirements.requirements) !==
    JSON.stringify(oldReview.requirements) ||
  requirements.requirements.length !== 717
)
  throw new Error('Lossy requirements');
const ids = new Set(
  (await read('docs/implementation/requirements.json')).requirements.map(
    (row: { id: string }) => row.id,
  ),
);
if (
  requirements.multiRichContinuation.requirementIds.some(
    (id: string) => !ids.has(id),
  )
)
  throw new Error('Unknown requirement');
const previousArchives = [];
for (const directory of [
  ...previous.previousArchives.map(
    (entry: { directory: string }) => entry.directory,
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
  for (const [path, sha] of Object.entries(records) as [string, string][])
    if (
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      (await hash(`${directory}/${path}`)) !== sha
    )
      throw new Error(`Changed archive ${directory}/${path}`);
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
    throw new Error('Publishing policy changed');
  const exitCode = await Bun.spawn(['bun', 'run', 'prepublishOnly'], {
    cwd: resolve(root, 'packages', pkg),
    stdout: 'ignore',
    stderr: 'ignore',
  }).exited;
  if (exitCode !== 1) throw new Error('Publishing guard failed open');
  guards.push({
    pkg,
    private: true,
    rejectedPrepublishExitCode: exitCode,
    registryWrites: 0,
  });
}
const controls = await read('.artifacts/m4-multi-rich/controls.json'),
  cleanup = await read('.artifacts/m4-multi-rich/fixture-cleanup.json'),
  postChecks = await read('.artifacts/m4-multi-rich/post-source-checks.json');
if (
  controls.visibility !== 'PRIVATE' ||
  controls.m2 !== 'OPEN' ||
  controls.m4 !== 'OPEN' ||
  cleanup.ports.some((row: { open: boolean }) => row.open) ||
  postChecks.length !== 2 ||
  postChecks.some((row: { exitCode: number }) => row.exitCode)
)
  throw new Error('Control/cleanup/final-check failure');
const archive = `.artifacts/evidence-runs/m4-multi-rich-${native.sha256.slice(0, 12)}-${Date.now()}`;
const inputs = new Set<string>([
  ...Object.keys(native.sourceFiles),
  ...Object.keys(native.buildInputs),
  ...Object.keys(adapter.sources),
  ...traceFiles,
  ...browsers.map((row) => row.path),
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
  '.artifacts/m4/packed-report.json',
  '.artifacts/m4/text-animation-closures.json',
  '.artifacts/m4/chart-animation-closures.json',
  '.artifacts/m4/table-animation-closures.json',
  '.artifacts/m4/size-regressions.json',
  'docs/implementation/m4/shared-wrapper-evidence.json',
  'docs/implementation/m4/shared-wrapper-receipt.json',
  'docs/implementation/m4/multi-rich-progress.md',
  'docs/implementation/m4/multi-rich-quickstart.md',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/size-baseline.json',
  'AGENTS.md',
  'docs/roadmap.md',
  'package.json',
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
  '.artifacts/m4-multi-rich',
  '.artifacts/m4-shared-wrapper',
  '.artifacts/m4-coordination',
  '.artifacts/m3/react-test-results',
  '.artifacts/m3/next-test-results',
  '.artifacts/m4-presets/test-results',
  '.artifacts/m4/test-results',
  '.artifacts/m4/table-results',
  '.artifacts/m4/table-options-results',
  '.artifacts/m4/table-parts-results',
  'test-results',
]) {
  if (!(await import('node:fs')).existsSync(resolve(root, directory))) continue;
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  }))
    if (!file.split('/').includes('node_modules'))
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
  const to = resolve(root, archive, path);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(resolve(root, path), to);
  sourceArchive[path] = await hash(`${archive}/${path}`);
}
const artifactFiles: Record<string, string> = {};
for (const [name, artifact] of Object.entries(packet.artifacts) as [
  string,
  { path: string; sha256: string },
][]) {
  const path = `artifacts/${name}.tgz`;
  await mkdir(resolve(root, archive, 'artifacts'), { recursive: true });
  await copyFile(artifact.path, resolve(root, archive, path));
  artifactFiles[path] = await hash(`${archive}/${path}`);
}
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  status:
    'Automatic multi-rich functional checkpoint; M2/M4 qualification remains held',
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  sequenceApproval:
    'https://github.com/b4rb13/dot-loaders/issues/18#issuecomment-6251884195',
  archive,
  artifacts: packet.artifacts,
  baseline: {
    packet: 'docs/implementation/m4/shared-wrapper-evidence.json',
    artifacts: previous.artifacts,
  },
  changedProduction,
  browsers,
  diagnostics,
  captures,
  sampling,
  samplingJobs,
  jobs,
  postChecks,
  sizes,
  ssr: { result: ssr.result },
  clean: { result: clean.result },
  previousArchives,
  sourceArchive,
  artifactFiles,
  guards,
  controls,
  cleanup,
  gates: {
    automaticMultiRichScopedImplementation: 'pass',
    m4FunctionalCompletion: 'incomplete; functional-checklist.md',
    nativeDownload: 'fail',
    completeOptionalDownload: 'fail',
    significantGrowth: 'held; baseline unchanged',
    m2: 'open',
    m4: 'open',
    renderer: 'provisional',
    npmPublishing: 'disabled',
    performanceSampling:
      'three full local catalog cells; see exact results, no reference or renderer qualification',
    multiRichHeapAndReferencePerformance:
      'unverified; per-case teardown and frozen independent-region sampling do not qualify full new-path heap/reference performance',
    fullFrameworkAndSsrMatrix: 'incomplete',
    ownerVisualManualReferenceQualification: 'unverified',
  },
};
const text = `${JSON.stringify(evidence, null, 2)}\n`;
await writeFile(resolve(root, archive, 'evidence.json'), text);
await writeFile(
  resolve(root, 'docs/implementation/m4/multi-rich-evidence.json'),
  text,
);
console.log(
  JSON.stringify(
    {
      archive,
      records:
        Object.keys(sourceArchive).length + Object.keys(artifactFiles).length,
      previousRecords: previousArchives.reduce(
        (sum, row) => sum + row.records,
        0,
      ),
      browserPasses: browsers.reduce((sum, row) => sum + row.expected, 0),
      sampling: sampling.map((row) => ({
        profile: row.profile,
        phase: row.phase,
        p95: row.wholeWork.pooledP95,
        p99: row.wholeWork.pooledP99,
        passing: row.wholeWork.passingBoth,
      })),
    },
    null,
    2,
  ),
);
