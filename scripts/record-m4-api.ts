import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';
import ts from 'typescript-min';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const previous = await read(
  'docs/implementation/m4/react-catalog-evidence.json',
);
const previousReceipt = await read(
  'docs/implementation/m4/react-catalog-receipt.json',
);
const native = await read('.artifacts/packed-report.json');
const adapter = await read('.artifacts/m3/packed-react-report.json');
const packed = await read('.artifacts/m4/packed-report.json');
if (
  adapter.result !== 'pass' ||
  native.sha256 !== packed.artifacts.core.sha256 ||
  adapter.sha256 !== packed.artifacts.react.sha256
)
  throw Error('Mismatched private pair');
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
    throw Error(`Changed verified input: ${path}`);
const changedProduction: string[] = [];
for (const directory of ['packages/core/src', 'packages/react/src'])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    const path = `${directory}/${file}`;
    if ((await hash(path)) !== previous.sourceArchive[path])
      changedProduction.push(path);
  }
const expected = [
  'packages/core/src/animations.ts',
  'packages/core/src/internal/loading-controller.ts',
  'packages/core/src/internal/dom.ts',
  'packages/core/src/internal/element.ts',
  'packages/core/src/register-all.ts',
  'packages/core/src/skeleton-text.ts',
  'packages/react/src/region.tsx',
];
if (
  JSON.stringify(changedProduction.sort()) !== JSON.stringify(expected.sort())
)
  throw Error('Unexpected production changes');
const equivalentCompiled = [
  'packages/core/dist/internal/loading-controller.js',
  'packages/react/dist/region.js',
];
const compiledComparisons = [];
function tokens(code: string) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    code,
  );
  const values: [number, string][] = [];
  for (
    let kind = scanner.scan();
    kind !== ts.SyntaxKind.EndOfFileToken;
    kind = scanner.scan()
  )
    values.push([kind, scanner.getTokenText()]);
  return JSON.stringify(values);
}
for (const path of equivalentCompiled) {
  const before = await readFile(resolve(root, previous.archive, path), 'utf8');
  const after = await readFile(resolve(root, path), 'utf8');
  if (tokens(before) !== tokens(after))
    throw Error(`Declaration-only edit changed runtime tokens: ${path}`);
  compiledComparisons.push({
    path,
    byteIdentical: before === after,
    tokenIdentical: true,
    method: 'TypeScript scanner excluding trivia; literals retain token text',
  });
}
for (const path of [
  'docs/implementation/requirements.json',
  'docs/implementation/m4/size-baseline.json',
  'scripts/check-m4-budgets.ts',
  'scripts/check-chart-options.ts',
  'scripts/check-table-options.ts',
])
  if ((await hash(path)) !== previous.sourceArchive[path])
    throw Error(`Policy changed: ${path}`);
const review = await read('docs/implementation/m4/requirement-review.json');
const oldReview = await read(
  `${previous.archive}/docs/implementation/m4/requirement-review.json`,
);
if (
  review.requirements.length !== 717 ||
  JSON.stringify(review.requirements) !== JSON.stringify(oldReview.requirements)
)
  throw Error('Original full-clause statuses changed');
const coverage = await read('.artifacts/m4-api/coverage-report.json');
if (
  coverage.status !== 'index-integrity-pass' ||
  coverage.apiClausesIndexed !== 94 ||
  coverage.selectedMotionClausesIndexed !== 42 ||
  coverage.entries.length !== 43 ||
  coverage.registrySha256 !==
    (await hash('docs/implementation/m4/api-coverage.json'))
)
  throw Error('Incomplete/stale API index');
const jobs = await read('.artifacts/m4-api/final-checks.json');
const regressions = await read('.artifacts/m4-api/regression-checks.json');
if (
  jobs.length !== 6 ||
  regressions.length !== 16 ||
  [...jobs, ...regressions].some(
    (job: { exitCode: number; expected: number }) =>
      job.exitCode !== job.expected,
  )
)
  throw Error('Incomplete command matrix');
const browsers = [];
for (const [path, expectedCount, skipped] of [
  ['.artifacts/m4-api/browser-results.json', 75, 0],
  ['.artifacts/m4-api/native-browser.json', 42, 0],
  ['.artifacts/m3/browser-results.json', 312, 0],
  ['.artifacts/m4/browser-results.json', 252, 0],
  ['.artifacts/m4-presets/browser-results.json', 51, 0],
] as const) {
  const report = await read(path);
  const metadata = report.config.metadata;
  if (
    report.stats.unexpected ||
    report.stats.flaky ||
    report.stats.skipped !== skipped ||
    report.errors.length ||
    (expectedCount !== undefined && report.stats.expected !== expectedCount) ||
    (metadata.artifactSha256 ??
      metadata.nativeArtifactSha256 ??
      metadata.artifacts?.core.sha256) !== native.sha256 ||
    (metadata.reactArtifactSha256 ??
      metadata.artifacts?.react.sha256 ??
      adapter.sha256) !== adapter.sha256
  )
    throw Error(`Invalid browser report: ${path}`);
  browsers.push({
    path,
    scope: path.endsWith('native-browser.json')
      ? 'Focused style/theme/registration/import regressions on final pair; preceding full native context is separate'
      : 'Declared complete fixture suite on final pair',
    metadata,
    ...report.stats,
  });
}
const precedingNativePath =
  '.artifacts/m4-api/diagnostics/pre-refresh-run/native-browser.json';
const precedingNative = await read(precedingNativePath);
const precedingFixture = await read(
  '.artifacts/m4-api/diagnostics/pre-refresh-run/fixtures.json',
);
if (
  precedingNative.stats.expected !== 322 ||
  precedingNative.stats.skipped !== 2 ||
  precedingNative.stats.unexpected ||
  precedingNative.stats.flaky ||
  precedingNative.config.metadata.artifactSha256 !==
    precedingFixture.artifacts.core.sha256
)
  throw Error('Invalid preceding native context');
const ssr = await read('.artifacts/m4-react-catalog/ssr.json');
if (
  !ssr.functionalPass ||
  ssr.numericPass ||
  ssr.rows.length !== 8 ||
  ssr.artifacts.core !== native.sha256 ||
  ssr.artifacts.react !== adapter.sha256
)
  throw Error('Wrong SSR scope');
const clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== native.sha256 ||
  clean.reproducedTarballSha256.react !== adapter.sha256
)
  throw Error('Not reproduced');
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
  if (
    report.artifacts.core.sha256 !== native.sha256 ||
    report.artifacts.react.sha256 !== adapter.sha256
  )
    throw Error(`Stale size gate/measurement: ${path}`);
  sizeReports.push({
    path,
    sha256: await hash(path),
    result: report.result ?? 'measurement-only',
    hardFailures: report.hardFailures,
    significantGrowthFlags: report.regressions?.length,
    failures: report.failures,
  });
}
const ports = await Promise.all(
  [4181, 4191, 4194, 4198, 4203].map(
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
          reject(Error(`Unknown port state: ${port}`));
        });
      }),
  ),
);
const controls = {
  recordedAt: new Date().toISOString(),
  visibility: (await read('.artifacts/m4-api/repository-control.json'))
    .visibility,
  m2: (await read('.artifacts/m4-api/m2-control.json')).state,
  m4: (await read('.artifacts/m4-api/m4-control.json')).state,
  ports,
};
await writeFile(
  resolve(root, '.artifacts/m4-api/controls.json'),
  `${JSON.stringify(controls, null, 2)}\n`,
);
if (
  controls.visibility !== 'PRIVATE' ||
  controls.m2 !== 'OPEN' ||
  controls.m4 !== 'OPEN' ||
  controls.ports.some((port: { open: boolean }) => port.open)
)
  throw Error('Control/cleanup failure');
const guards = await read('.artifacts/m4-api/guards.json');
if (
  guards.some(
    (guard: { private: boolean; exitCode: number }) =>
      !guard.private || guard.exitCode !== 1,
  )
)
  throw Error('Publication not fail closed');
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
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  browserVersions,
  limitation:
    'Installed local engines only; no actual browser-floor, OS/manual-AT or physical reference qualification.',
};
await writeFile(
  resolve(root, '.artifacts/m4-api/environment.json'),
  `${JSON.stringify(environment, null, 2)}\n`,
);
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
  for (const [path, sha] of Object.entries(records) as [string, string][])
    if (
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      (await hash(`${directory}/${path}`)) !== sha
    )
      throw Error(`Changed historical record: ${directory}/${path}`);
  previousArchives.push({ directory, records: Object.keys(records).length });
}
const supplemental = previousReceipt.additionalDiagnostics;
if (
  (await hash(`${supplemental.archive}/manifest.json`)) !==
  supplemental.manifestSha256
)
  throw Error('Changed prior diagnostics manifest');
const diagnosticManifest = await read(`${supplemental.archive}/manifest.json`);
for (const [path, sha] of Object.entries(diagnosticManifest.files) as [
  string,
  string,
][])
  if ((await hash(`${supplemental.archive}/${path}`)) !== sha)
    throw Error('Changed historical diagnostic');
const archive = `.artifacts/evidence-runs/m4-api-${native.sha256.slice(0, 12)}-${Date.now()}`;
const inputs = new Set<string>([
  ...Object.keys(native.sourceFiles),
  ...Object.keys(native.buildInputs),
  ...Object.keys(adapter.sources),
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/browser-results.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
  '.artifacts/m4/packed-report.json',
  '.artifacts/m4/browser-results.json',
  '.artifacts/m4/size-regressions.json',
  '.artifacts/m4/text-animation-closures.json',
  '.artifacts/m4/chart-animation-closures.json',
  '.artifacts/m4/table-animation-closures.json',
  '.artifacts/m4/chart-animation-budget.json',
  '.artifacts/m4/table-animation-budget.json',
  'docs/implementation/m4/api-coverage.json',
  'docs/implementation/m4/api-reference.md',
  'docs/implementation/m4/api-progress.md',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/size-baseline.json',
  'docs/roadmap.md',
  'AGENTS.md',
  'package.json',
  'biome.json',
  'tsconfig.json',
]);
for (const directory of [
  'packages/core/src',
  'packages/core/dist',
  'packages/react/src',
  'packages/react/dist',
  'scripts',
  'tests',
  'examples',
  '.artifacts/m4-api',
  '.artifacts/m4-presets',
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
const apiFixture = await read('.artifacts/m4-api/fixtures.json');
for (const directory of ['examples/api', 'tests/api'])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(apiFixture.consumer, directory),
    onlyFiles: true,
  }))
    await copy(
      resolve(apiFixture.consumer, directory, file),
      `consumers/api/${directory}/${file}`,
      consumerFiles,
    );
const reactConsumers = await read(
  '.artifacts/m4-react-catalog/browser-consumers.json',
);
for (const [line, directory] of Object.entries(reactConsumers.consumers) as [
  string,
  string,
][])
  for (const name of [
    'fixture.tsx',
    'catalog.tsx',
    'client.tsx',
    'ssr.tsx',
    'early.ts',
    'consumer.tsx',
  ])
    await copy(
      resolve(directory, name),
      `consumers/react-${line}/${name}`,
      consumerFiles,
    );
for (const [name, artifact] of Object.entries(packed.artifacts) as [
  string,
  { path: string },
][])
  await copy(artifact.path, `artifacts/${name}.tgz`, artifactFiles);
const precedingCore = `.artifacts/m4/history/core-${precedingFixture.artifacts.core.sha256}.tgz`;
if ((await hash(precedingCore)) !== precedingFixture.artifacts.core.sha256)
  throw Error('Changed preceding native artifact');
await copy(precedingCore, 'artifacts/preceding-core.tgz', artifactFiles);
const diagnosticArtifacts: {
  package: string;
  sha256: string;
  archivedAs: string;
}[] = [];
const diagnosticPairs = new Map<string, { package: string; sha256: string }>();
for await (const file of new Bun.Glob('**/*.json').scan({
  cwd: resolve(root, '.artifacts/m4-api'),
  onlyFiles: true,
})) {
  const report = await read(`.artifacts/m4-api/${file}`);
  const artifacts = report.artifacts ?? report.config?.metadata?.artifacts;
  for (const name of ['core', 'react']) {
    const sha = artifacts?.[name]?.sha256;
    if (
      typeof sha === 'string' &&
      /^[a-f0-9]{64}$/.test(sha) &&
      sha !== packed.artifacts[name].sha256 &&
      sha !== precedingFixture.artifacts.core.sha256
    )
      diagnosticPairs.set(`${name}:${sha}`, { package: name, sha256: sha });
  }
}
for (const row of diagnosticPairs.values()) {
  const from = `.artifacts/m4/history/${row.package}-${row.sha256}.tgz`;
  if ((await hash(from)) !== row.sha256)
    throw Error('Changed diagnostic artifact');
  const archivedAs = `artifacts/diagnostic-${row.package}-${row.sha256.slice(0, 12)}.tgz`;
  await copy(from, archivedAs, artifactFiles);
  diagnosticArtifacts.push({ ...row, archivedAs });
}
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  status:
    'Scoped API/example gaps addressed; functional/numerical/reference qualification remains open',
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  archive,
  artifacts: packed.artifacts,
  baseline: {
    packet: 'docs/implementation/m4/react-catalog-evidence.json',
    artifacts: previous.artifacts,
  },
  changedProduction,
  compiledComparisons,
  browsers,
  precedingNativeContext: {
    path: precedingNativePath,
    artifacts: precedingFixture.artifacts,
    ...precedingNative.stats,
    scope:
      'Before final refreshStyles optional-call fix; context only, excluded from final-pair pass totals',
  },
  apiIndex: {
    path: 'docs/implementation/m4/api-coverage.json',
    sha256: coverage.registrySha256,
    apiClauses: 94,
    motionBlocks: 42,
    components: 9,
    exports: 43,
  },
  ssr: {
    report: '.artifacts/m4-react-catalog/ssr.json',
    functionalPass: ssr.functionalPass,
    numericPass: ssr.numericPass,
  },
  jobs,
  regressions,
  sizeReports,
  guards,
  controls,
  environment,
  previousArchives,
  supplementalArchives: [supplemental],
  sourceArchive,
  consumerFiles,
  artifactFiles,
  diagnosticArtifacts,
  gates: {
    scopedApiFunctional: 'pass',
    fullClauseQualification: 'unverified',
    m2: 'OPEN',
    m4: 'OPEN',
    renderer: 'provisional',
    npmPublishing: 'disabled',
    sizeAndGrowth: 'fail/held under unchanged limits/baselines',
    physicalReferenceManualOwner: 'unverified',
    fullSampling:
      'not rerun: no painter/scheduler/recipe/frame or handoff execution change; due on substantial engine changes and feature freeze',
    m5: 'not authorized',
  },
};
await writeFile(
  resolve(root, archive, 'evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
await writeFile(
  resolve(root, 'docs/implementation/m4/api-evidence.json'),
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
      previousRecords: previousArchives.reduce(
        (sum, row) => sum + row.records,
        0,
      ),
      priorDiagnosticRecords: Object.keys(diagnosticManifest.files).length,
      browserPasses: browsers.reduce((sum, row) => sum + row.expected, 0),
    },
    null,
    2,
  ),
);
