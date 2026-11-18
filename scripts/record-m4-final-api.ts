import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const previous = await read('docs/implementation/m4/layout-evidence.json');
const packed = await read('.artifacts/m4/packed-report.json');
const adapter = await read('.artifacts/m3/packed-react-report.json');
const fixture = await read('.artifacts/m4-layout/fixtures.json');
if (
  adapter.native.sha256 !== packed.artifacts.core.sha256 ||
  adapter.sha256 !== packed.artifacts.react.sha256 ||
  adapter.result !== 'pass' ||
  JSON.stringify(fixture.artifacts) !== JSON.stringify(packed.artifacts)
)
  throw Error('Unbound exact pair');
for (const item of Object.values(packed.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(item.path)) !== item.sha256) throw Error('Changed package');
const changedProduction: string[] = [];
const inputs = new Set<string>();
for (const directory of ['packages/core', 'packages/react'])
  for await (const name of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (
      name.split('/').some((part) => ['node_modules', '.turbo'].includes(part))
    )
      continue;
    const path = `${directory}/${name}`;
    if (!/\.(?:tgz|log)$/.test(name)) inputs.add(path);
    if (
      name.startsWith('src/') &&
      (await hash(path)) !== previous.sourceArchive[path]
    )
      changedProduction.push(path);
    if (name.startsWith('dist/')) {
      const installed = resolve(
        fixture.consumer,
        'node_modules/@dotquilt-internal',
        directory.endsWith('core') ? 'core' : 'react',
        name,
      );
      if ((await hash(path)) !== (await hash(installed)))
        throw Error(`Installed output differs: ${path}`);
    }
  }
if (
  JSON.stringify(changedProduction.sort()) !==
  JSON.stringify(
    [
      'packages/react/src/internal/table-static.ts',
      'packages/react/src/table.tsx',
    ].sort(),
  )
)
  throw Error('Unexpected production scope');
const removedProduction = ['packages/core/src/internal/table-static.ts'];
if (await Bun.file(resolve(root, removedProduction[0] as string)).exists())
  throw Error('Retired private seam source returned');
const boundary = await read('.artifacts/m4-final-api/boundaries.json');
const apiReview = await read('.artifacts/m4-api/coverage-report.json');
if (
  boundary.status !== 'pass' ||
  JSON.stringify(boundary.artifacts) !== JSON.stringify(packed.artifacts) ||
  apiReview.entries.length !== 42 ||
  apiReview.finalReview.rows.length !== 10
)
  throw Error('Unbound final review');
const policyPaths = [
  'docs/implementation/requirements.json',
  'docs/implementation/m4/size-baseline.json',
  'scripts/check-m4-budgets.ts',
  'scripts/check-chart-options.ts',
  'scripts/check-table-options.ts',
];
for (const path of policyPaths)
  if ((await hash(path)) !== previous.sourceArchive[path])
    throw Error(`Policy changed: ${path}`);
for (const name of ['requirement-review', 'api-coverage']) {
  const now = await read(`docs/implementation/m4/${name}.json`),
    old = await read(`${previous.archive}/docs/implementation/m4/${name}.json`);
  const field = name === 'requirement-review' ? 'requirements' : 'clauses';
  if (JSON.stringify(now[field]) !== JSON.stringify(old[field]))
    throw Error('Original clause status/mapping changed');
}
const publicDeclarations = [];
for (const name of ['core', 'react']) {
  const manifest = await read(`packages/${name}/package.json`);
  if (
    !manifest.private ||
    manifest.scripts.prepublishOnly !==
      'node -e "throw new Error(\'npm publishing is disabled during private validation\')"'
  )
    throw Error('Publishing guard changed');
  const guard = Bun.spawnSync(
    [
      'node',
      '-e',
      "throw new Error('npm publishing is disabled during private validation')",
    ],
    { cwd: resolve(root, `packages/${name}`) },
  );
  if (guard.exitCode !== 1) throw Error('Publishing guard failed open');
  for (const [entry, target] of Object.entries(manifest.exports) as [
    string,
    string | { types: string },
  ][]) {
    if (typeof target === 'string') continue;
    const path = `packages/${name}/${target.types.replace(/^\.\//, '')}`,
      sha256 = await hash(path);
    if (sha256 !== previous.sourceArchive[path])
      throw Error(`Changed declaration: ${path}`);
    publicDeclarations.push({
      package: name,
      entry,
      path,
      sha256,
      unchanged: true,
    });
  }
}
for (const [path, sha] of Object.entries(fixture.hashes) as [
  string,
  string,
][]) {
  if (
    (await hash(
      path === 'client.js' ? '.artifacts/m4-layout/client.js' : path,
    )) !== sha
  )
    throw Error(`Changed fixture ${path}`);
  if (
    path.startsWith('tests/layout/') &&
    (await hash(
      resolve(fixture.consumer, 'layout', path.split('/').at(-1) as string),
    )) !== sha
  )
    throw Error('Installed fixture changed');
}
if (publicDeclarations.length !== 22)
  throw Error('Unexpected retained public declaration count');
const jobs = [
  ...(await read('.artifacts/m4-final-api/jobs.json')),
  ...(await read('.artifacts/m4-final-api/browser-jobs.json')),
];
if (jobs.length !== 26 || jobs.some((j) => j.exit !== j.expected))
  throw Error('Incomplete verification jobs');
const reportPaths = [
  ['layout', '.artifacts/m4-layout/browser-results.json', 231, 0],
  ['react', '.artifacts/m3/browser-results.json', 312, 0],
  ['next', '.artifacts/m3/next-browser-results.json', 102, 0],
  ['catalog', '.artifacts/m4/browser-results.json', 57, 0],
  ['shared', '.artifacts/m4-shared-wrapper/browser-results.json', 294, 0],
  ['copies', '.artifacts/m4-copies/browser-results.json', 240, 0],
  ['api', '.artifacts/m4-api/browser-results.json', 75, 0],
  ['native', '.artifacts/browser-results.json', 322, 2],
] as const;
const browsers = [];
const layoutObservations: {
  engine: string;
  name: string;
  data: Record<string, unknown>;
}[] = [];
for (const [name, path, count, skips] of reportPaths) {
  const report = await read(path);
  if (
    report.stats.expected !== count ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.stats.skipped !== skips ||
    report.errors.length
  )
    throw Error(`Failed/incomplete ${name}`);
  const metadata = report.config.metadata;
  const bound =
    name === 'native'
      ? metadata.artifactSha256 === packed.artifacts.core.sha256
      : name === 'react' || name === 'next'
        ? metadata.nativeArtifactSha256 === packed.artifacts.core.sha256 &&
          metadata.reactArtifactSha256 === packed.artifacts.react.sha256
        : JSON.stringify(metadata.artifacts) ===
          JSON.stringify(packed.artifacts);
  if (!bound) throw Error(`Wrong pair ${name}`);
  browsers.push({
    name,
    path,
    passes: count,
    skips,
    flaky: 0,
    sha256: await hash(path),
  });
  if (name === 'layout') {
    const visit = (suite: typeof report) => {
      for (const spec of suite.specs ?? [])
        for (const test of spec.tests)
          for (const result of test.results)
            for (const attachment of result.attachments ?? []) {
              if (attachment.contentType !== 'application/json') continue;
              const data = attachment.body
                ? JSON.parse(
                    Buffer.from(attachment.body, 'base64').toString('utf8'),
                  )
                : undefined;
              if (data)
                layoutObservations.push({
                  engine: test.projectName,
                  name: attachment.name,
                  data,
                });
            }
      for (const child of suite.suites ?? []) visit(child);
    };
    visit(report);
  }
}
if (layoutObservations.length !== 231)
  throw Error('Missing scoped layout observations');
const clsSummary = [];
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const rows = layoutObservations.filter(
    (r) => r.engine === engine && r.name === 'complete-scenario-layout',
  );
  if (rows.length !== 64) throw Error('Incomplete fixed matrix');
  const supports = rows.every((r) => r.data.supported === true),
    unsupported = rows.every((r) => r.data.supported === false);
  if (!supports && !unsupported) throw Error('Inconsistent observer support');
  const scores = rows.map((r) => r.data.cls);
  if (
    supports &&
    scores.some((s) => typeof s !== 'number' || !Number.isFinite(s) || s > 0.01)
  )
    throw Error('CLS gate failed');
  if (unsupported && scores.some((s) => s !== null))
    throw Error('Unsupported metric reported as measured');
  clsSummary.push({
    engine,
    fixedCases: 64,
    geometry: 'pass',
    layoutShiftAPI: supports,
    cls: supports ? Math.max(...(scores as number[])) : null,
    metricStatus: supports
      ? 'local controlled scenarios only'
      : 'unverified: API unsupported',
  });
}
const ssr = await read('.artifacts/m4-react-catalog/ssr.json');
if (
  !ssr.functionalPass ||
  ssr.rows.length !== 8 ||
  ssr.numericPass !== false ||
  ssr.artifacts.core !== packed.artifacts.core.sha256 ||
  ssr.artifacts.react !== packed.artifacts.react.sha256
)
  throw Error('Unbound SSR/held numeric scope');
const clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== packed.artifacts.core.sha256 ||
  clean.reproducedTarballSha256.react !== packed.artifacts.react.sha256
)
  throw Error('Clean reproduction mismatch');
const sizes = await read('.artifacts/m4/size-regressions.json');
if (
  JSON.stringify(sizes.artifacts) !== JSON.stringify(packed.artifacts) ||
  sizes.hardFailures.length !== 16 ||
  sizes.regressions.length !== 52
)
  throw Error('Unexpected size gate state');
const optionalSizeReports = [];
for (const path of [
  '.artifacts/m4/text-animation-closures.json',
  '.artifacts/m4/chart-animation-closures.json',
  '.artifacts/m4/table-animation-closures.json',
  '.artifacts/m4/chart-animation-budget.json',
  '.artifacts/m4/table-animation-budget.json',
]) {
  const report = await read(path);
  if (JSON.stringify(report.artifacts) !== JSON.stringify(packed.artifacts))
    throw Error(`Unbound size report ${path}`);
  optionalSizeReports.push({ path, sha256: await hash(path) });
}
const oldPacked = await read(
  `${previous.archive}/.artifacts/m4/packed-report.json`,
);
const sizeChanges = [],
  passingModeRegressions = [];
for (const [entry, row] of Object.entries(packed.sizes) as [
  string,
  Record<string, number>,
][]) {
  for (const mode of [
    'gzip',
    'external',
    'increment',
    'externalIncrement',
    'sharedExternal',
    'sharedExternalIncrement',
  ]) {
    const before = oldPacked.sizes[entry]?.[mode],
      after = row[mode];
    if (typeof before !== 'number' || typeof after !== 'number') continue;
    if (after !== before)
      sizeChanges.push({ entry, mode, before, after, delta: after - before });
    const limit =
      mode.includes('Increment') || mode === 'increment'
        ? row.incrementLimit
        : row.limit;
    if (typeof limit === 'number' && before <= limit && after > limit)
      passingModeRegressions.push({ entry, mode, before, after, limit });
  }
}
if (
  JSON.stringify(passingModeRegressions) !==
  JSON.stringify([
    {
      entry: 'table-root-react',
      mode: 'increment',
      before: 1977,
      after: 2051,
      limit: 2048,
    },
  ])
)
  throw Error('Unexpected passing-mode scope');
if (passingModeRegressions.length)
  console.log(
    'New passing-mode regression stays held; no waiver or acceptance.',
  );
const controls = {
  visibility: (await read('.artifacts/m4-final-api/repository-control.json'))
    .visibility,
  m2: (await read('.artifacts/m4-final-api/m2-control.json')).state,
  m4: (await read('.artifacts/m4-final-api/m4-control.json')).state,
};
if (
  controls.visibility !== 'PRIVATE' ||
  controls.m2 !== 'OPEN' ||
  controls.m4 !== 'OPEN'
)
  throw Error('Controls changed');
const ports = [];
for (const port of [4181, 4191, 4192, 4193, 4194, 4202, 4203, 4206, 4207]) {
  const open = await new Promise<boolean>((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', (e: NodeJS.ErrnoException) =>
      e.code === 'ECONNREFUSED' ? resolve(false) : reject(e),
    );
    socket.setTimeout(1000, () => {
      socket.destroy();
      reject(Error('Unknown port state'));
    });
  });
  if (open) throw Error(`Fixture port still open ${port}`);
  ports.push({ port, open });
}
const browserVersions = [];
for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  try {
    browserVersions.push({ engine: type.name(), version: browser.version() });
  } finally {
    await browser.close();
  }
}
const previousArchives = [];
for (const directory of [
  ...previous.previousArchives.map((r: { directory: string }) => r.directory),
  previous.archive,
]) {
  const old = await read(`${directory}/evidence.json`),
    records = {
      ...(old.evidenceSha256 ?? {
        ...old.sourceArchive,
        ...old.nextBuildFiles,
        ...old.consumerFiles,
      }),
      ...old.artifactFiles,
    };
  for (const [path, sha] of Object.entries(records))
    if (
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      (await hash(`${directory}/${path}`)) !== sha
    )
      throw Error(`Changed historical record: ${directory}/${path}`);
  previousArchives.push({ directory, records: Object.keys(records).length });
}
for (const row of previous.supplementalArchives) {
  if ((await hash(`${row.archive}/manifest.json`)) !== row.manifestSha256)
    throw Error('Diagnostic manifest changed');
  for (const [path, sha] of Object.entries(
    (await read(`${row.archive}/manifest.json`)).files,
  ))
    if ((await hash(`${row.archive}/${path}`)) !== sha)
      throw Error('Diagnostic record changed');
}
for (const directory of [
  'tests',
  'scripts',
  '.artifacts/m4-layout',
  '.artifacts/m4-final-api',
  '.artifacts/m4-shared-wrapper',
  '.artifacts/m4-copies',
  '.artifacts/m4-api',
  '.artifacts/m4-react-catalog',
])
  for await (const name of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  }))
    if (!name.split('/').includes('node_modules'))
      inputs.add(`${directory}/${name}`);
for (const path of [
  'AGENTS.md',
  'docs/roadmap.md',
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'biome.json',
  'playwright.layout.config.ts',
  'playwright.react.config.ts',
  'playwright.next.config.ts',
  'playwright.m4.config.ts',
  ...policyPaths,
  'docs/implementation/m4/final-api-progress.md',
  'docs/implementation/m4/final-review-matrix.json',
  'docs/implementation/m4/api-reference.md',
  'docs/implementation/m4/layout-quickstart.md',
  'docs/implementation/m4/layout-matrix.json',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/api-coverage.json',
  'docs/implementation/m4/copies-evidence.json',
  'docs/implementation/m4/copies-receipt.json',
  '.artifacts/m4/packed-report.json',
  '.artifacts/m4-api/coverage-report.json',
  '.artifacts/m4/size-regressions.json',
  '.artifacts/m4/text-animation-closures.json',
  '.artifacts/m4/chart-animation-closures.json',
  '.artifacts/m4/table-animation-closures.json',
  '.artifacts/m4/chart-animation-budget.json',
  '.artifacts/m4/table-animation-budget.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/next-consumers.json',
  '.artifacts/m3/clean-reproduction.json',
  ...reportPaths.map((r) => r[1]),
])
  inputs.add(path);
const archive = `.artifacts/evidence-runs/m4-final-api-${packed.artifacts.react.sha256.slice(0, 12)}-${Date.now()}`;
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
for (const name of ['client.tsx', 'scene.tsx', 'app.css'])
  await copy(
    resolve(fixture.consumer, 'layout', name),
    `consumer/layout/${name}`,
    consumerFiles,
  );
const nextConsumers = await read('.artifacts/m3/next-consumers.json');
const nextRuntimeVersions = [];
for (const [line, directory] of Object.entries(nextConsumers.consumers) as [
  string,
  string,
][]) {
  for (const rel of ['package.json', 'package-lock.json', '.next/BUILD_ID'])
    await copy(
      resolve(directory, rel),
      `consumers/next-${line}/${rel}`,
      consumerFiles,
    );
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(directory, '.next/static'),
    onlyFiles: true,
  }))
    await copy(
      resolve(directory, '.next/static', file),
      `consumers/next-${line}/.next/static/${file}`,
      consumerFiles,
    );
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(directory, '.next/server'),
    onlyFiles: true,
  }))
    await copy(
      resolve(directory, '.next/server', file),
      `consumers/next-${line}/.next/server/${file}`,
      consumerFiles,
    );
  const reactPackage = JSON.parse(
    await readFile(
      resolve(directory, 'node_modules/react/package.json'),
      'utf8',
    ),
  );
  const nextPackage = JSON.parse(
    await readFile(
      resolve(directory, 'node_modules/next/package.json'),
      'utf8',
    ),
  );
  const bundled = JSON.parse(
    await readFile(
      resolve(directory, 'node_modules/next/dist/compiled/react/package.json'),
      'utf8',
    ),
  );
  nextRuntimeVersions.push({
    line,
    next: nextPackage.version,
    installedReact: reactPackage.version,
    bundledReact: bundled.version,
  });
}
for await (const file of new Bun.Glob('*.js').scan({
  cwd: resolve(root, '.artifacts/m3'),
  onlyFiles: true,
}))
  await copy(`.artifacts/m3/${file}`, `.artifacts/m3/${file}`, sourceArchive);
for (const pkg of ['core', 'react'])
  await copy(packed.artifacts[pkg].path, `artifacts/${pkg}.tgz`, artifactFiles);
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  status:
    'Final finite API/package-boundary implementation review; owner/freeze/qualification remain open',
  archive,
  artifacts: packed.artifacts,
  baseline: {
    packet: 'docs/implementation/m4/layout-evidence.json',
    artifacts: previous.artifacts,
  },
  changedProduction,
  removedProduction,
  boundary,
  apiReview,
  publicDeclarations,
  controls: {
    ...controls,
    ports,
    npmPublishing: 'disabled',
    renderers: 'provisional',
  },
  environment: {
    bun: Bun.version,
    node: new TextDecoder()
      .decode(Bun.spawnSync(['node', '--version']).stdout)
      .trim(),
    platform: process.platform,
    arch: process.arch,
    browserVersions,
  },
  jobs,
  browsers,
  clsSummary,
  layoutObservations,
  nextRuntimeVersions,
  ssr: { functionalPass: true, numericPass: false, rows: 8 },
  sizes: {
    hardFailures: sizes.hardFailures,
    growthFlags: sizes.regressions.length,
    sizeChanges,
    passingModeRegressions,
    baselineAdvanced: false,
    optionalSizeReports,
  },
  previousArchives,
  supplementalArchives: previous.supplementalArchives,
  sourceArchive,
  consumerFiles,
  artifactFiles,
  gates: {
    m2: 'OPEN',
    m4: 'OPEN',
    featureFreeze: false,
    renderers: 'provisional',
    npmPublishing: 'disabled',
    remaining: [
      'Concrete review is recorded in final-review-matrix.json; owner corrections remain possible.',
      'Owner normal-speed review and feature freeze.',
      'All unchanged default/optional size/growth/SSR/M2 timing/init/setup/long-task/regression/reference/physical/browser-floor/manual qualification.',
      'Unsupported CLS remains unverified; fixed laboratory reservations do not establish universal application/font/layout stability.',
      'M5/cloud/export/distribution/deployment/public channel actions require separate authorization.',
    ],
  },
};
await Bun.write(
  resolve(root, archive, 'evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
await Bun.write(
  resolve(root, 'docs/implementation/m4/final-api-evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      archive,
      browserPasses: browsers.reduce((n, b) => n + b.passes, 0),
      clsSummary,
      records:
        Object.keys(sourceArchive).length +
        Object.keys(consumerFiles).length +
        Object.keys(artifactFiles).length,
      previousRecords: previousArchives.reduce((n, r) => n + r.records, 0),
    },
    null,
    2,
  ),
);
