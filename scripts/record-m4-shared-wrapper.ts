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
  'docs/implementation/m4/coordination-evidence.json',
);
const packet = await read('.artifacts/m4/packed-report.json');
const native = await read('.artifacts/packed-report.json');
const react = await read('.artifacts/m3/packed-react-report.json');
const jobs = await read('.artifacts/m4-shared-wrapper/verification/jobs.json');
if (
  jobs.length !== 20 ||
  jobs.some(
    (job: { exitCode: number; expectedExitCode: number }) =>
      job.exitCode !== job.expectedExitCode,
  )
)
  throw new Error('Incomplete focused verification');
if (
  !(
    await Bun.file(
      resolve(
        root,
        '.artifacts/m4-shared-wrapper/verification/native-packed.log',
      ),
    ).text()
  ).includes('Closure size gate failed; report retained.')
)
  throw new Error('Unexpected packed-consumer failure');
for (const [name, artifact] of Object.entries(packet.artifacts) as [
  string,
  { path: string; sha256: string },
][]) {
  if (
    artifact.sha256 !== previous.artifacts[name].sha256 ||
    (await hash(artifact.path)) !== artifact.sha256
  )
    throw new Error(
      'This coverage checkpoint must keep the exact runtime pair',
    );
}
if (
  native.sha256 !== packet.artifacts.core.sha256 ||
  react.sha256 !== packet.artifacts.react.sha256 ||
  react.native.sha256 !== native.sha256 ||
  react.result !== 'pass'
)
  throw new Error('Stale or failed packed pair');
for (const [path, sha] of Object.entries({
  ...native.sourceFiles,
  ...native.buildInputs,
  ...react.sources,
}) as [string, string][])
  if ((await hash(path)) !== sha)
    throw new Error(`Changed verified input ${path}`);
const unchangedProduction: Record<string, string> = {};
for (const directory of ['packages/core/src', 'packages/react/src']) {
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    const path = `${directory}/${file}`,
      sha = await hash(path);
    if (sha !== previous.sourceArchive[path])
      throw new Error(`Unexpected production change ${path}`);
    unchangedProduction[path] = sha;
  }
}
for (const path of Object.keys(previous.sourceArchive))
  if (/^packages\/(core|react)\/src\//.test(path) && !unchangedProduction[path])
    throw new Error('Production file removed');
const fixture = await read('.artifacts/m4-shared-wrapper/fixtures.json');
if (JSON.stringify(fixture.artifacts) !== JSON.stringify(packet.artifacts))
  throw new Error('Stale fixture pair');
for (const [path, sha] of Object.entries(fixture.hashes) as [string, string][])
  if (
    (await hash(
      path.startsWith('tests/') ? path : `.artifacts/m4-shared-wrapper/${path}`,
    )) !== sha
  )
    throw new Error(`Stale fixture ${path}`);
const browsers = [];
for (const [path, expected] of [
  ['.artifacts/m4-shared-wrapper/browser-results.json', 102],
  ['.artifacts/m4-coordination/browser-results.json', 84],
] as const) {
  const report = await read(path);
  if (
    report.stats.expected !== expected ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.stats.skipped ||
    report.errors.length ||
    JSON.stringify(report.config.metadata.artifacts) !==
      JSON.stringify(packet.artifacts)
  )
    throw new Error(`Incomplete or stale browser report ${path}`);
  browsers.push({ path, ...report.stats });
}
const failedFixtures = [];
for (const [directory, expected, unexpected] of [
  ['initial-snapshot-assumption', 84, 6],
  ['table-fallback-assumption', 96, 6],
] as const) {
  const path = `.artifacts/m4-shared-wrapper/diagnostics/${directory}`;
  const report = await read(`${path}/browser-results.json`);
  if (
    report.stats.expected !== expected ||
    report.stats.unexpected !== unexpected ||
    report.stats.flaky ||
    report.stats.skipped
  )
    throw new Error('Original fixture findings missing');
  const oldFixture = await read(`${path}/fixtures.json`);
  for (const [source, sha] of Object.entries(oldFixture.hashes) as [
    string,
    string,
  ][]) {
    const original = source.startsWith('tests/')
      ? `${path}/fixture-source/${source.split('/').at(-1)}`
      : `${path}/${source}`;
    if ((await hash(original)) !== sha)
      throw new Error(`Missing original fixture source ${original}`);
  }
  failedFixtures.push({
    path,
    ...report.stats,
    disposition:
      'Test assertion assumed a stronger snapshot shape than the existing public contract; corrected explicitly, no production weakening or retry waiver.',
  });
}
const ssr = await read('.artifacts/m3/ssr-output.json');
const clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  ssr.result !== 'pass' ||
  ssr.nativeSha256 !== native.sha256 ||
  ssr.reactSha256 !== react.sha256 ||
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== native.sha256 ||
  clean.reproducedTarballSha256.react !== react.sha256
)
  throw new Error('SSR/clean reproduction mismatch');
const sizes = {
  defaults: packet.sizes,
  native: { sizes: native.sizes, external: native.externalModeGzip },
  text: await read('.artifacts/m4/text-animation-closures.json'),
  chart: await read('.artifacts/m4/chart-animation-closures.json'),
  table: await read('.artifacts/m4/table-animation-closures.json'),
  regressions: await read('.artifacts/m4/size-regressions.json'),
};
if (
  JSON.stringify(sizes.defaults) !== JSON.stringify(previous.sizes.defaults) ||
  sizes.regressions.regressions.length !==
    previous.sizes.regressions.regressions.length ||
  !sizes.regressions.hardFailures.length
)
  throw new Error('Unexpected byte or gate change');
for (const name of ['text', 'chart', 'table'] as const)
  if (
    sizes[name].artifacts.core.sha256 !== native.sha256 ||
    sizes[name].artifacts.react.sha256 !== react.sha256
  )
    throw new Error('Stale optional closure measurement');
for (const path of [
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/requirements.json',
  'scripts/check-m4-budgets.ts',
  'scripts/check-chart-options.ts',
  'scripts/check-table-options.ts',
])
  if ((await hash(path)) !== previous.sourceArchive[path])
    throw new Error(`Policy or original requirements changed ${path}`);
const requirements = await read(
  'docs/implementation/m4/requirement-review.json',
);
const oldReview = await read(
  `${previous.archive}/docs/implementation/m4/requirement-review.json`,
);
if (
  JSON.stringify(requirements.requirements) !==
    JSON.stringify(oldReview.requirements) ||
  requirements.requirements.length !== 717
)
  throw new Error('Lossy requirement review');
const ids = new Set(
  (await read('docs/implementation/requirements.json')).requirements.map(
    (r: { id: string }) => r.id,
  ),
);
if (
  requirements.sharedWrapperContinuation.requirementIds.some(
    (id: string) => !ids.has(id),
  )
)
  throw new Error('Unknown scoped requirement');
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
      throw new Error(`Changed historical evidence ${directory}/${path}`);
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
const controls = await read('.artifacts/m4-shared-wrapper/controls.json');
if (
  controls.visibility !== 'PRIVATE' ||
  controls.m2 !== 'OPEN' ||
  controls.m4 !== 'OPEN'
)
  throw new Error('Project controls changed');
const cleanup = await read('.artifacts/m4-shared-wrapper/fixture-cleanup.json');
if (cleanup.ports.some((entry: { open: boolean }) => entry.open))
  throw new Error('Owned fixture remains open');
const postChecks = await read(
  '.artifacts/m4-shared-wrapper/post-source-checks.json',
);
if (
  postChecks.length !== 2 ||
  postChecks.some((entry: { exitCode: number }) => entry.exitCode)
)
  throw new Error('Final source checks failed');
const archive = `.artifacts/evidence-runs/m4-shared-wrapper-${native.sha256.slice(0, 12)}-${Date.now()}`;
const inputs = new Set<string>([
  ...Object.keys(native.sourceFiles),
  ...Object.keys(native.buildInputs),
  ...Object.keys(react.sources),
  ...browsers.map((entry) => entry.path),
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
  'docs/implementation/m4/coordination-evidence.json',
  'docs/implementation/m4/coordination-receipt.json',
  'docs/implementation/m4/shared-wrapper-progress.md',
  'docs/implementation/m4/shared-wrapper-quickstart.md',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/size-baseline.json',
  'AGENTS.md',
  'docs/roadmap.md',
  'package.json',
  'scripts/verify-clean.ts',
  'scripts/prepare-shared-wrapper.ts',
  'scripts/record-m4-shared-wrapper.ts',
  'playwright.shared-wrapper.config.ts',
]);
for (const directory of [
  'packages/core/src',
  'packages/core/dist',
  'packages/react/src',
  'packages/react/dist',
  'tests/shared-wrapper',
  '.artifacts/m4-shared-wrapper',
]) {
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  }))
    if (!file.split('/').includes('node_modules'))
      inputs.add(`${directory}/${file}`);
}
for (const file of [
  'packed-report.json',
  'text-animation-closures.json',
  'chart-animation-closures.json',
  'table-animation-closures.json',
  'size-regressions.json',
])
  inputs.add(`.artifacts/m4/${file}`);
const sourceArchive: Record<string, string> = {};
for (const path of [...inputs].sort()) {
  const destination = resolve(root, archive, path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, path), destination);
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
    'Scoped shared-wrapper rich/custom and projection coverage; complete M4 implementation and qualification remain incomplete',
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  archive,
  sequenceApproval:
    'https://github.com/b4rb13/dot-loaders/issues/18#issuecomment-6251884195',
  artifacts: packet.artifacts,
  changedProduction: [],
  unchangedProduction,
  implemented: [
    'Packed native/current React shared wrapper with skeleton/typing and one rich source, custom skeleton/chart/table handoff and explicit region/preset override over mixed chart/table placeholders.',
    'Immutable/captured source input, exact and nested projection limits, bounded null/error/invalid attempts, legacy geometry bridge and reentrant callback robustness.',
    'Immediate content/focus priority, preserved identity/handler/app styles, revoked commands, exact completion, next-handoff options, theme invalidation, dynamic targets, competing app effects and teardown.',
  ],
  browsers,
  failedFixtures,
  jobs,
  postChecks,
  sizes,
  ssr: { path: '.artifacts/m3/ssr-output.json', result: ssr.result },
  clean: {
    path: '.artifacts/m3/clean-reproduction.json',
    result: clean.result,
  },
  carriedForward: {
    packet: 'docs/implementation/m4/coordination-evidence.json',
    archive: previous.archive,
    browsers: previous.browsers,
    scope:
      'Original same-pair reports remain historical observations; only the two browser suites above were rerun for this checkpoint. No fresh full performance, memory, visual, browser-floor or physical/manual qualification.',
  },
  previousArchives,
  sourceArchive,
  artifactFiles,
  guards,
  controls,
  cleanup,
  gates: {
    sharedWrapperScopedCoverage: 'pass',
    m4FunctionalCompletion: 'incomplete',
    multiRichAutomaticChoreography:
      'unverified; existing first-primary-source behavior is not full composition',
    nativeDownload: 'fail',
    completeOptionalDownload: 'fail',
    significantGrowth: 'held; baseline unchanged',
    m2: 'open',
    m4: 'open',
    renderer: 'provisional',
    npmPublishing: 'disabled',
    performanceSampling: 'deferred; production pair unchanged',
    fullFrameworkAndSsrMatrix: 'incomplete',
    ownerVisualAndReferenceManualQualification: 'unverified',
  },
};
const text = `${JSON.stringify(evidence, null, 2)}\n`;
await writeFile(resolve(root, archive, 'evidence.json'), text);
await writeFile(
  resolve(root, 'docs/implementation/m4/shared-wrapper-evidence.json'),
  text,
);
console.log(
  JSON.stringify(
    {
      archive,
      records:
        Object.keys(sourceArchive).length + Object.keys(artifactFiles).length,
      previousRecords: previousArchives.reduce(
        (sum, entry) => sum + entry.records,
        0,
      ),
      browsers: browsers.map((entry) => entry.expected),
      changedProduction: [],
    },
    null,
    2,
  ),
);
