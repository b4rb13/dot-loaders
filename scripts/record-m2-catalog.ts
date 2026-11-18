import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const json = (path: string) => Bun.file(resolve(root, path)).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const packed = await json('.artifacts/packed-report.json');
const prior = await json('docs/implementation/m4/table-size-evidence.json');
if (
  packed.sha256 !== prior.artifacts.core.sha256 ||
  (await hash(packed.artifact)) !== packed.sha256
)
  throw Error('Changed current catalog artifact');
for (const [path, expected] of Object.entries(prior.sourceArchive))
  if (
    /^packages\/(core|react)\/(src|dist)\//.test(path) &&
    (await hash(path)) !== expected
  )
    throw Error(`Library source/output changed: ${path}`);
const browser = await json('.artifacts/m2-catalog/browser-results.json');
if (
  browser.config.metadata.artifactSha256 !== packed.sha256 ||
  browser.stats.expected !== 60 ||
  browser.stats.unexpected ||
  browser.stats.flaky ||
  browser.stats.skipped ||
  browser.errors.length
)
  throw Error('Incomplete catalog browser matrix');
const native = await json(
  '.artifacts/m2-catalog/native-regression-results.json',
);
if (
  native.config.metadata.artifactSha256 !== packed.sha256 ||
  native.stats.expected !== 298 ||
  native.stats.skipped !== 2 ||
  native.stats.unexpected ||
  native.stats.flaky ||
  native.errors.length
)
  throw Error('Incomplete native regression matrix');
const finalJobs = await json('.artifacts/m2-catalog/final-jobs.json');
if (
  finalJobs.length !== 9 ||
  finalJobs.some((job: { exitCode: number }) => job.exitCode !== 0)
)
  throw Error('Incomplete final verification jobs');
const clean = await json('.artifacts/m3/clean-reproduction.json');
if (
  clean.result !== 'pass' ||
  clean.reproducedTarballSha256.core !== packed.sha256 ||
  clean.reproducedTarballSha256.react !== prior.artifacts.react.sha256
)
  throw Error('Clean exact-pair reproduction required');
const requirements = await json('docs/implementation/requirements.json');
const review = await json('docs/implementation/m2/requirement-review.json');
if (
  requirements.requirements.length !== 717 ||
  review.catalogContinuation.requirementIds.some(
    (id: string) =>
      !requirements.requirements.some((r: { id: string }) => r.id === id),
  ) ||
  review.carryForwardRows.some(
    (row: { id: string }) =>
      !requirements.requirements.some((r: { id: string }) => r.id === row.id),
  )
)
  throw Error('Lossless requirement IDs changed');
const inputs = new Set<string>();
const reports: Record<string, unknown> = {};
async function includeReport(
  pointerPath: string,
  kind: 'trace' | 'memory' | 'live',
  full: boolean,
) {
  const pointer = await json(pointerPath),
    report = await json(pointer.report);
  if (
    (await hash(pointer.report)) !== pointer.sha256 ||
    report.artifactSha256 !== packed.sha256 ||
    (full && !report.protocolComplete)
  )
    throw Error(`Incomplete or stale ${pointerPath}`);
  if (
    kind === 'trace' &&
    (!report.collectionPass ||
      report.fatal ||
      (full &&
        (report.warmups.length !== 3 ||
          report.attempts.filter((a: { valid: boolean }) => a.valid).length !==
            20)))
  )
    throw Error(`Trace collection failed: ${pointerPath}`);
  if (
    kind === 'memory' &&
    (report.result !== 'pass' ||
      report.repetitions.length !== 3 ||
      report.repetitions.some(
        (r: { checkpoints: unknown[]; failures: unknown[] }) =>
          r.checkpoints.length !== 3 || r.failures.length,
      ))
  )
    throw Error('Full cleanup run failed');
  if (
    kind === 'live' &&
    (report.result !== 'pass' || report.rows.length !== 18)
  )
    throw Error('Incomplete sampled live-heap cells');
  for (const [path, expected] of Object.entries(report.evidenceFiles)) {
    const key = kind !== 'trace' ? `${report.directory}/${path}` : path;
    if (
      key.startsWith('/') ||
      key.split('/').includes('..') ||
      (await hash(key)) !== expected
    )
      throw Error(`Changed raw evidence ${key}`);
    inputs.add(key);
  }
  for (const [path, expected] of Object.entries(report.inputs))
    if ((await hash(path)) !== expected)
      throw Error(`Changed frozen collector input ${path}`);
  inputs.add(pointerPath);
  inputs.add(pointer.report);
  reports[pointerPath] = { pointer, report };
  return report;
}
const full = [];
for (const [profile, phase] of [
  ['normal', 'idle'],
  ['normal', 'handoff'],
  ['list', 'idle'],
])
  full.push(
    await includeReport(
      `.artifacts/m2-catalog-native-${profile}-mixed-trace-latest-${phase}.json`,
      'trace',
      true,
    ),
  );
const memory = await includeReport(
  '.artifacts/m2-catalog-memory-latest.json',
  'memory',
  true,
);
const liveMemory = await includeReport(
  '.artifacts/m2-catalog-live-memory-latest.json',
  'live',
  false,
);
const liveMaxima = Object.fromEntries(
  ['normal', 'list', 'stress'].map((profile) => [
    profile,
    Math.max(
      ...liveMemory.rows
        .filter((row: { profile: string }) => row.profile === profile)
        .map(
          (row: { maximumSampledHeapIncrementBytes: number }) =>
            row.maximumSampledHeapIncrementBytes,
        ),
    ),
  ]),
);
const smokeMatrix = await json('.artifacts/m2-catalog/smoke-matrix.json');
if (smokeMatrix.rows.length !== 10) throw Error('Incomplete comparison smokes');
for (const row of smokeMatrix.rows) {
  if (row.exitCode || !row.collectionPass)
    throw Error('Failed comparison smoke');
  await includeReport(row.pointerPath, 'trace', false);
}
const originalProofSmoke = await includeReport(
  '.artifacts/m2-trace-latest-idle-smoke.json',
  'trace',
  false,
);
const cloud = await json(
  '.artifacts/m2-catalog/browserstack/pilot-report.json',
);
if (
  cloud.artifactSha256 !== packed.sha256 ||
  !cloud.cleanup.credentialsDeleted ||
  !cloud.cleanup.serverStopped ||
  !cloud.local.stopped
)
  throw Error(
    'Cloud attempt requires exact artifact and completed private cleanup',
  );
for (const [path, expected] of Object.entries(cloud.inputs))
  if ((await hash(path)) !== expected)
    throw Error(`Changed cloud pilot input ${path}`);
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
    throw Error('Publication guard changed');
  const proc = Bun.spawn(['node', '-e', code], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 1) throw Error('Publication guard did not reject');
  guards.push({ pkg, private: true, exitCode, registryWrites: 0 });
}
const controls = await json('.artifacts/m2-catalog/controls.json');
if (
  controls.visibility !== 'PRIVATE' ||
  controls.m2 !== 'OPEN' ||
  controls.m4 !== 'OPEN'
)
  throw Error('Private/open milestone controls required');
const previousArchives = [];
for (const directory of new Set([
  ...prior.previousArchives.map((p: { directory: string }) => p.directory),
  prior.archive,
])) {
  const evidence = await json(`${directory}/evidence.json`);
  const records = {
    ...(evidence.evidenceSha256 ?? {
      ...evidence.sourceArchive,
      ...evidence.nextBuildFiles,
      ...evidence.consumerFiles,
    }),
    ...evidence.artifactFiles,
  };
  for (const [path, expected] of Object.entries(records))
    if (
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      (await hash(`${directory}/${path}`)) !== expected
    )
      throw Error(`Changed historical record ${directory}/${path}`);
  previousArchives.push({ directory, records: Object.keys(records).length });
}
const checkpoints = memory.repetitions.flatMap(
  (r: {
    checkpoints: {
      liveHeapIncrementBytes: number;
      residualHeapIncrementBytes: number;
      retained: { hosts: number; content: number };
    }[];
  }) => r.checkpoints,
);
const metrics = {
  cleanupCycles: 300,
  checkpoints: checkpoints.length,
  maximumMountedPausedHeapIncrementBytes: Math.max(
    ...checkpoints.map(
      (c: { liveHeapIncrementBytes: number }) => c.liveHeapIncrementBytes,
    ),
  ),
  maximumResidualHeapIncrementBytes: Math.max(
    ...checkpoints.map(
      (c: { residualHeapIncrementBytes: number }) =>
        c.residualHeapIncrementBytes,
    ),
  ),
  retainedHosts: Math.max(
    ...checkpoints.map(
      (c: { retained: { hosts: number } }) => c.retained.hosts,
    ),
  ),
  retainedContent: Math.max(
    ...checkpoints.map(
      (c: { retained: { content: number } }) => c.retained.content,
    ),
  ),
};
const archive = `.artifacts/evidence-runs/m2-catalog-${packed.sha256.slice(0, 12)}-${Date.now()}`;
const progressPath = 'docs/implementation/m2/catalog-progress.md';
const draft = (await readFile(resolve(root, progressPath), 'utf8')).split(
  '\n## Verified snapshot',
)[0];
const timingRows = full
  .map(
    (r) =>
      `| ${r.profile} / ${r.phase} | ${r.summary.pooledP95.toFixed(3)} / ${r.summary.pooledP99.toFixed(3)} | ${r.wholeWork.pooledP95.toFixed(3)} / ${r.wholeWork.pooledP99.toFixed(3)} | ${r.wholeWork.passingBoth}/20 |`,
  )
  .join('\n');
await writeFile(
  resolve(root, progressPath),
  `${draft}\n## Verified snapshot\n\nCore SHA-256: \`${packed.sha256}\`. React SHA-256 remains \`${prior.artifacts.react.sha256}\`. Package source/output is unchanged from the retained M4 pair. Fresh scoped checks: **60 catalog browser passes** across Chromium/Firefox/WebKit; **298 native regression passes / two expected heap skips**; current/minimum declarations, lint, 38 native/six React units, 24 harness contracts and clean exact-pair reproduction. Earlier React/Next/M4 observations stay historical in their own exact packet.\n\n**300 cleanup cycles across three independent repetitions pass locally**, with nine checkpoints. Maximum mounted/paused heap increment in the cleanup protocol: **${metrics.maximumMountedPausedHeapIncrementBytes} B / 8 MiB**; maximum residual: **${metrics.maximumResidualHeapIncrementBytes} B / 512 KiB**; discarded hosts/content retained: **${metrics.retainedHosts}/${metrics.retainedContent}**. Separate mounted/active-phase samples cover 18 cells across dashboard/list/stress, idle/handoff and three repetitions; largest sampled increments are **${liveMaxima.normal}/${liveMaxima.list}/${liveMaxima.stress} B**, respectively, below 8/16/24 MiB. These are sparse heap samples after laboratory GC, not continuous peak or total GPU/browser memory qualification. Fixture/application cost is included.\n\nEach full timing run retains three warmup pairs and twenty valid measured pairs; no slow valid runs are discarded. Local wall-time proxies and CPU bounds remain distinct from exact physical-reference CPU.\n\n| Scene / phase | Classified p95 / p99 ms | Whole busy p95 / p99 ms | Whole pairs meeting 4/8 ms |\n| --- | ---: | ---: | ---: |\n${timingRows}\n\nThe ten single-pair comparison/stress/scrolling smokes pass collection; they do not qualify candidate selection, cadence or the full timing protocol. All raw data, per-phase initialization/setup/teardown, long-task findings and numerical misses remain in the machine packet.\n\nBrowserStack account-settings authentication succeeded after exact temporary-setup and private-transfer approvals. One **${cloud.session.device} / iOS ${cloud.session.os_version}** session ended after **${cloud.session.duration} seconds**, status **${cloud.session.status} / ${cloud.session.reason}**. The transport runner failed before completing any component assertion; **no cloud gate passed**. The incompatible vendor Local binary and request-interception failure are retained separately. The ended cloud session, closed fixture ports and deletion of temporary credentials are verified. **M2 is not complete.** Reference hardware/conditions, exact CPU/presentation, all required candidate/workload cells, manual/browser-floor qualification and equal-quality review stay unverified. Table's independent M4 size failure persists. The [closure checklist](closure-checklist.md) identifies the remaining acceptance work.\n\nPacket: [catalog-evidence.json](catalog-evidence.json). Exact archive: \`${archive}\`. M2/M4 remain open, renderers provisional, repository private and npm publishing disabled.\n`,
);
for (const path of [
  progressPath,
  'docs/implementation/m2/catalog-trace-manifest.json',
  'docs/implementation/m2/closure-checklist.md',
  'docs/implementation/m2/browserstack-access.md',
  'docs/implementation/m2/requirement-review.json',
  'docs/implementation/requirements.json',
  'docs/implementation/m4/table-size-evidence.json',
  '.artifacts/m3/clean-reproduction.json',
  'AGENTS.md',
  'docs/roadmap.md',
  '.artifacts/packed-report.json',
  '.artifacts/m2-catalog/browser-results.json',
  '.artifacts/m2-catalog/native-regression-results.json',
  'package.json',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'biome.json',
])
  inputs.add(path);
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
  'tests/bench',
  '.artifacts/m2-catalog',
])
  for await (const path of new Bun.Glob('**/*').scan({
    cwd: resolve(root, dir),
    onlyFiles: true,
  }))
    if (!path.split('/').includes('node_modules')) inputs.add(`${dir}/${path}`);
for await (const path of new Bun.Glob('playwright*.config.ts').scan(root))
  inputs.add(path);
for (const pkg of ['core', 'react'])
  for (const name of ['package.json', 'README.md', 'LICENSE'])
    inputs.add(`packages/${pkg}/${name}`);
const sourceArchive: Record<string, string> = {};
for (const path of [...inputs].sort()) {
  const destination = resolve(root, archive, path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, path), destination);
  sourceArchive[path] = await hash(`${archive}/${path}`);
}
const artifactFiles: Record<string, string> = {};
for (const [name, artifact] of Object.entries(prior.artifacts) as [
  string,
  { path: string; sha256: string },
][]) {
  const path = `artifacts/${name}.tgz`;
  await mkdir(resolve(root, archive, 'artifacts'), { recursive: true });
  await copyFile(artifact.path, resolve(root, archive, path));
  artifactFiles[path] = await hash(`${archive}/${path}`);
  if (artifactFiles[path] !== artifact.sha256)
    throw Error('Archived artifact changed');
}
const evidence = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  archive,
  task: 'https://github.com/b4rb13/dot-loaders/issues/16',
  artifacts: prior.artifacts,
  packageSourceUnchanged: true,
  browser: {
    path: '.artifacts/m2-catalog/browser-results.json',
    ...browser.stats,
  },
  native: {
    path: '.artifacts/m2-catalog/native-regression-results.json',
    ...native.stats,
  },
  fullTiming: full,
  memory: { report: memory, metrics },
  sampledLiveMemory: { report: liveMemory, maximaByProfile: liveMaxima },
  smokeMatrix,
  originalProofSmoke,
  browserstackPilot: cloud,
  browserstackAuthentication: {
    verified: true,
    path: '.artifacts/m2-catalog/browserstack/inventory-review.json',
    temporaryCredentials: 'deleted',
  },
  finalJobs,
  reports,
  guards,
  controls,
  previousArchives,
  sourceArchive,
  artifactFiles,
  requirements: { count: 717, fullClauseStatus: 'unverified' },
  research: {
    branch: 'research/m2-browserstack-qualification',
    commit: 'f4fdfb05ce618c1de8b5851af0b1ba7aa09d1fe7',
    url: 'https://github.com/b4rb13/dot-loaders/blob/research/m2-browserstack-qualification/docs/research/browserstack-m2-qualification.md',
    policyAmended: false,
  },
  gates: {
    catalogFunctional: 'pass within recorded local scopes',
    localCleanupProtocol: 'pass',
    sampledLocalLiveHeap: 'pass within sparse laboratory samples',
    localTiming: full.every(
      (r) =>
        r.wholeWork.numericPass &&
        r.summary.independentLongTaskGate === 'none observed' &&
        Object.values(r.phaseTotals).every((phase: unknown) =>
          Object.values(
            phase as Record<
              string,
              { diagnosticProxyWithinTarget: boolean | null }
            >,
          ).every((variant) => variant.diagnosticProxyWithinTarget !== false),
        ),
    )
      ? 'pass'
      : 'fail',
    referenceCPUAndCadence: 'unverified',
    physicalDevicesAndMemory: 'unverified',
    completeCandidateMatrix:
      'unverified; comparison smokes are not full protocols',
    browserFloorsAndManualAT: 'unverified',
    equalQualityOwnerReview: 'unverified',
    browserstackPilot: `${cloud.result}: scoped functionality attempt only; reference qualification unverified`,
    m2: 'open',
    m4: 'open',
    renderer: 'provisional',
    npmPublishing: 'disabled',
  },
  limitations: [
    'Local headless Chromium traces are wall-time proxies with CPU bounds, not exact reference CPU or physical display presentation.',
    'List uses declared row-aligned jumps; smooth/physical scrolling and input-latency qualification remain unverified.',
    'Cleanup memory uses mounted/paused samples; separate live-heap cells sample mounted and active phases after laboratory GC. Neither continuously measures peak or full retaining-path/GPU/physical-reference memory.',
    'No new renderer, library optimization, size amendment or baseline acceptance. Earlier M4 Table size remains failing.',
    'BrowserStack account-settings authentication verified after exact owner approval of temporary credential setup and private fixture export. The Local binary could not execute on this arm64 Mac; the retained bounded pilot uses request interception. Temporary credentials are deleted; no paid upgrade or public exposure was authorized.',
    'Source remains local/uncommitted. No historical external source access, npm publication, visibility change or deployment.',
  ],
};
await writeFile(
  resolve(root, archive, 'evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
await writeFile(
  resolve(root, 'docs/implementation/m2/catalog-evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      archive,
      records: Object.keys(sourceArchive).length + 2,
      priorRecords: previousArchives.reduce((sum, p) => sum + p.records, 0),
      metrics,
      gates: evidence.gates,
    },
    null,
    2,
  ),
);
