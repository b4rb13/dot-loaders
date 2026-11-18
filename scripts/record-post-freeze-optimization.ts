import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..');
const read = (p: string) => Bun.file(resolve(root, p)).json();
const hash = async (p: string) =>
  new Bun.CryptoHasher('sha256')
    .update(await Bun.file(resolve(root, p)).arrayBuffer())
    .digest('hex');
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const frozen = await read('docs/implementation/m4/feature-freeze.json');
const approved = await read(
  'docs/implementation/m4/motion-review-evidence.json',
);
const packed = await read('.artifacts/m4/packed-report.json');
if (packed.artifacts.core.sha256 !== frozen.artifacts.core.sha256)
  throw Error('Native artifact changed');
for (const a of Object.values(packed.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(a.path)) !== a.sha256) throw Error('Artifact changed');
let frozenRecords = 0;
for (const [p, h] of Object.entries({
  ...frozen.frozenFiles,
  ...frozen.artifactFiles,
})) {
  if ((await hash(`${frozen.archive}/${p}`)) !== h)
    throw Error('Frozen snapshot changed');
  frozenRecords++;
}
const inputs = new Set<string>(),
  changedProduction: string[] = [];
for (const directory of ['packages/core', 'packages/react'])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (
      file.split('/').some((p) => ['node_modules', '.turbo'].includes(p)) ||
      /\.(tgz|log)$/.test(file)
    )
      continue;
    const p = `${directory}/${file}`;
    inputs.add(p);
    if (file.startsWith('src/') && (await hash(p)) !== frozen.frozenFiles[p])
      changedProduction.push(p);
    if (file.startsWith('dist/')) {
      const name = directory.endsWith('core') ? 'core' : 'react';
      if (
        (await hash(p)) !==
        (await hash(
          resolve(
            packed.consumer,
            `node_modules/@dotquilt-internal/${name}`,
            file,
          ),
        ))
      )
        throw Error('Installed compiled mismatch');
    }
  }
if (!same(changedProduction, ['packages/react/src/skeleton-shapes.tsx']))
  throw Error('Unexpected production scope');
const index = await read('.artifacts/m4-api/coverage-report.json'),
  oldIndex = await read(
    `${approved.archive}/.artifacts/m4-api/coverage-report.json`,
  );
if (
  index.status !== 'index-integrity-pass' ||
  !same(index.entries, oldIndex.entries) ||
  index.sourceBlocksRetained !== 717
)
  throw Error('Public API changed');
const declarations = new Map<string, string>();
for (const row of index.entries)
  if (row.declaration) {
    if ((await hash(row.declaration)) !== row.sha256)
      throw Error('Declaration changed');
    declarations.set(row.declaration, row.sha256);
  }
if (declarations.size !== 22) throw Error('Declaration inventory changed');
for (const p of [
  'packages/core/package.json',
  'packages/react/package.json',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/api-coverage.json',
])
  if ((await hash(p)) !== frozen.frozenFiles[p])
    throw Error(`Policy changed ${p}`);
const comparison = await read('.artifacts/post-freeze-ssr/comparison.json');
if (
  comparison.htmlCells !== 2592 ||
  comparison.documents !== 24 ||
  !comparison.numericPass ||
  !comparison.functionalPass ||
  comparison.artifacts.core !== packed.artifacts.core.sha256 ||
  comparison.artifacts.react !== packed.artifacts.react.sha256
)
  throw Error('Comparison failed');
const ssr = await read('.artifacts/m4-react-catalog/ssr.json');
if (!ssr.functionalPass || !ssr.numericPass || ssr.rows.length !== 8)
  throw Error('SSR gates failed');
const worst = Math.max(
  ...ssr.rows.flatMap(
    (r: { observations: { name: string; maximumOwnBytes: number }[] }) =>
      r.observations
        .filter((x) => x.name === 'SkeletonText')
        .map((x) => x.maximumOwnBytes),
  ),
);
if (worst !== 15760) throw Error('SSR maximum changed');
const browsers = [];
for (const [name, path, count] of [
  [
    'react-catalog',
    '.artifacts/post-freeze-ssr/react-catalog-browser-results.json',
    96,
  ],
  [
    'maximum-multiline',
    '.artifacts/post-freeze-ssr/maximum-multiline-browser-results.json',
    30,
  ],
] as const) {
  const report = await read(path),
    s = report.stats,
    m = report.config.metadata;
  if (s.expected !== count || s.skipped || s.flaky || s.unexpected)
    throw Error(`Browser failure ${name}`);
  if (
    name === 'react-catalog'
      ? m.nativeArtifactSha256 !== packed.artifacts.core.sha256 ||
        m.reactArtifactSha256 !== packed.artifacts.react.sha256
      : !same(m.artifacts, packed.artifacts)
  )
    throw Error('Browser artifacts differ');
  browsers.push({
    name,
    path,
    passes: s.expected,
    skips: s.skipped,
    flaky: s.flaky,
    sha256: await hash(path),
  });
}
const jobs = await read('.artifacts/post-freeze-ssr/jobs.json');
if (
  jobs.length !== 18 ||
  jobs.some((j: { code: number; expected: number }) => j.code !== j.expected)
)
  throw Error('Check failed');
const clean = await read('.artifacts/m3/clean-reproduction.json');
if (
  clean.result !== 'pass' ||
  Object.entries(packed.artifacts).some(
    ([n, a]) =>
      clean.reproducedTarballSha256[n] !== (a as { sha256: string }).sha256,
  )
)
  throw Error('Clean reproduction failed');
const sizes = await read('.artifacts/m4/size-regressions.json');
const oldPacked = await read(
  `${approved.archive}/.artifacts/m4/packed-report.json`,
);
if (
  !same(sizes.hardFailures, approved.sizes.hardFailures) ||
  sizes.regressions.length !== 52
)
  throw Error('Size hold inventory changed');
const changes = [];
for (const [name, value] of Object.entries(packed.sizes)) {
  const row = value as Record<string, number>,
    old = oldPacked.sizes[name];
  if (name.endsWith('native') && !same(row, old))
    throw Error('Native size changed');
  for (const key of ['gzip', 'external', 'increment', 'externalIncrement'])
    if (typeof row[key] === 'number' && row[key] !== old[key])
      changes.push({ name, key, before: old[key], after: row[key] });
}
const timings = await read('.artifacts/feature-freeze/timing-summary.json');
if (
  timings.length !== 3 ||
  timings.some(
    (r: {
      nativeSha256: string;
      protocolComplete: boolean;
      collectionPass: boolean;
      validPairs: number;
      warmupPairs: number;
    }) =>
      r.nativeSha256 !== packed.artifacts.core.sha256 ||
      !r.protocolComplete ||
      !r.collectionPass ||
      r.validPairs !== 20 ||
      r.warmupPairs !== 3,
  )
)
  throw Error('Timing protocol incomplete');
const traceRecords: Record<string, string> = {};
for (const row of timings) {
  if ((await hash(row.report)) !== row.sha256)
    throw Error('Trace report changed');
  traceRecords[row.report] = row.sha256;
  const report = await read(row.report);
  for (const [p, h] of Object.entries(report.evidenceFiles)) {
    if (!p.startsWith('.artifacts/m2-traces/') || (await hash(p)) !== h)
      throw Error('Trace record changed');
    traceRecords[p] = h as string;
  }
  for (const [p, h] of Object.entries(report.inputs)) {
    const snapshot = `${report.directory}/inputs/${p}`;
    if ((await hash(snapshot)) !== h) throw Error('Trace input changed');
    traceRecords[snapshot] = h as string;
  }
}
const versions = [];
for (const type of [chromium, firefox, webkit]) {
  const b = await type.launch();
  try {
    versions.push({ engine: type.name(), version: b.version() });
  } finally {
    await b.close();
  }
}
for (const directory of [
  'scripts',
  'tests/react',
  'tests/layout',
  '.artifacts/post-freeze-ssr',
  '.artifacts/feature-freeze',
  '.artifacts/m4-react-catalog',
])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    if (file.split('/').some((p) => ['node_modules', '.turbo'].includes(p)))
      continue;
    inputs.add(`${directory}/${file}`);
  }
for (const p of [
  'AGENTS.md',
  'README.md',
  'docs/roadmap.md',
  'package.json',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'biome.json',
  '.changeset/m4-multiline-ssr-budget.md',
  'docs/implementation/m4/feature-freeze.json',
  'docs/implementation/m4/feature-freeze.md',
  'docs/implementation/m4/feature-freeze-receipt.json',
  'docs/implementation/m4/optimization-progress.md',
  'docs/implementation/m4/owner-motion-review.md',
  'docs/implementation/m4/functional-checklist.md',
  'docs/implementation/m4/api-coverage.json',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  'docs/implementation/m4/requirement-review.json',
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
  '.artifacts/m4/packed-report.json',
  '.artifacts/m4/size-regressions.json',
  '.artifacts/m4-api/coverage-report.json',
  '.artifacts/m4-final-api/boundaries.json',
  '.artifacts/m4-layout/fixtures.json',
  'playwright.react.config.ts',
  'playwright.layout.config.ts',
  ...['text', 'chart', 'table'].map(
    (f) => `.artifacts/m4/${f}-animation-closures.json`,
  ),
])
  inputs.add(p);
for (const name of ['core', 'react']) {
  const p = await read(`packages/${name}/package.json`);
  if (
    !p.private ||
    !p.scripts.prepublishOnly.includes('npm publishing is disabled')
  )
    throw Error('Publishing guard changed');
}
const archive = `.artifacts/evidence-runs/m4-post-freeze-ssr-${packed.artifacts.react.sha256.slice(0, 12)}-${Date.now()}`;
const sourceArchive: Record<string, string> = {},
  artifactFiles: Record<string, string> = {};
async function copy(from: string, to: string, records: Record<string, string>) {
  const p = resolve(root, archive, to);
  await mkdir(dirname(p), { recursive: true });
  await copyFile(resolve(root, from), p);
  records[to] = await hash(p);
}
for (const p of [...inputs].sort()) await copy(p, p, sourceArchive);
for (const [name, a] of Object.entries(packed.artifacts))
  await copy(
    (a as { path: string }).path,
    `artifacts/${name}.tgz`,
    artifactFiles,
  );
const packet = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  task: 'https://github.com/b4rb13/dot-loaders/issues/18',
  performanceTask: 'https://github.com/b4rb13/dot-loaders/issues/16',
  archive,
  artifacts: packed.artifacts,
  frozenBaseline: {
    path: 'docs/implementation/m4/feature-freeze.json',
    sha256: await hash('docs/implementation/m4/feature-freeze.json'),
    archive: frozen.archive,
    verifiedRecords: frozenRecords,
    artifacts: frozen.artifacts,
  },
  changedProduction,
  publicBoundary: {
    entries: 42,
    declarations: 22,
    changedDeclarations: [],
    originalClauseStatuses: 717,
  },
  ssr: {
    beforeOwnBytes: 16710,
    afterOwnBytes: worst,
    ceiling: 16384,
    savedRawMarkupBytes: 950,
    functionalPass: ssr.functionalPass,
    numericPass: ssr.numericPass,
    cells: ssr.rows.length,
    comparison,
  },
  browsers,
  browserPasses: 126,
  jobs,
  clean,
  sizes: {
    hardFailures: sizes.hardFailures,
    growthFlags: 52,
    changes,
    nativeDefaultSizesUnchanged: true,
    baselines: 'unchanged; no new growth approval',
  },
  timings,
  traceRecords,
  environment: { bun: Bun.version, browsers: versions },
  sourceArchive,
  artifactFiles,
  gates: {
    ownerVisualReview: 'approved-frozen-baseline',
    featureFreeze: true,
    m2: 'OPEN',
    m4: 'OPEN',
    renderers: 'provisional',
    npmPublishing: 'disabled',
    repository: 'PRIVATE',
    milestoneAcceptance: false,
  },
  limitations: [
    '126 current affected browser passes, not a new full frozen environment/Next/manual qualification',
    '2592 HTML field comparisons allow only redundant React SVG child hiding attributes to differ; no pixel/aesthetic approval of a changed rendering algorithm inferred',
    'Native artifact is unchanged; SSR reduction establishes no rendering-speed gain',
    'Fresh full native timing protocol succeeds but all rendering and whole-work numerical gates fail; list long tasks and original reference/regression/memory/manual obligations remain held',
    'Raw traces and inputs stay in unique immutable timestamped paths with every hash verified; no valid slow sample discarded',
    'Initial stale-doc API index failure retained separately; original mappings and obligations unchanged',
    'No cloud transfer, deployment, distribution, registry action or visibility change',
  ],
};
await mkdir(resolve(root, archive), { recursive: true });
const text = `${JSON.stringify(packet, null, 2)}\n`;
await writeFile(resolve(root, archive, 'evidence.json'), text);
await writeFile(
  resolve(root, 'docs/implementation/m4/optimization-evidence.json'),
  text,
);
console.log(
  JSON.stringify(
    {
      archive,
      records:
        Object.keys(sourceArchive).length + Object.keys(artifactFiles).length,
      traceRecords: Object.keys(traceRecords).length,
      browserPasses: 126,
      ssr: packet.ssr.afterOwnBytes,
    },
    null,
    2,
  ),
);
