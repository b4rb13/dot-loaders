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
const native12Studies = [];
for (const path of [
  '.artifacts/m4/native12-work/summary.json',
  '.artifacts/m4/native12-host/report.json',
  '.artifacts/m4/native12-extension/measurements.json',
  '.artifacts/m4/native12-transaction/table-reconstruction.json',
])
  native12Studies.push({ path, sha256: await hash(path) });
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
const smoke: Record<string, unknown> = {};
const smokeInputs: string[] = [];
for (const phase of ['idle', 'handoff']) {
  const pointerPath = `.artifacts/m2-trace-latest-${phase}-smoke.json`;
  const pointer = await json(pointerPath);
  const report = await json(pointer.report);
  if (
    (await hash(pointer.report)) !== pointer.sha256 ||
    report.artifactSha256 !== native.sha256 ||
    !report.smoke ||
    !report.collectionPass ||
    report.fatal?.length
  )
    throw new Error(`Invalid ${phase} diagnostic trace`);
  smoke[phase] = { pointerPath, ...pointer, report };
  smokeInputs.push(pointerPath, pointer.report);
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, report.directory),
    onlyFiles: true,
  }))
    smokeInputs.push(`${report.directory}/${file}`);
}
for (const [name, path, count, skipped] of [
  ['native', '.artifacts/browser-results.json', 298, 2],
  ['react', '.artifacts/m3/browser-results.json', 216, 0],
  ['next', '.artifacts/m3/next-browser-results.json', 60, 0],
  ['table', '.artifacts/m4/table-results.json', 90, 0],
  ['tableOptional', '.artifacts/m4/table-options-results.json', 24, 0],
  ['tableParts', '.artifacts/m4/table-parts-results.json', 27, 0],
  ['catalog', '.artifacts/m4/browser-results.json', 252, 0],
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
      'catalog',
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
const comparisons: Record<string, unknown> = {};
for (const [name, path, count] of [
  ['commands', '.artifacts/m4/table-command-comparison.json', 289],
  ['ssr', '.artifacts/m4/table-ssr-comparison.json', 21],
  ['visuals', '.artifacts/m4/table-size-visual-comparison.json', 414],
] as const) {
  const report = await json(path);
  if (
    report.result !== 'pass' ||
    (report.rows ?? report.cases ?? report.comparisons).length !== count
  )
    throw new Error(`Incomplete ${name} comparison`);
  for (const pkg of ['core', 'react'])
    if (report.artifacts[pkg].sha256 !== catalog.artifacts[pkg].sha256)
      throw new Error(`Stale ${name} comparison`);
  comparisons[name] = { path, sha256: await hash(path), count, report };
}
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
if (failures.some((key) => !key.startsWith('table-')))
  throw new Error('Another entry regressed beyond its absolute ceiling');
const chartBudget = await json('.artifacts/m4/chart-animation-budget.json');
if (chartBudget.result !== 'pass')
  throw new Error('Chart optional gate regressed');
for (const pkg of ['core', 'react'])
  if (chartBudget.artifacts[pkg].sha256 !== catalog.artifacts[pkg].sha256)
    throw new Error('Stale Chart size gate');
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
const priorSize = (await Bun.file(
  resolve(root, 'docs/implementation/m4/table-size-evidence.json'),
).exists())
  ? await json('docs/implementation/m4/table-size-evidence.json')
  : undefined;
const previousArchives = [];
for (const directory of new Set([
  ...latest.previousArchives.map((r: { directory: string }) => r.directory),
  latest.archive,
  ...priorTable.previousArchives.map((r: { directory: string }) => r.directory),
  priorTable.archive,
  ...(priorSize
    ? [
        ...priorSize.previousArchives.map(
          (r: { directory: string }) => r.directory,
        ),
        priorSize.archive,
      ]
    : []),
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
const archive = `.artifacts/evidence-runs/m4-table-size-${native.sha256.slice(0, 12)}-${Date.now()}`;
const progressPath = resolve(
  root,
  'docs/implementation/m4/table-size-progress.md',
);
const draft = (await readFile(progressPath, 'utf8')).split(
  '\n## Verified snapshot',
)[0];
const freshPasses = Object.values(matrices).reduce<number>(
  (n, row) => n + (row as { expected: number }).expected,
  0,
);
await writeFile(
  progressPath,
  `${draft}\n## Verified snapshot\n\nCore SHA-256: \`${native.sha256}\`. React SHA-256: \`${react.sha256}\`.\n\nThe exact pair passes **${freshPasses} fresh scoped browser checks** plus two expected heap skips: 298 native/engine, 216 existing React adapter, 60 production Next, 252 existing catalog, 90 Table, 24 complete optional Table, 27 focused Table/region/React/resource cases and 36 compiled Chart consumers. Current/floor declarations, 38 native + six React units, 23 harness contracts, DOM-free Node/Bun SSR/streaming and clean exact-pair reproduction pass. Local diagnostic smoke runs remain distinct from reference protocols.\n\n**289 exact ordered geometry/command/effect/native-SSR comparisons**, **21 unchanged React SSR strings**, and **414 identical PNGs** (84 Table, 270 Chart, 60 Text) match immutable earlier evidence. Three new Table normal-speed videos are retained; owner approval stays unverified. All 252 catalog observations above are freshly run for this pair.\n\n| Consumer | Before B | Current B | Gate |\n| --- | ---: | ---: | --- |\n| Default native root | 13,158 | ${catalog.sizes['table-root-native'].external} | ${catalog.sizes['table-root-native'].pass ? 'pass' : 'FAIL'} / 12,288 B |\n| Default native selective | 13,172 | ${catalog.sizes['table-family-native'].external} | ${catalog.sizes['table-family-native'].pass ? 'pass' : 'FAIL'} / 12,288 B |\n| Default React root delivery increment | 2,082 | ${catalog.sizes['table-root-react'].externalIncrement} | ${catalog.sizes['table-root-react'].incrementPass ? 'pass' : 'FAIL'} / 2,048 B |\n| Default React selective delivery increment | 2,047 | ${catalog.sizes['table-family-react'].externalIncrement} | ${catalog.sizes['table-family-react'].incrementPass ? 'pass' : 'FAIL'} / 2,048 B |\n\nComplete first-party native root/selective are **${closures.sizes['firstParty-root-native'].external} / ${closures.sizes['firstParty-family-native'].external} B**. Complete custom native root/selective are **${closures.sizes['custom-root-native'].external} / ${closures.sizes['custom-family-native'].external} B**. These remain above 12,288 B. Optional React increments pass 2,048 B; all other recorded absolute ceilings and current Chart optional gates pass. Existing-entry growth flags: ${regressions.regressions.length}. No ceiling, baseline, API or accessibility exception is approved or applied. The 20% headroom goal is unmet.\n\n**The requested native download goal is not achieved.** M2/M4 remain open, renderers provisional, publishing disabled. The exact review archive is \`${archive}\`; the machine packet is [table-size-evidence.json](table-size-evidence.json). BrowserStack access and remaining M2 obligations are recorded in [browserstack-access.md](../m2/browserstack-access.md).\n`,
);
const inputs = new Set<string>([
  ...smokeInputs,
  'AGENTS.md',
  'README.md',
  'package.json',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'biome.json',
  'docs/implementation/requirements.json',
  'docs/implementation/m4/requirement-review.json',
  'docs/implementation/m2/browserstack-access.md',
  'docs/implementation/m4/table-size-progress.md',
  'docs/implementation/m4/table-native12-study.md',
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
  'tests/browser',
  'tests/m2',
  'tests/next',
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
  '.artifacts/m4/table-size-work',
  '.artifacts/m4/native12-work',
  '.artifacts/m4/native12-host',
  '.artifacts/m4/native12-extension',
  '.artifacts/m4/native12-transaction',
  '.artifacts/m4/test-results',
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
    'Table React download gate passes; native default/optional gates remain failing; no policy amendment',
  artifacts: catalog.artifacts,
  matrices,
  smoke,
  comparisons,
  native12Study: {
    document: 'docs/implementation/m4/table-native12-study.md',
    ceilingBytes: 12288,
    acceptedCandidate: false,
    publicContractAmended: false,
    reports: native12Studies,
    status:
      'All isolated candidates rejected; no smaller shipping implementation or 12 KiB pass',
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
    tableReactDefaultSize: ['table-root-react', 'table-family-react'].every(
      (k) => catalog.sizes[k].incrementPass,
    )
      ? 'pass'
      : 'fail',
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
    'All recorded current catalog matrices are fresh; earlier equivalent-entry reuse remains historical in its original packet. Table images use supplementary paired original/current inspection with final refresh and explicit presentation times; uncontrolled original/current captures and their 84 mismatches remain retained diagnostics.',
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
  resolve(root, 'docs/implementation/m4/table-size-evidence.json'),
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
