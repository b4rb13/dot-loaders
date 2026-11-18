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
const regressions = await json('.artifacts/m4/size-regressions.json');
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
  regressions.artifacts.core.sha256 !== native.sha256 ||
  regressions.artifacts.react.sha256 !== react.sha256
)
  throw new Error('Stale regression report');
const failures = m4BudgetFailures(catalog.sizes);
if (failures.length) throw new Error(`Absolute size failure: ${failures}`);
const matrices: Record<string, unknown> = {};
for (const [name, path, count, skipped] of [
  ['native', '.artifacts/browser-results.json', 298, 2],
  ['react', '.artifacts/m3/browser-results.json', 216, 0],
  ['next', '.artifacts/m3/next-browser-results.json', 60, 0],
  ['catalog', '.artifacts/m4/browser-results.json', 87, 0],
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
const controls = await json('.artifacts/m4/motion-controls.json');
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
]) {
  const directory = `.artifacts/evidence-runs/${id}`;
  const prior = await json(`${directory}/evidence.json`);
  const records = prior.evidenceSha256 ?? {
    ...prior.sourceArchive,
    ...prior.nextBuildFiles,
    ...prior.consumerFiles,
  };
  let count = 0;
  for (const [path, expected] of Object.entries(records)) {
    if ((await hash(resolve(root, directory, path))) !== expected)
      throw new Error(`Historical archive changed: ${id}/${path}`);
    count++;
  }
  previousArchives.push({ directory, files: count });
}
const archive = `.artifacts/evidence-runs/m4-motion-${native.sha256.slice(0, 12)}-${Date.now()}`;
const inputs = new Set<string>([
  'AGENTS.md',
  'README.md',
  'docs/roadmap.md',
  'docs/implementation/native-quickstart.md',
  'docs/implementation/react-quickstart.md',
  'package.json',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'biome.json',
  'docs/implementation/requirements.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/progress.md',
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
]) {
  for await (const path of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
    dot: true,
  }))
    if (!/(?:^|\/)(?:node_modules|dist|\.next|\.turbo)(?:\/|$)/.test(path))
      inputs.add(`${directory}/${path}`);
}
for (const pkg of ['core', 'react']) inputs.add(`packages/${pkg}/package.json`);
for (const name of [
  'playwright.config.ts',
  'playwright.react.config.ts',
  'playwright.next.config.ts',
  'playwright.m4.config.ts',
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
      /^(?:test-results|dissolve-initial-csp-failure|pre-capture-fix)\//.test(
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
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  archive,
  decision:
    'https://github.com/b4rb13/dot-loaders/issues/9#issuecomment-6226666680',
  status:
    'Incremental M4 skeleton dissolve; absolute slice limits pass, significant size growth awaits owner review; full M4 held',
  artifacts: catalog.artifacts,
  environment: native.environment,
  matrices,
  guards,
  sizes: catalog.sizes,
  nativeSlice: native.sizes,
  regressions,
  controls,
  sourceBlockCount: 717,
  previousArchives,
  sourceArchive: files,
  artifactFiles,
  gates: {
    absoluteSliceSize: 'pass',
    sizeGrowth: regressions.result,
    normalSpeedOwnerReview: 'unverified',
    completeMotionMatrix: 'unverified',
    m2: 'open',
    renderer: 'provisional',
    publishing: 'disabled',
  },
  limitations: [
    'No new physical/reference whole-render/heap or actual-floor/manual-AT evidence; M2 remains open.',
    'TextLoader/ChartLoader/TableLoader and full recipe/preset/projection/custom catalog remain unfinished.',
    'Native/React/Next regressions retain their recorded fixture scopes; no full-nine-export claim.',
    'Snapshots and normal-speed recordings are implementation observations, not owner visual approval.',
    'WebKit screenshot instrumentation injects body {}; strict CSP paths use no screenshot operation and all policy assertions stay enabled. Initial failed capture reports retained.',
    'New ceilings do not reset the durable baseline. Significant feature growth is recorded, not automatically approved.',
    'Implementation remains local/uncommitted; artifact hashes identify tested bytes. No external source inspected or npm publication performed.',
  ],
};
await writeFile(
  resolve(root, archive, 'evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
await writeFile(
  resolve(root, 'docs/implementation/m4/motion-evidence.json'),
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
