import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { arch, cpus, release, totalmem } from 'node:os';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

import { m4BudgetFailures } from './m4-budgets.js';

const root = resolve(import.meta.dir, '..');
const output = resolve(root, '.artifacts/m4');
const json = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
const native = await json('.artifacts/packed-report.json');
const adapter = await json('.artifacts/m3/packed-react-report.json');
const catalog = await json('.artifacts/m4/packed-report.json');
const delivery = await json('.artifacts/m4/css-delivery.json');
const cacheProof = await json('.artifacts/m4/cache-proof.json');
const ssr = await json('.artifacts/m3/ssr-output.json');
const clean = await json('.artifacts/m3/clean-reproduction.json');
const next = await json('.artifacts/m3/next-consumers.json');
if (
  adapter.native.sha256 !== native.sha256 ||
  catalog.artifacts.core.sha256 !== native.sha256 ||
  catalog.artifacts.react.sha256 !== adapter.sha256
)
  throw new Error('Mismatched artifact pair');
for (const report of [ssr, next])
  if (
    report.nativeSha256 !== native.sha256 ||
    report.reactSha256 !== adapter.sha256 ||
    report.result !== 'pass'
  )
    throw new Error('Stale or failing SSR/Next evidence');
if (
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== native.sha256 ||
  clean.reproducedTarballSha256.react !== adapter.sha256 ||
  adapter.result !== 'pass'
)
  throw new Error('Packed consumers/clean reproduction must pass');
for (const row of Object.values(native.sizes) as {
  gzip: number;
  limit: number;
}[])
  if (row.gzip > row.limit) throw new Error('Original native size regression');
for (const [name, value] of Object.entries(native.externalModeGzip))
  if ((value as number) > native.sizes[name].limit)
    throw new Error('Original external CSS size regression');
for (const artifact of Object.values(catalog.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(artifact.path)) !== artifact.sha256)
    throw new Error('Changed tarball');
if (
  delivery.result !== 'pass' ||
  delivery.assets.length !== 2 ||
  delivery.artifacts.core.sha256 !== native.sha256 ||
  delivery.artifacts.react.sha256 !== adapter.sha256
)
  throw new Error('Stale CSS delivery proof');
for (const asset of delivery.assets) {
  if ((await hash(asset.path)) !== asset.sha256)
    throw new Error('Shared stylesheet changed');
  const kind = asset.specifier.includes('/core/') ? 'native' : 'react';
  for (const entry of ['root', 'family']) {
    const row = catalog.sizes[`skeletonFamily-${entry}-${kind}`];
    if (row.sharedExternal - row.gzip !== asset.gzip)
      throw new Error('Shared CSS bytes not accounted');
  }
}
if (cacheProof.result !== 'pass')
  throw new Error('Missing shared-builder cache proof');
for (const [path, expected] of Object.entries(cacheProof.inputs))
  if ((await hash(resolve(root, path))) !== expected)
    throw new Error('Stale cache-input proof');
for (const task of [
  '@dotquilt-internal/core#build',
  '@dotquilt-internal/react#build',
])
  if (
    !cacheProof.before[task] ||
    cacheProof.before[task] === cacheProof.changed[task] ||
    cacheProof.before[task] !== cacheProof.restored[task]
  )
    throw new Error('Invalid cache-input proof');
const matrices: Record<string, unknown> = {};
for (const [name, path, expected, skipped] of [
  ['catalog', '.artifacts/m4/browser-results.json', 57, 0],
  ['native', '.artifacts/m4/native-regressions.json', 298, 2],
  ['react', '.artifacts/m3/browser-results.json', 216, 0],
  ['next', '.artifacts/m3/next-browser-results.json', 60, 0],
] as const) {
  const report = await json(path);
  if (
    report.stats.expected !== expected ||
    report.stats.skipped !== skipped ||
    report.stats.unexpected ||
    report.stats.flaky
  )
    throw new Error(`Incomplete/failing ${name} browser matrix`);
  const metadata = report.config.metadata;
  if (
    name === 'native'
      ? metadata.artifactSha256 !== native.sha256
      : name === 'catalog'
        ? metadata.artifacts.core.sha256 !== native.sha256 ||
          metadata.artifacts.react.sha256 !== adapter.sha256
        : metadata.nativeArtifactSha256 !== native.sha256 ||
          metadata.reactArtifactSha256 !== adapter.sha256
  )
    throw new Error(`Stale ${name} matrix`);
  matrices[name] = report.stats;
}
const repository = await json('.artifacts/m4/repository-control.json');
const m2 = await json('.artifacts/m4/m2-control.json');
const m4 = await json('.artifacts/m4/m4-control.json');
const dependencies = await json('.artifacts/m4/dependencies.json');
if (
  !repository.private ||
  m2.state !== 'open' ||
  m4.state !== 'open' ||
  !dependencies.some(
    (row: { number: number; state: string }) =>
      row.number === 16 && row.state === 'open',
  )
)
  throw new Error('Private/open-M2/open-M4 controls changed');
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
  throw new Error('Lossless requirement review missing or overstated');
const checks: { command: string; exitCode: number; expected: number }[] = [];
async function check(
  args: string[],
  cwd: string,
  expected = 0,
  label = args.join(' '),
) {
  const task = Bun.spawn(args, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(task.stdout).text(),
    new Response(task.stderr).text(),
  ]);
  const exitCode = await task.exited;
  checks.push({ command: label, exitCode, expected });
  await writeFile(
    resolve(output, `record-check-${checks.length}.log`),
    `${stdout}\n${stderr}`,
  );
  if (exitCode !== expected)
    throw new Error(`${label} returned ${exitCode}; expected ${expected}`);
}
for (const script of ['check', 'lint', 'test', 'test:harness'])
  await check(['bun', 'run', script], root);
const budgetFailures = m4BudgetFailures(catalog.sizes);
await check(
  ['bun', 'run', 'verify:m4-budgets'],
  root,
  budgetFailures.length ? 1 : 0,
);
for (const pkg of ['core', 'react']) {
  const path = resolve(
    catalog.consumer,
    `node_modules/@dotquilt-internal/${pkg}`,
  );
  const manifest = await Bun.file(resolve(path, 'package.json')).json();
  if (
    !manifest.private ||
    !manifest.scripts.prepublishOnly.includes('publishing is disabled')
  )
    throw new Error(`Missing ${pkg} publication guard`);
  if (pkg === 'core' && Object.keys(manifest.dependencies ?? {}).length)
    throw new Error('Core acquired runtime dependencies');
  await check(
    ['bun', 'run', 'prepublishOnly'],
    path,
    1,
    `${pkg}: installed prepublishOnly blocks publication`,
  );
}
const previousArchives: { archive: string; files: number }[] = [];
for (const id of [
  'm2-bf8d927bccfb-1792181582369',
  'm3-ef78a87726b9-e75c5cb9f64b-1792185850664',
  'm4-fe0fa4e77756-1b2fb9464836-1792188520904',
]) {
  const archive = `.artifacts/evidence-runs/${id}`;
  const prior = await json(`${archive}/evidence.json`);
  let files = 0;
  for (const [path, expected] of Object.entries(
    prior.evidenceSha256 ?? {
      ...prior.sourceArchive,
      ...prior.nextBuildFiles,
      ...prior.consumerFiles,
    },
  )) {
    if ((await hash(resolve(root, archive, path))) !== expected)
      throw new Error(`Historical archive changed: ${path}`);
    files++;
  }
  for (const [path, expected] of Object.entries(prior.artifactFiles ?? {}))
    if ((await hash(resolve(root, archive, path))) !== expected)
      throw new Error(`Historical artifact changed: ${path}`);
  previousArchives.push({ archive, files });
}
const archivePath = `.artifacts/evidence-runs/m4-${native.sha256.slice(0, 12)}-${adapter.sha256.slice(0, 12)}-${Date.now()}`;
const archive = resolve(root, archivePath);
await mkdir(archive, { recursive: true });
const inputs = new Set<string>([
  'AGENTS.md',
  'README.md',
  'package.json',
  'bun.lock',
  'bunfig.toml',
  '.bun-version',
  '.npmrc',
  'tsconfig.json',
  'turbo.json',
  'biome.json',
  'playwright.config.ts',
  'playwright.react.config.ts',
  'playwright.next.config.ts',
  'playwright.m4.config.ts',
  '.github/workflows/quality.yml',
  'docs/roadmap.md',
  'docs/implementation/requirements.json',
]);
for (const directory of [
  'packages/core/src',
  'packages/react/src',
  'packages/core/test',
  'packages/react/test',
  'scripts',
  'tests',
  'docs/implementation/m4',
  '.artifacts/m4',
  '.artifacts/m3/react-test-results',
  '.artifacts/m3/next-test-results',
  '.changeset',
]) {
  for await (const path of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
    dot: true,
  })) {
    const relative = `${directory}/${path}`;
    if (
      /(?:^|\/)(?:node_modules|dist|\.turbo)(?:\/|$)/.test(relative) ||
      /(?:\/evidence\.json|\/tracker-receipt\.json)$/.test(relative)
    )
      continue;
    inputs.add(relative);
  }
}
for (const pkg of ['core', 'react'])
  for (const file of ['package.json', 'tsconfig.json', 'README.md', 'LICENSE'])
    inputs.add(`packages/${pkg}/${file}`);
for (const path of [
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/browser-results.json',
  '.artifacts/m3/next-browser-results.json',
  '.artifacts/m3/next-consumers.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
])
  inputs.add(path);
const sourceArchive: Record<string, string> = {};
for (const path of [...inputs].sort()) {
  const from = resolve(root, path),
    to = resolve(archive, path);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  sourceArchive[path] = await hash(to);
}
const nextBuildFiles: Record<string, string> = {};
for (const [line, directory] of Object.entries(next.consumers) as [
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
    const to = resolve(archive, 'next-consumers', line, path);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(resolve(directory, path), to);
    nextBuildFiles[`next-consumers/${line}/${path}`] = await hash(to);
  }
const consumerFiles: Record<string, string> = {};
for (const [line, directory] of Object.entries({
  ...adapter.consumers,
  catalog: catalog.consumer,
}) as [string, string][]) {
  let locks = 0;
  for (const path of ['package.json', 'package-lock.json', 'bun.lock']) {
    if (!(await Bun.file(resolve(directory, path)).exists())) continue;
    const to = resolve(archive, 'consumers', line, path);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(resolve(directory, path), to);
    consumerFiles[`consumers/${line}/${path}`] = await hash(to);
    if (path !== 'package.json') locks++;
  }
  if (!locks) throw new Error(`Missing actual consumer lockfile: ${line}`);
}
const browserVersions: Record<string, string> = {};
for (const [name, engine] of [
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit],
] as const) {
  const browser = await engine.launch();
  try {
    browserVersions[name] = browser.version();
  } finally {
    await browser.close();
  }
}
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  status:
    'M4 in progress: incremental six-export implementation; new size/catalog/dependency/release gates remain open',
  archive: archivePath,
  artifacts: catalog.artifacts,
  availableExports: [
    'SkeletonBlock',
    'SkeletonLine',
    'SkeletonCircle',
    'SkeletonText',
    'TypingDots',
    'LoadingRegion',
  ],
  environment: {
    bun: Bun.version,
    node: process.version,
    arch: arch(),
    osRelease: release(),
    cpu: cpus()[0]?.model,
    totalMemoryBytes: totalmem(),
    toolchain: native.environment,
    browsers: browserVersions,
  },
  gates: {
    matrices,
    checks,
    nativeSliceSize: 'pass in every recorded CSS mode',
    newCatalogSize: budgetFailures.length
      ? 'fail'
      : 'pass for available slice only',
    budgetFailures,
    ssr: 'pass for scoped static/current two-owner fixtures; full mixed catalog unverified',
    cleanPair: 'pass: exact frozen-install rebuild',
    publication:
      'private flags and installed guards verified; no registry writes',
    renderer: 'provisional; M2 open',
    milestoneExit:
      'held: incomplete catalog/motion, failing new size limits, open M2 and missing visual/reference qualification',
  },
  sizes: catalog.sizes,
  cssDelivery: delivery,
  cacheProof,
  review: 'docs/implementation/m4/requirement-review.json',
  sourceBlockCount: 717,
  sourceArchive,
  nextBuildFiles,
  consumerFiles,
  previousArchives,
  repository,
  m2,
  m4,
  dependencies,
  limitations: review.remaining.concat([
    'Broad React/Next regressions retain the existing two-component integration scope; new four exports have current React browser coverage and supported-line type checks.',
    'No new whole-render sampling protocol or physical/manual-AT/floor qualification; no timings inherited from M2.',
    'Early development failures are diagnostic records, not a complete reproducible release packet; exact current artifacts and source are archived.',
  ]),
  sourceIsolation: {
    scope: 'this project only',
    historicalExternalSourceInspected: false,
    npmPublishing: 'disabled',
    deployment: 'none',
    visibilityChange: 'none',
  },
};
const text = JSON.stringify(evidence, null, 2);
await writeFile(resolve(archive, 'evidence.json'), `${text}\n`);
await writeFile(
  resolve(root, 'docs/implementation/m4/evidence.json'),
  `${text}\n`,
);
const mismatches: string[] = [];
for (const [path, expected] of Object.entries(sourceArchive))
  if ((await hash(resolve(archive, path))) !== expected) mismatches.push(path);
for (const [path, expected] of Object.entries({
  ...nextBuildFiles,
  ...consumerFiles,
}))
  if ((await hash(resolve(archive, path))) !== expected) mismatches.push(path);
if (mismatches.length)
  throw new Error(`Archive mismatch: ${mismatches.join(', ')}`);
console.log(
  JSON.stringify(
    {
      status: evidence.status,
      archive: archivePath,
      matrices,
      budgetFailures,
      files: Object.keys(sourceArchive).length,
      historicalFilesVerified: previousArchives.reduce(
        (n, r) => n + r.files,
        0,
      ),
    },
    null,
    2,
  ),
);
