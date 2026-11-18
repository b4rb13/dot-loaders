import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const previous = await read('docs/implementation/m4/multi-rich-evidence.json');
const packed = await read('.artifacts/m4/packed-report.json');
const native = await read('.artifacts/packed-report.json');
const adapter = await read('.artifacts/m3/packed-react-report.json');
if (
  adapter.result !== 'pass' ||
  native.sha256 !== packed.artifacts.core.sha256 ||
  adapter.sha256 !== packed.artifacts.react.sha256
)
  throw Error('Wrong frozen artifact pair');
for (const artifact of Object.values(packed.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(artifact.path)) !== artifact.sha256)
    throw Error('Changed artifact');
for (const [path, sha] of Object.entries({
  ...native.sourceFiles,
  ...native.buildInputs,
  ...adapter.sources,
}) as [string, string][])
  if ((await hash(path)) !== sha) throw Error(`Changed verified input ${path}`);
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
  'packages/core/src/text.ts',
  'packages/react/src/static.tsx',
  'packages/react/src/chart.tsx',
  'packages/react/src/table.tsx',
  'packages/react/src/text.tsx',
];
if (
  JSON.stringify(changedProduction.sort()) !== JSON.stringify(expected.sort())
)
  throw Error('Unexpected production changes');
for (const path of [
  'docs/implementation/requirements.json',
  'docs/implementation/m4/size-baseline.json',
  'scripts/check-m4-budgets.ts',
  'scripts/check-chart-options.ts',
  'scripts/check-table-options.ts',
])
  if ((await hash(path)) !== previous.sourceArchive[path])
    throw Error('Policy changed');
const review = await read('docs/implementation/m4/requirement-review.json'),
  oldReview = await read(
    `${previous.archive}/docs/implementation/m4/requirement-review.json`,
  );
if (
  review.requirements.length !== 717 ||
  JSON.stringify(review.requirements) !== JSON.stringify(oldReview.requirements)
)
  throw Error('Original requirement clauses changed');
const ids = new Set(
  (await read('docs/implementation/requirements.json')).requirements.map(
    (row: { id: string }) => row.id,
  ),
);
if (
  review.reactCatalogContinuation.requirementIds.some(
    (id: string) => !ids.has(id),
  )
)
  throw Error('Unknown requirement');
const browsers = [];
for (const [path, count] of [
  ['.artifacts/m3/browser-results.json', 312],
  ['.artifacts/m3/next-browser-results.json', 102],
  ['.artifacts/m4/browser-results.json', 81],
] as const) {
  const report = await read(path);
  if (
    report.stats.expected !== count ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.stats.skipped ||
    report.errors.length ||
    (report.config.metadata.nativeArtifactSha256 ??
      report.config.metadata.artifacts?.core.sha256) !== native.sha256 ||
    (report.config.metadata.reactArtifactSha256 ??
      report.config.metadata.artifacts?.react.sha256) !== adapter.sha256
  )
    throw Error(`Failed browser matrix ${path}`);
  browsers.push({ path, metadata: report.config.metadata, ...report.stats });
}
const consumers = await read(
    '.artifacts/m4-react-catalog/browser-consumers.json',
  ),
  next = await read('.artifacts/m3/next-consumers.json');
if (
  consumers.core !== native.sha256 ||
  consumers.react !== adapter.sha256 ||
  next.nativeSha256 !== native.sha256 ||
  next.reactSha256 !== adapter.sha256 ||
  next.result !== 'pass'
)
  throw Error('Wrong consumer pair');
for (const directory of Object.values(consumers.consumers) as string[])
  for (const name of [
    'fixture.tsx',
    'catalog.tsx',
    'client.tsx',
    'ssr.tsx',
    'early.ts',
  ])
    if (
      (await hash(`${directory}/${name}`)) !==
      (await hash(`tests/react/${name}`))
    )
      throw Error('Changed tested React fixture');
for (const directory of Object.values(next.consumers) as string[])
  if (
    (await hash(`${directory}/app/catalog.tsx`)) !==
    (await hash('tests/react/catalog.tsx'))
  )
    throw Error('Changed Next shared catalog');
const ssr = await read('.artifacts/m4-react-catalog/ssr.json');
if (
  !ssr.functionalPass ||
  ssr.numericPass ||
  ssr.rows.length !== 8 ||
  ssr.artifacts.core !== native.sha256 ||
  ssr.artifacts.react !== adapter.sha256 ||
  ssr.sourceSha256 !== (await hash('tests/react/catalog-ssr.mjs'))
)
  throw Error('Incomplete SSR matrix');
if (
  new Set(
    ssr.rows.map(
      (row: { line: string; runtimeName: string }) =>
        `${row.line}/${row.runtimeName}`,
    ),
  ).size !== 8
)
  throw Error('Missing SSR runtime cell');
for (const row of ssr.rows)
  if (
    !row.functionalPass ||
    row.observations.length !== 81 ||
    row.documents.length !== 3 ||
    row.streaming.length !== 2 ||
    row.documents.some(
      (d: { warmHelper: { samples: number[] } }) =>
        d.warmHelper.samples.length !== 20,
    )
  )
    throw Error('Incomplete SSR cell');
for (const output of ssr.rawOutputs)
  if ((await hash(output.path)) !== output.sha256)
    throw Error('Changed raw SSR output');
const sizes = {
  defaults: packed.sizes,
  text: await read('.artifacts/m4/text-animation-closures.json'),
  chart: await read('.artifacts/m4/chart-animation-closures.json'),
  table: await read('.artifacts/m4/table-animation-closures.json'),
  regressions: await read('.artifacts/m4/size-regressions.json'),
};
for (const name of ['text', 'chart', 'table', 'regressions'] as const)
  if (
    sizes[name].artifacts.core.sha256 !== native.sha256 ||
    sizes[name].artifacts.react.sha256 !== adapter.sha256
  )
    throw Error('Stale closure report');
if (
  !sizes.regressions.hardFailures.length ||
  !sizes.regressions.regressions.length
)
  throw Error('Held size/growth findings missing');
const clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== native.sha256 ||
  clean.reproducedTarballSha256.react !== adapter.sha256
)
  throw Error('Clean reproduction mismatch');
const jobs = await read(
    '.artifacts/m4-react-catalog/verification/final-pack-jobs.json',
  ),
  extra = await read(
    '.artifacts/m4-react-catalog/verification/extra-jobs.json',
  ),
  post = await read(
    '.artifacts/m4-react-catalog/verification/final-checks.json',
  );
if (
  jobs.length !== 6 ||
  extra.length !== 10 ||
  post.length !== 3 ||
  [...jobs, ...extra, ...post].some(
    (row: { exitCode: number; expected: number }) =>
      row.exitCode !== row.expected,
  )
)
  throw Error('Incomplete checks');
if (
  !(
    await Bun.file(
      resolve(
        root,
        '.artifacts/m4-react-catalog/verification/final-native-packed.log',
      ),
    ).text()
  ).includes('Closure size gate failed; report retained.')
)
  throw Error('Unexpected native packed error');
const guards = [];
for (const pkg of ['core', 'react']) {
  const manifest = await read(`packages/${pkg}/package.json`);
  if (
    !manifest.private ||
    manifest.scripts.prepublishOnly !==
      `node -e "throw new Error('npm publishing is disabled during private validation')"`
  )
    throw Error('Publication policy changed');
  const exitCode = await Bun.spawn(['bun', 'run', 'prepublishOnly'], {
    cwd: resolve(root, 'packages', pkg),
    stdout: 'ignore',
    stderr: 'ignore',
  }).exited;
  if (exitCode !== 1) throw Error('Guard failed open');
  guards.push({
    pkg,
    private: true,
    prepublishExitCode: exitCode,
    registryWrites: 0,
  });
}
const controls = await read('.artifacts/m4-react-catalog/controls.json');
if (
  controls.visibility !== 'PRIVATE' ||
  controls.m2 !== 'OPEN' ||
  controls.m4 !== 'OPEN' ||
  controls.ports.some((row: { open: boolean }) => row.open)
)
  throw Error('Control/cleanup failure');
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
      throw Error(`Changed prior archive ${directory}/${path}`);
  previousArchives.push({ directory, records: Object.keys(records).length });
}
const archive = `.artifacts/evidence-runs/m4-react-catalog-${adapter.sha256.slice(0, 12)}-${Date.now()}`;
const inputs = new Set<string>([
  ...Object.keys(native.sourceFiles),
  ...Object.keys(native.buildInputs),
  ...Object.keys(adapter.sources),
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/browser-results.json',
  '.artifacts/m3/next-browser-results.json',
  '.artifacts/m3/next-consumers.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
  '.artifacts/m4/packed-report.json',
  '.artifacts/m4/browser-results.json',
  '.artifacts/m4/text-animation-closures.json',
  '.artifacts/m4/chart-animation-closures.json',
  '.artifacts/m4/table-animation-closures.json',
  '.artifacts/m4/size-regressions.json',
  'docs/implementation/m4/multi-rich-evidence.json',
  'docs/implementation/m4/multi-rich-receipt.json',
  'docs/implementation/m4/react-catalog-progress.md',
  'docs/implementation/m4/react-catalog-quickstart.md',
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
  'packages/react/src',
  'packages/react/dist',
  'scripts',
  'tests',
  '.artifacts/m4-react-catalog',
  '.artifacts/m3/react-test-results',
  '.artifacts/m3/next-test-results',
  '.artifacts/m4/test-results',
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
  consumerFiles: Record<string, string> = {};
async function copy(
  source: string,
  path: string,
  records: Record<string, string>,
) {
  const to = resolve(root, archive, path);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(resolve(root, source), to);
  records[path] = await hash(`${archive}/${path}`);
}
for (const path of [...inputs].sort()) await copy(path, path, sourceArchive);
for (const [line, directory] of Object.entries(next.consumers) as [
  string,
  string,
][])
  for (const folder of ['app', 'public', '.next/static', '.next/server/app'])
    for await (const file of new Bun.Glob('**/*').scan({
      cwd: resolve(directory, folder),
      onlyFiles: true,
    }))
      await copy(
        `${directory}/${folder}/${file}`,
        `consumers/next-${line}/${folder}/${file}`,
        consumerFiles,
      );
for (const [line, directory] of Object.entries(consumers.consumers) as [
  string,
  string,
][])
  for (const file of [
    'package.json',
    'package-lock.json',
    'bun.lock',
    'fixture.tsx',
    'catalog.tsx',
    'client.tsx',
    'ssr.tsx',
    'early.ts',
  ]) {
    if (await Bun.file(resolve(directory, file)).exists())
      await copy(
        `${directory}/${file}`,
        `consumers/react-${line}/${file}`,
        consumerFiles,
      );
  }
for (const [line, directory] of Object.entries(next.consumers) as [
  string,
  string,
][])
  for (const file of [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'next.config.mjs',
    'proxy.ts',
    '.next/build-manifest.json',
    '.next/prerender-manifest.json',
    '.next/server/app-paths-manifest.json',
  ]) {
    if (await Bun.file(resolve(directory, file)).exists())
      await copy(
        `${directory}/${file}`,
        `consumers/next-${line}/${file}`,
        consumerFiles,
      );
  }
const artifactFiles: Record<string, string> = {};
for (const [name, artifact] of Object.entries(packed.artifacts) as [
  string,
  { path: string; sha256: string },
][])
  await copy(artifact.path, `artifacts/${name}.tgz`, artifactFiles);
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  status:
    'Full-catalog baseline React/SSR functional checkpoint; numerical and release qualification held',
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  archive,
  artifacts: packed.artifacts,
  baseline: {
    packet: 'docs/implementation/m4/multi-rich-evidence.json',
    artifacts: previous.artifacts,
  },
  changedProduction,
  browsers,
  ssr,
  environment: await read('.artifacts/m4-react-catalog/environment.json'),
  sizes,
  jobs,
  extra,
  post,
  guards,
  controls,
  previousArchives,
  sourceArchive,
  consumerFiles,
  artifactFiles,
  gates: {
    baselineNineExportIntegration: 'pass',
    nativeRuntime:
      'Text geometry fingerprint only; painter/scheduler/recipes unchanged',
    ssrDefaultAndMixedDocument: 'pass',
    ssrMaximumMultiline: 'fail',
    tableExternalAdapterIncrement: 'fail',
    nativeAndOptionalDownload: 'fail',
    significantGrowth: 'held; unchanged baseline',
    featureFreeze: 'incomplete',
    m2: 'open',
    m4: 'open',
    renderer: 'provisional',
    npmPublishing: 'disabled',
    fullOptionCopyMaximumLayoutOwnerManualReferenceQualification:
      'unverified/incomplete',
  },
};
const text = `${JSON.stringify(evidence, null, 2)}\n`;
await writeFile(resolve(root, archive, 'evidence.json'), text);
await writeFile(
  resolve(root, 'docs/implementation/m4/react-catalog-evidence.json'),
  text,
);
console.log(
  JSON.stringify(
    {
      archive,
      records:
        Object.keys(sourceArchive).length +
        Object.keys(consumerFiles).length +
        Object.keys(artifactFiles).length,
      previousRecords: previousArchives.reduce((s, row) => s + row.records, 0),
      browserPasses: browsers.reduce((s, row) => s + row.expected, 0),
      ssrCells: ssr.rows.length,
    },
    null,
    2,
  ),
);
