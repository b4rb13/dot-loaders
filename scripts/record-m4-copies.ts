import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const previous = await read('docs/implementation/m4/api-evidence.json');
const packed = await read('.artifacts/m4/packed-report.json');
const native = await read('.artifacts/packed-report.json');
const adapter = await read('.artifacts/m3/packed-react-report.json');
const fixture = await read('.artifacts/m4-copies/fixtures.json');
if (
  native.sha256 !== packed.artifacts.core.sha256 ||
  adapter.sha256 !== packed.artifacts.react.sha256 ||
  adapter.result !== 'pass' ||
  JSON.stringify(fixture.artifacts) !== JSON.stringify(packed.artifacts)
)
  throw Error('Mismatched package pair');
for (const artifact of Object.values(packed.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(artifact.path)) !== artifact.sha256)
    throw Error('Changed package');
for (const [path, sha] of Object.entries({
  ...native.sourceFiles,
  ...native.buildInputs,
  ...adapter.sources,
}) as [string, string][])
  if ((await hash(path)) !== sha)
    throw Error(`Changed verified source: ${path}`);
for (const [path, sha] of Object.entries(fixture.hashes) as [string, string][])
  if (
    (await hash(
      path === 'client.js' ? `.artifacts/m4-copies/${path}` : path,
    )) !== sha
  )
    throw Error(`Changed fixture: ${path}`);
const changedProduction: string[] = [];
for (const directory of ['packages/core/src', 'packages/react/src'])
  for await (const name of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    const path = `${directory}/${name}`;
    if ((await hash(path)) !== previous.sourceArchive[path])
      changedProduction.push(path);
  }
const expected = [
  'packages/core/src/chart.ts',
  'packages/core/src/table.ts',
  'packages/core/src/internal/chart-appearance.ts',
  'packages/core/src/internal/chart-field.ts',
  'packages/core/src/internal/table-field.ts',
  'packages/react/src/static.tsx',
  'packages/react/src/text.tsx',
];
if (
  JSON.stringify(changedProduction.sort()) !== JSON.stringify(expected.sort())
)
  throw Error('Unexpected production scope');
for (const path of [
  'docs/implementation/requirements.json',
  'docs/implementation/m4/size-baseline.json',
  'scripts/check-m4-budgets.ts',
  'scripts/check-chart-options.ts',
  'scripts/check-table-options.ts',
])
  if ((await hash(path)) !== previous.sourceArchive[path])
    throw Error(`Changed policy: ${path}`);
const review = await read('docs/implementation/m4/requirement-review.json');
const oldReview = await read(
  `${previous.archive}/docs/implementation/m4/requirement-review.json`,
);
const registry = await read('docs/implementation/m4/api-coverage.json');
const oldRegistry = await read(
  `${previous.archive}/docs/implementation/m4/api-coverage.json`,
);
if (
  JSON.stringify(review.requirements) !==
    JSON.stringify(oldReview.requirements) ||
  review.requirements.length !== 717 ||
  JSON.stringify(registry.clauses) !== JSON.stringify(oldRegistry.clauses)
)
  throw Error('Changed original clause statuses/mappings');
const publicDeclarations = [];
for (const name of ['core', 'react']) {
  const manifest = await read(`packages/${name}/package.json`);
  for (const [entry, target] of Object.entries(manifest.exports) as [
    string,
    string | { types: string },
  ][]) {
    if (typeof target === 'string') continue;
    const path = `packages/${name}/${target.types.replace(/^\.\//, '')}`;
    const sha256 = await hash(path);
    if (sha256 !== previous.sourceArchive[path])
      throw Error(`Changed public declaration: ${path}`);
    publicDeclarations.push({
      package: name,
      entry,
      path,
      sha256,
      byteIdenticalToPrecedingCheckpoint: true,
    });
  }
}
const jobs = await read('.artifacts/m4-copies/jobs.json');
if (
  jobs.length !== 24 ||
  jobs.some(
    (job: { exit: number; expected: number }) => job.exit !== job.expected,
  )
)
  throw Error('Incomplete verification');
const finalJobs = await read('.artifacts/m4-copies/final-jobs.json');
if (
  finalJobs.length !== 3 ||
  finalJobs.some((row: { exit: number }) => row.exit !== 0)
)
  throw Error('Final fixture verification incomplete');
for (const name of ['core', 'react'])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, `packages/${name}/dist`),
    onlyFiles: true,
  })) {
    if (
      (await hash(
        resolve(
          fixture.consumer,
          `node_modules/@dotquilt-internal/${name}/dist`,
          file,
        ),
      )) !== (await hash(`packages/${name}/dist/${file}`))
    )
      throw Error('Installed copy differs from verified compiled package');
  }
const reports = [
  ['.artifacts/m4-copies/browser-results.json', 240, 0],
  ['.artifacts/m4-shared-wrapper/browser-results.json', 0, 0],
  ['.artifacts/m4-copies/api-browser.json', 75, 0],
  ['.artifacts/m4-copies/native-browser.json', 322, 2],
  ['.artifacts/m3/browser-results.json', 312, 0],
  ['.artifacts/m4/browser-results.json', 252, 0],
  ['.artifacts/m3/next-browser-results.json', 102, 0],
] as const;
const browsers = [];
for (const [path, expected, skipped] of reports) {
  const report = await read(path),
    metadata = report.config.metadata;
  if (
    (metadata.artifacts &&
      JSON.stringify(metadata.artifacts) !==
        JSON.stringify(packed.artifacts)) ||
    (metadata.artifactSha256 && metadata.artifactSha256 !== native.sha256) ||
    (metadata.nativeArtifactSha256 &&
      (metadata.nativeArtifactSha256 !== native.sha256 ||
        metadata.reactArtifactSha256 !== adapter.sha256)) ||
    (!metadata.artifacts &&
      !metadata.artifactSha256 &&
      !metadata.nativeArtifactSha256)
  )
    throw Error(`Unbound browser report: ${path}`);
  if (
    (expected && report.stats.expected !== expected) ||
    report.stats.skipped !== skipped ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.errors.length
  )
    throw Error(`Browser failure: ${path}`);
  if (path.includes('shared-wrapper') && report.stats.expected !== 246)
    throw Error('Shared-wrapper matrix changed');
  browsers.push({
    path,
    sha256: await hash(path),
    metadata,
    startTime: report.stats.startTime,
    ...report.stats,
  });
}
const ssr = await read('.artifacts/m4-react-catalog/ssr.json');
if (
  !ssr.functionalPass ||
  ssr.rows.length !== 8 ||
  ssr.artifacts.core !== native.sha256 ||
  ssr.artifacts.react !== adapter.sha256
)
  throw Error('SSR functional failure');
const clean = await read('.artifacts/m3/clean-reproduction.json');
if (clean.result !== 'pass') throw Error('Clean reproduction failed');
const oldSizes = (
  await read(`${previous.archive}/.artifacts/m4/packed-report.json`)
).sizes;
const newAbsoluteModeMisses = [];
for (const [entry, sizes] of Object.entries(packed.sizes) as [
  string,
  Record<string, number>,
][]) {
  const before = oldSizes[entry];
  for (const [mode, limitKey] of entry.endsWith('-react')
    ? [
        ['increment', 'incrementLimit'],
        ['externalIncrement', 'incrementLimit'],
      ]
    : [
        ['gzip', 'limit'],
        ['external', 'limit'],
      ]) {
    if (!mode || !limitKey) throw Error('Invalid mode');
    const currentBytes = sizes[mode],
      limit = sizes[limitKey],
      previousBytes = before?.[mode];
    if (
      typeof currentBytes === 'number' &&
      typeof limit === 'number' &&
      typeof previousBytes === 'number' &&
      previousBytes <= limit &&
      currentBytes > limit
    )
      newAbsoluteModeMisses.push({
        entry,
        mode,
        previousBytes,
        currentBytes,
        limit,
        status: 'held-failure; no waiver or baseline advance',
      });
  }
}
const sizeReports = [];
for (const path of [
  '.artifacts/m4/size-regressions.json',
  '.artifacts/m4/text-animation-closures.json',
  '.artifacts/m4/chart-animation-closures.json',
  '.artifacts/m4/table-animation-closures.json',
  '.artifacts/m4/chart-animation-budget.json',
  '.artifacts/m4/table-animation-budget.json',
]) {
  const report = await read(path);
  if (JSON.stringify(report.artifacts) !== JSON.stringify(packed.artifacts))
    throw Error(`Unbound size report ${path}`);
  sizeReports.push({
    path,
    sha256: await hash(path),
    result: report.result ?? 'measurement-only',
    hardFailures: report.hardFailures,
    significantGrowthFlags: report.regressions?.length,
    failures: report.failures,
  });
}
const guards = [];
for (const name of ['core', 'react']) {
  const pkg = await read(`packages/${name}/package.json`);
  const guard = pkg.scripts.prepublishOnly;
  if (
    !pkg.private ||
    guard !==
      `node -e "throw new Error('npm publishing is disabled during private validation')"`
  )
    throw Error('Publication policy changed');
  const run = Bun.spawn(
    [
      'node',
      '-e',
      "throw new Error('npm publishing is disabled during private validation')",
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  );
  const [exitCode, stderr] = await Promise.all([
    run.exited,
    new Response(run.stderr).text(),
  ]);
  if (exitCode !== 1 || !stderr.includes('npm publishing is disabled'))
    throw Error('Publication guard failed');
  guards.push({
    package: name,
    private: pkg.private,
    exitCode,
    message: 'npm publishing is disabled during private validation',
    method: 'Executed exact Node guard; no registry operation.',
  });
}
const ports = await Promise.all(
  [4181, 4191, 4192, 4193, 4194, 4202, 4203, 4206].map(
    (port) =>
      new Promise<{ port: number; open: boolean }>((done, reject) => {
        const socket = connect({ host: '127.0.0.1', port });
        socket.once('connect', () => {
          socket.destroy();
          done({ port, open: true });
        });
        socket.once('error', (error: NodeJS.ErrnoException) => {
          socket.destroy();
          if (error.code === 'ECONNREFUSED') done({ port, open: false });
          else reject(error);
        });
        socket.setTimeout(1000, () => {
          socket.destroy();
          reject(Error('Unknown port state'));
        });
      }),
  ),
);
const controls = {
  visibility: (await read('.artifacts/m4-copies/repository-control.json'))
    .visibility,
  m2: (await read('.artifacts/m4-copies/m2-control.json')).state,
  m4: (await read('.artifacts/m4-copies/m4-control.json')).state,
  ports,
};
if (
  controls.visibility !== 'PRIVATE' ||
  controls.m2 !== 'OPEN' ||
  controls.m4 !== 'OPEN' ||
  ports.some((p) => p.open)
)
  throw Error('Control failure');
const browserVersions = [];
for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch({ headless: true });
  try {
    browserVersions.push({ engine: type.name(), version: browser.version() });
  } finally {
    await browser.close();
  }
}
const environment = {
  collectedAt: new Date().toISOString(),
  bun: Bun.version,
  node: new TextDecoder()
    .decode(Bun.spawnSync(['node', '--version']).stdout)
    .trim(),
  bunNodeCompatibilityVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  browserVersions,
  limitation:
    'Local installed engines only; no browser-floor/manual AT/physical reference qualification.',
};
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
  for (const [path, sha] of Object.entries(records) as [string, string][])
    if (
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      (await hash(`${directory}/${path}`)) !== sha
    )
      throw Error(`Historical record changed: ${directory}/${path}`);
  previousArchives.push({ directory, records: Object.keys(records).length });
}
for (const row of previous.supplementalArchives) {
  if ((await hash(`${row.archive}/manifest.json`)) !== row.manifestSha256)
    throw Error('Historical diagnostics changed');
  const manifest = await read(`${row.archive}/manifest.json`);
  for (const [path, sha] of Object.entries(manifest.files) as [
    string,
    string,
  ][])
    if ((await hash(`${row.archive}/${path}`)) !== sha)
      throw Error('Historical diagnostic changed');
}
const archive = `.artifacts/evidence-runs/m4-copies-${native.sha256.slice(0, 12)}-${Date.now()}`;
const inputs = new Set<string>([
  ...Object.keys(native.sourceFiles),
  ...Object.keys(native.buildInputs),
  ...Object.keys(adapter.sources),
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/browser-results.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/next-consumers.json',
  '.artifacts/m3/next-browser-results.json',
  '.artifacts/m3/clean-reproduction.json',
  '.artifacts/m4/packed-report.json',
  '.artifacts/m4/browser-results.json',
  ...sizeReports.map((r) => r.path),
  'docs/implementation/m4/copies-progress.md',
  'docs/implementation/m4/copies-quickstart.md',
  'docs/implementation/m4/copies-matrix.json',
  'docs/implementation/m4/api-coverage.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/size-baseline.json',
  'docs/roadmap.md',
  'AGENTS.md',
  'package.json',
  'tsconfig.json',
  'biome.json',
]);
for (const directory of [
  'packages/core/src',
  'packages/core/dist',
  'packages/react/src',
  'packages/react/dist',
  'packages/core/test',
  'packages/react/test',
  'scripts',
  'tests',
  'examples',
  '.artifacts/m4-copies',
  '.artifacts/m4-shared-wrapper',
  '.artifacts/m4-react-catalog',
])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  }))
    if (!file.split('/').includes('node_modules'))
      inputs.add(`${directory}/${file}`);
for await (const file of new Bun.Glob('playwright*.config.ts').scan(root))
  inputs.add(file);
const sourceArchive: Record<string, string> = {},
  consumerFiles: Record<string, string> = {},
  artifactFiles: Record<string, string> = {};
async function copy(
  source: string,
  path: string,
  records: Record<string, string>,
) {
  await mkdir(dirname(resolve(root, archive, path)), { recursive: true });
  await copyFile(resolve(root, source), resolve(root, archive, path));
  records[path] = await hash(`${archive}/${path}`);
}
for (const path of [...inputs].sort()) await copy(path, path, sourceArchive);
for (const file of ['client.tsx', 'scene.tsx', 'app.css'])
  await copy(
    resolve(fixture.consumer, 'copies', file),
    `consumer/copies/${file}`,
    consumerFiles,
  );
const nextConsumers = await read('.artifacts/m3/next-consumers.json');
if (
  nextConsumers.nativeSha256 !== native.sha256 ||
  nextConsumers.reactSha256 !== adapter.sha256 ||
  nextConsumers.result !== 'pass'
)
  throw Error('Unbound production Next consumers');
const nextRuntimeVersions = [];
for (const [line, directory] of Object.entries(nextConsumers.consumers) as [
  string,
  string,
][]) {
  for (const area of ['app', '.next/server', '.next/static'])
    for await (const file of new Bun.Glob('**/*').scan({
      cwd: resolve(directory, area),
      onlyFiles: true,
    }))
      await copy(
        resolve(directory, area, file),
        `consumers/next-${line}/${area}/${file}`,
        consumerFiles,
      );
  for (const name of ['package.json', 'package-lock.json', '.next/BUILD_ID'])
    await copy(
      resolve(directory, name),
      `consumers/next-${line}/${name}`,
      consumerFiles,
    );
  const run = Bun.spawn(
    [
      'node',
      '-e',
      `console.log(JSON.stringify({next:require('next/package.json').version,react:require('react').version,bundledReact:require('next/dist/compiled/react').version}))`,
    ],
    { cwd: directory, stdout: 'pipe', stderr: 'pipe' },
  );
  const [text, exit] = await Promise.all([
    new Response(run.stdout).text(),
    run.exited,
  ]);
  if (exit) throw Error('Cannot read actual Next runtime versions');
  nextRuntimeVersions.push({ line, ...JSON.parse(text) });
}
for (const [name, artifact] of Object.entries(packed.artifacts) as [
  string,
  { path: string },
][])
  await copy(artifact.path, `artifacts/${name}.tgz`, artifactFiles);
// Retain the exact intermediate pair used by pre-fix adapter diagnostics.
const diagnosticCore =
  '.artifacts/m4/history/core-5253a6f23f33263c525b3cd7fb21ae3da72e3716c0973afbb52bb3e03f086113.tgz';
if ((await hash(diagnosticCore)) !== native.sha256)
  throw Error('Intermediate core changed');
const diagnosticReact =
  '.artifacts/m4/history/react-d688fca2ea4a5509bba360da651c900ec845814239417d40561f4b5d3dc183e0.tgz';
if ((await hash(diagnosticReact)) !== previous.artifacts.react.sha256)
  throw Error('Diagnostic adapter changed');
await copy(diagnosticReact, 'artifacts/diagnostic-react.tgz', artifactFiles);
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  status:
    'Scoped custom/provider/compatible-copy implementation checkpoint; feature freeze and qualification remain open',
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  archive,
  artifacts: packed.artifacts,
  baseline: {
    packet: 'docs/implementation/m4/api-evidence.json',
    artifacts: previous.artifacts,
  },
  changedProduction,
  publicDeclarations,
  browsers,
  browserPasses: browsers.reduce((n, r) => n + r.expected, 0),
  expectedHeapSkips: 2,
  jobs,
  finalJobs,
  ssr: {
    functionalPass: ssr.functionalPass,
    result: ssr.result,
    rows: ssr.rows.length,
    source: '.artifacts/m4-react-catalog/ssr.json',
  },
  clean: {
    result: clean.result,
    source: '.artifacts/m3/clean-reproduction.json',
  },
  sizeReports,
  newAbsoluteModeMisses,
  guards,
  controls,
  environment,
  nextRuntimeVersions,
  previousArchives,
  supplementalArchives: previous.supplementalArchives,
  sourceArchive,
  consumerFiles,
  artifactFiles,
  gates: {
    m2: 'OPEN',
    m4: 'OPEN',
    renderers: 'provisional',
    npmPublishing: 'disabled',
    sourceLocalUncommitted: true,
    featureFreeze: false,
    fullM2Sampling:
      'Deferred until substantial engine work/feature freeze; metadata/hydration fixes do not qualify timings.',
    remaining: [
      'Unlisted mixed/nested source, option, variant and target combinations; frozen framework/environment matrix.',
      'Maximum-input reserved-layout/CLS and final private export-boundary disposition.',
      'Owner normal-speed review and feature freeze.',
      'Unchanged size/growth, SSR markup, M2 rendering/setup/init/long-task/regression/reference/manual qualification.',
      'M5 and all publication/distribution/cloud/deployment/visibility actions need separate authorization.',
    ],
  },
};
await mkdir(resolve(root, archive), { recursive: true });
for (const path of [
  `${archive}/evidence.json`,
  'docs/implementation/m4/copies-evidence.json',
])
  await writeFile(
    resolve(root, path),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
console.log(
  JSON.stringify(
    {
      archive,
      records:
        Object.keys(sourceArchive).length +
        Object.keys(consumerFiles).length +
        Object.keys(artifactFiles).length,
      previousRecordsVerified: previousArchives.reduce(
        (n, r) => n + r.records,
        0,
      ),
      browserPasses: evidence.browserPasses,
    },
    null,
    2,
  ),
);
