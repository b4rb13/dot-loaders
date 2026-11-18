import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { m4BudgetFailures } from './m4-budgets.js';

const root = resolve(import.meta.dir, '..');
const json = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const catalog = await json('.artifacts/m4/packed-report.json');
const native = await json('.artifacts/packed-report.json'),
  react = await json('.artifacts/m3/packed-react-report.json'),
  clean = await json('.artifacts/m3/clean-reproduction.json');
for (const a of Object.values(catalog.artifacts) as {
  path: string;
  sha256: string;
}[])
  if ((await hash(a.path)) !== a.sha256)
    throw new Error('Changed table artifact');
if (
  native.sha256 !== catalog.artifacts.core.sha256 ||
  react.sha256 !== catalog.artifacts.react.sha256 ||
  react.native.sha256 !== native.sha256 ||
  react.result !== 'pass' ||
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== native.sha256 ||
  clean.reproducedTarballSha256.react !== react.sha256
)
  throw new Error('Fresh matching native/React/clean evidence required');
const matrices: Record<string, unknown> = {};
for (const [name, path, count, skipped] of [
  ['native', '.artifacts/browser-results.json', 298, 2],
  ['react', '.artifacts/m3/browser-results.json', 216, 0],
  ['next', '.artifacts/m3/next-browser-results.json', 60, 0],
  ['table', '.artifacts/m4/table-results.json', 90, 0],
  ['tableOptional', '.artifacts/m4/table-options-results.json', 24, 0],
  ['tableParts', '.artifacts/m4/table-parts-results.json', 21, 0],
  ['chartProduction', '.artifacts/m4/chart-production-results.json', 12, 0],
  ['chartOptional', '.artifacts/m4/chart-options-results.json', 24, 0],
] as const) {
  const report = await json(path);
  if (
    report.stats.expected !== count ||
    report.stats.skipped !== skipped ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.errors?.length
  )
    throw new Error(`Incomplete ${name} matrix`);
  if (
    name === 'native' &&
    report.config.metadata.artifactSha256 !== native.sha256
  )
    throw new Error('Stale native browser matrix');
  if (name === 'react' || name === 'next') {
    if (
      report.config.metadata.nativeArtifactSha256 !== native.sha256 ||
      report.config.metadata.reactArtifactSha256 !== react.sha256
    )
      throw new Error(`Stale ${name} browser matrix`);
  }
  if (
    [
      'table',
      'tableOptional',
      'tableParts',
      'chartProduction',
      'chartOptional',
    ].includes(name)
  )
    for (const pkg of ['core', 'react'])
      if (
        report.config.metadata.artifacts[pkg].sha256 !==
        catalog.artifacts[pkg].sha256
      )
        throw new Error(`Stale ${name} matrix`);
  matrices[name] = { path, sha256: await hash(path), ...report.stats };
}
const equivalence = await json(
  '.artifacts/m4/table-unaffected-comparison.json',
);
if (
  equivalence.result !== 'pass' ||
  equivalence.artifacts.core.sha256 !== native.sha256 ||
  equivalence.artifacts.react.sha256 !== react.sha256
)
  throw new Error('Non-table regression scope must be recorded');
const reference = await json(
  '.artifacts/m4/table-development/before-final/browser-results.json',
);
if (
  reference.stats.expected !== 252 ||
  reference.stats.unexpected ||
  reference.stats.flaky
)
  throw new Error('Missing original equivalent catalog observations');
const regressions = await json('.artifacts/m4/size-regressions.json'),
  closures = await json('.artifacts/m4/table-animation-closures.json'),
  budget = await json('.artifacts/m4/table-animation-budget.json');
for (const report of [regressions, closures, budget])
  for (const pkg of ['core', 'react'])
    if (report.artifacts[pkg].sha256 !== catalog.artifacts[pkg].sha256)
      throw new Error('Stale table size report');
const failures = m4BudgetFailures(catalog.sizes);
if (JSON.stringify(failures) !== JSON.stringify(regressions.hardFailures))
  throw new Error('Contradictory size gate');
const requirements = await json('docs/implementation/requirements.json'),
  review = await json('docs/implementation/m4/requirement-review.json');
if (
  requirements.requirements.length !== 717 ||
  review.requirements.length !== 717 ||
  requirements.requirements.some(
    (r: { id: string }, i: number) =>
      r.id !== review.requirements[i]?.id ||
      review.requirements[i]?.fullClauseStatus !== 'unverified',
  )
)
  throw new Error('Lossless requirement review changed');
const guards = [];
for (const pkg of ['core', 'react']) {
  const manifest = await json(`packages/${pkg}/package.json`);
  const code =
    "throw new Error('npm publishing is disabled during private validation')";
  if (
    manifest.private !== true ||
    manifest.scripts.prepublishOnly !==
      `node -e ${String.fromCharCode(34)}${code}${String.fromCharCode(34)}`
  )
    throw new Error('Publication guard changed');
  const proc = Bun.spawn(['node', '-e', code], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 1) throw new Error('Publication guard did not reject');
  guards.push({ pkg, private: true, exitCode, registryWrites: 0 });
}
const latest = await json('docs/implementation/m4/chart-size-evidence.json');
const priorTable = await json('docs/implementation/m4/table-evidence.json');
const previousArchives = [];
for (const directory of new Set([
  ...latest.previousArchives.map((r: { directory: string }) => r.directory),
  latest.archive,
  ...priorTable.previousArchives.map((r: { directory: string }) => r.directory),
  priorTable.archive,
])) {
  const prior = await json(`${directory}/evidence.json`),
    records = {
      ...(prior.evidenceSha256 ?? {
        ...prior.sourceArchive,
        ...prior.nextBuildFiles,
        ...prior.consumerFiles,
      }),
      ...prior.artifactFiles,
    };
  for (const [path, expected] of Object.entries(records)) {
    if (
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      (await hash(`${directory}/${path}`)) !== expected
    )
      throw new Error(`Historical archive changed: ${directory}/${path}`);
  }
  previousArchives.push({ directory, records: Object.keys(records).length });
}
const archive = `.artifacts/evidence-runs/m4-table-${native.sha256.slice(0, 12)}-${Date.now()}`;
const progressPath = resolve(root, 'docs/implementation/m4/table-progress.md');
const draft = (await readFile(progressPath, 'utf8')).split(
  '\n## Verified snapshot',
)[0];
const freshPasses = Object.values(matrices).reduce<number>(
  (n, row) => n + (row as { expected: number }).expected,
  0,
);
const rows = ['root', 'family'].map((entry) => ({
  entry,
  native: catalog.sizes[`table-${entry}-native`],
  react: catalog.sizes[`table-${entry}-react`],
}));
await writeFile(
  progressPath,
  `${draft}\n## Verified snapshot\n\nNative SHA-256: \`${native.sha256}\`.\nReact SHA-256: \`${react.sha256}\`.\n\nThe exact pair passes **${freshPasses} scoped browser checks** plus two expected unavailable-heap skips: 298 native/engine, 216 existing React adapter, 60 production Next, 90 table/CSP/hydration/timing/motion, 24 complete optional table consumers, 21 focused table/props/replay/geometry/resource/lifecycle checks, and 36 optimized default/optional chart checks. These are local supported-fixture observations, not actual historical-browser or full-nine-export qualification. Native/React units and 23 harness contracts, floor/current types, DOM-free Node/Bun SSR/streaming, clean exact-pair reproduction, lint and publication rejection guards also pass.\n\nThe 84 table captures cover both idle recipes × seven cell styles × idle/mid-handoff × three browsers. Three normal-speed recordings supplement them. Owner approval remains unverified. The original 252 non-table catalog observations are retained separately: six entry graphs have identical runnable code apart from the required build identity and temporary-path comments, with 32 fixture/CSS files and 25 SSR outputs exact. They are not relabelled as fresh runs. The current native/React/Next suite checks registration with the actual new identity.\n\n| Default consumer | JS gzip B | JS + actual CSS B | Gate |\n| --- | ---: | ---: | --- |\n${rows.map((r) => `| native ${r.entry} | ${r.native.gzip} | ${r.native.external} | ${r.native.pass ? 'pass' : 'FAIL'} / 12,288 B |`).join('\n')}\n\nThe root matched React increment is **${rows[0]?.react.externalIncrement} B including delivery CSS** against 2,048 B; the selective increment is **${rows[1]?.react.externalIncrement} B**. Complete first-party native root/selective closures are **${closures.sizes['firstParty-root-native'].external} / ${closures.sizes['firstParty-family-native'].external} B**; custom closures **${closures.sizes['custom-root-native'].external} / ${closures.sizes['custom-family-native'].external} B**, all above 12,288 B. Optional matched React increments remain within 2,048 B. The 20% headroom goal is not achieved. All other recorded absolute ceilings pass; there are ${regressions.regressions.length} newly flagged regressions against the unchanged approved existing-entry reference.\n\nBoth table default and optional size gates remain failing, with no exception or baseline reset. The next engineering task is to reduce the complete table closures and root adapter increment while retaining this API, motion, accessibility and resource behavior. Evidence archive: \`${archive}\`.\n`,
);
const inputs = new Set<string>([
  'AGENTS.md',
  'README.md',
  'package.json',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'biome.json',
  'docs/implementation/requirements.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m4/table-progress.md',
  'docs/implementation/m4/table-quickstart.md',
  'docs/implementation/m4/table-fixtures.json',
  'docs/implementation/m4/size-baseline.json',
  'docs/implementation/m4/size-baseline-pre-rich.json',
  'docs/implementation/m4/size-baseline-skeleton-dissolve.json',
  '.artifacts/packed-report.json',
  '.artifacts/browser-results.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/browser-results.json',
  '.artifacts/m3/next-browser-results.json',
  '.artifacts/m3/next-consumers.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/clean-reproduction.json',
]);
for (const dir of [
  'packages/core/src',
  'packages/core/dist',
  'packages/core/test',
  'packages/react/src',
  'packages/react/dist',
  'packages/react/test',
  'scripts',
  'tests/m4',
  'tests/table',
  'tests/types',
  'tests/react',
  'tests/bench',
  'tests/fixtures',
  '.changeset',
])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, dir),
    onlyFiles: true,
  }))
    if (
      !file
        .split('/')
        .some((p) => ['node_modules', '.next', '.turbo'].includes(p))
    )
      inputs.add(`${dir}/${file}`);
for (const pkg of ['core', 'react'])
  for (const name of ['package.json', 'README.md', 'LICENSE'])
    inputs.add(`packages/${pkg}/${name}`);
for await (const name of new Bun.Glob('playwright*.config.ts').scan(root))
  inputs.add(name);
for await (const name of new Bun.Glob('*.{json,js,log}').scan(
  resolve(root, '.artifacts/m4'),
))
  inputs.add(`.artifacts/m4/${name}`);
for (const dir of [
  '.artifacts/m4/table-results',
  '.artifacts/m4/table-options-results',
  '.artifacts/m4/table-parts-results',
  '.artifacts/m4/table-development',
])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, dir),
    onlyFiles: true,
  }))
    inputs.add(`${dir}/${file}`);
const sourceArchive: Record<string, string> = {};
for (const path of [...inputs].sort()) {
  const destination = resolve(root, archive, path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, path), destination);
  sourceArchive[path] = await hash(`${archive}/${path}`);
}
const artifactFiles: Record<string, string> = {};
for (const [name, a] of Object.entries(catalog.artifacts) as [
  string,
  { path: string; sha256: string },
][]) {
  const path = `artifacts/${name}.tgz`;
  await mkdir(resolve(root, archive, 'artifacts'), { recursive: true });
  await copyFile(a.path, resolve(root, archive, path));
  artifactFiles[path] = await hash(`${archive}/${path}`);
  if (artifactFiles[path] !== a.sha256)
    throw new Error('Archive artifact changed');
}
const visuals = [...inputs].filter(
  (p) => p.startsWith('.artifacts/m4/table-results/') && p.endsWith('.png'),
);
const videos = [...inputs].filter(
  (p) => p.startsWith('.artifacts/m4/table-results/') && p.endsWith('.webm'),
);
if (visuals.length !== 84 || videos.length !== 3)
  throw new Error('Table recordings/captures incomplete');
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  archive,
  status:
    'Incremental TableLoader native/current React/static and rich motion implemented; download and full M4 acceptance held',
  artifacts: catalog.artifacts,
  matrices,
  existingCatalogReference: {
    path: '.artifacts/m4/table-development/before-final/browser-results.json',
    sha256: await hash(
      '.artifacts/m4/table-development/before-final/browser-results.json',
    ),
    stats: reference.stats,
    equivalence,
  },
  sizes: catalog.sizes,
  regressions,
  optionalClosures: closures,
  optionalBudget: budget,
  visuals,
  videos,
  guards,
  sourceArchive,
  artifactFiles,
  previousArchives,
  requirements: { count: 717, fullClauseStatus: 'unverified' },
  gates: {
    tableBehavior: 'pass within recorded local fixture scopes',
    tableDefaultSize: failures.filter((key: string) => key.startsWith('table-'))
      .length
      ? 'fail'
      : 'pass',
    absoluteSizeFailures: failures,
    existingEntryGrowth: regressions.regressions.length
      ? 'review-required'
      : 'pass',
    optionalSize: budget.result,
    newEntryBaseline: 'unverified',
    ownerNormalSpeedReview: 'unverified',
    completeCatalogAndCoordination: 'unverified',
    referenceAndManualAT: 'unverified',
    m2: 'open',
    m4: 'open',
    renderer: 'provisional',
    npmPublishing: 'disabled',
  },
  limitations: [
    'No actual historical-browser, physical-reference, manual-AT, full mixed-catalog or owner visual qualification.',
    'Current M3 integration retains its original scoped consumer families; table-specific production Next/RSC route coverage remains unverified.',
    'Original non-table catalog observations are reused only through the explicit generated-identity/module-comment equivalence proof, not relabelled as fresh runs.',
    'Deterministic endpoint timing pauses only fixture presentation WAAPI effects to separate compositor and simulated JS clocks; natural-speed recordings remain unmodified. CSP checks exclude only the exact same-origin /favicon.ico img-src request; script/style CSP assertions remain enabled.',
    'Earlier diagnostic captures and interrupted/superseded reproduction attempts remain historical; no size ceiling, API, behavior or accessibility waiver.',
    'Source remains local/uncommitted. No external source inspection, publication, visibility change, deployment or cloud-device session.',
  ],
};
await writeFile(
  resolve(root, archive, 'evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
await writeFile(
  resolve(root, 'docs/implementation/m4/table-evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
for (const [path, expected] of Object.entries({
  ...sourceArchive,
  ...artifactFiles,
}))
  if ((await hash(`${archive}/${path}`)) !== expected)
    throw new Error(`Archive mismatch: ${path}`);
console.log(
  JSON.stringify(
    {
      archive,
      records: Object.keys(sourceArchive).length + 2,
      priorRecords: previousArchives.reduce((n, r) => n + r.records, 0),
      gates: evidence.gates,
    },
    null,
    2,
  ),
);
