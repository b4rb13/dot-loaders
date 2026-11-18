import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { wholeWorkSummary } from './bench/whole-work';

const root = resolve(import.meta.dir, '..');
const read = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason);
}
const packed = await read('.artifacts/packed-report.json');
const browser = await read('.artifacts/browser-results.json');
const clean = await read('.artifacts/clean-reproduction.json');
const regression = await read('.artifacts/m1-review-results.json');
for (const field of ['sourceFiles', 'buildInputs'])
  for (const [path, digest] of Object.entries(packed[field]))
    assert(
      hash(await readFile(resolve(root, path))) === digest,
      `Stale input ${path}`,
    );
assert(
  hash(await readFile(packed.artifact)) === packed.sha256,
  'Artifact changed',
);
assert(
  browser.config.metadata.artifactSha256 === packed.sha256 &&
    browser.stats.unexpected === 0 &&
    browser.stats.flaky === 0 &&
    browser.stats.expected === 298 &&
    browser.stats.skipped === 2,
  'Incomplete/failed/stale browser matrix',
);
assert(
  clean.result === 'pass' && clean.reproducedTarballSha256 === packed.sha256,
  'Missing clean reproduction',
);
assert(
  regression.artifactSha256 === packed.sha256 &&
    regression.status.startsWith('pass:'),
  'M1 regression review missing',
);
const sampling: Record<string, unknown> = {};
const diagnosticFindings: string[] = [];
const samplingFiles: Record<string, string> = {};
for (const phase of ['idle', 'handoff']) {
  const pointer = await read(`.artifacts/m2-trace-latest-${phase}.json`);
  assert(
    hash(await readFile(resolve(root, pointer.report))) === pointer.sha256,
    `Changed ${phase} trace report`,
  );
  const report = await read(pointer.report);
  assert(
    report.artifactSha256 === packed.sha256 &&
      report.protocolComplete &&
      !report.smoke &&
      report.summary.validPairs === 20 &&
      report.warmups.length === 3,
    `Incomplete/stale ${phase} sampling`,
  );
  for (const [path, digest] of Object.entries(report.inputs))
    assert(
      hash(await readFile(resolve(root, path))) === digest,
      `Stale sampling input ${path}`,
    );
  for (const [path, digest] of Object.entries(report.evidenceFiles))
    assert(
      hash(await readFile(resolve(root, path))) === digest,
      `Changed trace evidence ${path}`,
    );
  if (!report.collectionPass)
    diagnosticFindings.push(
      `${phase}: fixed-fixture collection/invariant failure`,
    );
  if (!report.summary.numericRenderingPass)
    diagnosticFindings.push(
      `${phase}: local rendering proxy exceeds the diagnostic target or 18/20 rule`,
    );
  if (report.summary.independentLongTaskGate !== 'none observed')
    diagnosticFindings.push(
      `${phase}: >=50ms task attribution unresolved-or-fail`,
    );
  for (const [name, sides] of Object.entries(report.phaseTotals) as [
    string,
    Record<string, { diagnosticProxyWithinTarget: boolean | null }>,
  ][])
    if (sides.animated?.diagnosticProxyWithinTarget === false)
      diagnosticFindings.push(
        `${phase}: local ${name} work proxy exceeds diagnostic target`,
      );
  const wholeWork = wholeWorkSummary(
    report.attempts.filter((a: { valid: boolean }) => a.valid),
    report.profile === 'stress' ? { p95: 8, p99: 12 } : { p95: 4, p99: 8 },
  );
  if (!wholeWork.numericPass)
    diagnosticFindings.push(
      `${phase}: whole main-thread busy proxy including unclassified overhead exceeds the diagnostic target or 18/20 rule`,
    );
  samplingFiles[pointer.report] = pointer.sha256;
  sampling[phase] = {
    report: pointer.report,
    sha256: pointer.sha256,
    candidate: report.candidate,
    family: report.family,
    profile: report.profile,
    protocolComplete: report.protocolComplete,
    collectionPass: report.collectionPass,
    warmupPairs: report.warmups.length,
    validPairs: report.summary.validPairs,
    invalidAttempts: report.attempts.filter(
      (a: { valid: boolean }) => !a.valid,
    ),
    summary: report.summary,
    wholeWork,
    phaseTotals: report.phaseTotals,
    perRun: report.attempts
      .filter((a: { valid: boolean }) => a.valid)
      .map((a: Record<string, unknown>) => ({
        attempt: a.attempt,
        p95: a.p95,
        p99: a.p99,
        maximum: a.maximum,
        passesBoth: a.passesBoth,
        functionalFailures: a.functionalFailures,
        cadence: a.cadence,
        layout: a.layout,
        longTaskGate: a.longTaskGate,
        animatedLongTasks: a.animatedLongTasks,
        baselineLongTasks: a.baselineLongTasks,
      })),
    retainedFiles: Object.keys(report.evidenceFiles).length,
    qualification: report.qualification,
  };
}
const optimizationPath = 'docs/implementation/m2/optimization-evidence.json';
const optimization = await read(optimizationPath);
assert(
  optimization.optimizedArtifactSha256 === packed.sha256,
  'Stale optimization evidence',
);
for (const [path, digest] of Object.entries(optimization.evidenceSha256))
  assert(
    hash(await readFile(resolve(root, path))) === digest,
    `Changed optimization evidence ${path}`,
  );
for (const [phase, comparison] of Object.entries(optimization.phases) as [
  string,
  Record<string, unknown>,
][]) {
  for (const [metric, result] of Object.entries(comparison))
    if (
      result &&
      typeof result === 'object' &&
      'regressionThresholdReached' in result &&
      result.regressionThresholdReached
    )
      diagnosticFindings.push(
        `${phase}: local ${metric} reaches both regression thresholds; qualification unverified`,
      );
}
const analyzer = Bun.spawn(['bun', 'test', 'tests/bench'], {
  cwd: root,
  stdout: 'pipe',
  stderr: 'pipe',
});
const analyzerStdout = await new Response(analyzer.stdout).text();
const analyzerLog = await new Response(analyzer.stderr).text();
assert(
  (await analyzer.exited) === 0,
  `Analyzer contracts failed: ${analyzerLog}`,
);
await writeFile(
  resolve(root, '.artifacts/m2-analyzer-tests.log'),
  analyzerStdout + analyzerLog,
);
await writeFile(
  resolve(root, 'docs/implementation/m2/sampling-evidence.json'),
  `${JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      artifactSha256: packed.sha256,
      status:
        'local whole-render sampling recorded; numeric findings retained; reference qualification unverified',
      sampling,
      diagnosticFindings,
    },
    null,
    2,
  )}\n`,
);

const comparisons: Record<string, unknown> = {};
const cohorts: Record<string, unknown> = {};
const hashes: Record<string, string> = { ...samplingFiles };
for (const [path, digest] of Object.entries(optimization.evidenceSha256))
  if (path.startsWith('.artifacts/m2-optimization/'))
    hashes[path] = digest as string;
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const path = `.artifacts/m2/${engine}/comparison.json`;
  const comparison = await read(path);
  assert(
    comparison.artifact === packed.sha256 && comparison.results.length === 30,
    `Missing comparisons ${engine}`,
  );
  assert(
    comparison.results.every(
      (r: {
        rawJavaScriptCommandCommitMs: number[];
        violations: string[];
        issues: string[];
      }) =>
        r.rawJavaScriptCommandCommitMs.length === 20 &&
        !r.violations.length &&
        !r.issues.length,
    ),
    `Invalid comparison ${engine}`,
  );
  comparisons[engine] = comparison;
  hashes[path] = hash(await readFile(resolve(root, path)));
  cohorts[engine] = {};
  for (const candidate of ['svg', 'canvas', 'dom']) {
    const path = `.artifacts/m2/${engine}/cohort-${candidate}.json`;
    const cohort = await read(path);
    assert(
      cohort.artifact === packed.sha256 && cohort.results.length === 3,
      `Missing cohort ${engine}/${candidate}`,
    );
    (cohorts[engine] as Record<string, unknown>)[candidate] = cohort;
    hashes[path] = hash(await readFile(resolve(root, path)));
  }
  for (const family of ['line', 'bar', 'scatter', 'text', 'table'])
    for (const candidate of ['svg', 'canvas', 'dom'])
      for (const dpr of [1, 2])
        for (const phase of [0, 0.25, 0.55, 0.8, 1]) {
          const path = `.artifacts/m2/${engine}/${family}-${candidate}-dpr${dpr}-${phase}.png`;
          hashes[path] = hash(await readFile(resolve(root, path)));
        }
}
const proofCases: { title: string; project: string; status: string }[] = [];
interface Suite {
  file?: string;
  suites?: Suite[];
  specs?: {
    title: string;
    tests: { projectName: string; results: { status: string }[] }[];
  }[];
}
function visit(suite: Suite) {
  if (suite.file?.endsWith('m2.spec.ts'))
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests) {
        assert(
          test.results.length === 1 && test.results[0]?.status === 'passed',
          'M2 fixture did not pass once',
        );
        proofCases.push({
          title: spec.title,
          project: test.projectName,
          status: 'pass',
        });
      }
  for (const child of suite.suites ?? []) visit(child);
}
for (const suite of browser.suites) visit(suite);
assert(proofCases.length === 102, 'Missing M2 fixtures');
for (const path of [
  '.artifacts/packed-report.json',
  '.artifacts/browser-results.json',
  '.artifacts/clean-reproduction.json',
  '.artifacts/m1-review-results.json',
  'scripts/record-m2.ts',
  'scripts/bench/whole-work.ts',
  'scripts/bench/compare-optimization.ts',
  'tests/bench/whole-work.test.ts',
  '.artifacts/m2-analyzer-tests.log',
  'docs/implementation/m2/sampling-evidence.json',
  optimizationPath,
  'docs/implementation/m2/trace-manifest.json',
  'docs/implementation/m2/trace-harness.md',
  'docs/implementation/m2/benchmark-manifest.json',
  'docs/implementation/m2/requirement-review.json',
  'docs/implementation/m2/architecture.md',
  'docs/implementation/m2/optimization.md',
  'docs/implementation/m2/progress.md',
])
  hashes[path] = hash(await readFile(resolve(root, path)));
const archive = `.artifacts/evidence-runs/m2-${packed.sha256.slice(0, 12)}-${Date.now()}`;
const evidence = {
  archive,
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  task: 'https://github.com/b4rb13/dot-loaders/issues/16',
  status: diagnosticFindings.length
    ? 'M2 in progress: functional regressions pass; local timing findings retained; reference exit unverified'
    : 'M2 in progress: local diagnostics pass; reference exit unverified',
  diagnosticFindings,
  baseCommit: packed.sourceCommit,
  uncommittedImplementation: true,
  artifact: {
    name: packed.provisionalName,
    version: packed.version,
    sha256: packed.sha256,
    files: packed.files,
    runtimeDependencies: [],
  },
  environment: { ...packed.environment, browser: browser.config.metadata },
  gates: {
    localBuildTypesLintPurePackedConsumers:
      'pass: verified command run and exact packed inputs; 13 native and 14 analyzer contracts',
    selectiveClosures: {
      status: 'pass for existing native slice; dense runtime excluded',
      sizes: packed.sizes,
      externalStylesGzip: packed.externalStylesGzip,
      externalModeGzip: packed.externalModeGzip,
    },
    regression: {
      status: regression.status,
      sourceBlocks: regression.sourceBlocks,
      groups: Object.keys(regression.groups).length,
    },
    browsers: browser.stats,
    clean: { result: clean.result, sha256: clean.reproducedTarballSha256 },
    sourceIsolation: regression.sourceReference,
    publishing: regression.publicationGuard,
    localDenseProof: 'pass for recorded fixtures and environments only',
    finalRendererSelection: 'unverified; no winner selected',
    physicalReferenceProtocol:
      'unverified: owner confirms no approved devices available',
    wholeRenderingCpuCadenceAndTaskGate:
      'local whole-render proxy and thread-CPU bounds recorded; see sampling; exact reference CPU/cadence/attribution qualification remains unverified',
    canonicalFullCatalogWorkloads:
      'unverified: representative proof cohorts are not canonical v1 fixtures',
    completeFamilyMotionAndPublicProjectionIntegration:
      'not complete: private bridge only; M4 catalog work remains',
    finalHeapAndSupportedEnvironmentQualification:
      'unverified: physical heap/floor/manual AT/branded-browser matrices outstanding',
    humanEqualQualityReview:
      'unverified: local agent snapshot inspection does not approve product visual fidelity',
  },
  cases: proofCases,
  optimization: {
    report: optimizationPath,
    baselineArtifactSha256: optimization.baselineArtifactSha256,
    status: optimization.status,
  },
  sampling,
  comparisons,
  cohorts,
  evidenceSha256: hashes,
  limitations: [
    'Original static/paused resource cohorts remain separate from new active paired traces; neither is the canonical full-catalog dashboard.',
    'Dot/buffer ledgers track explicit renderer resources; native CSS fallback texture density and total browser/GPU/heap use are not proven by these counters.',
    'Representative numeric bitmap is not complete Basic Latin, international shaping, all defaults/variants or pointer support.',
    'Project-only verification; historical external reference was not accessed or rechecked. No npm publication, source visibility change or deployment.',
    'Historical M1 evidence remains frozen on its recorded M1 artifact; current M1 review is a regression check on M2.',
  ],
};
await mkdir(resolve(root, '.artifacts/evidence-runs'), { recursive: true });
await mkdir(resolve(root, archive));
for (const path of new Set([
  ...Object.keys(hashes),
  ...Object.keys(packed.sourceFiles),
  ...Object.keys(packed.buildInputs),
])) {
  const destination = resolve(root, archive, path);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await cp(resolve(root, path), destination);
}
await writeFile(
  resolve(root, 'docs/implementation/m2/evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
await cp(
  resolve(root, 'docs/implementation/m2/evidence.json'),
  resolve(root, archive, 'evidence.json'),
);
console.log(
  JSON.stringify(
    {
      status: evidence.status,
      sha256: packed.sha256,
      browser: browser.stats,
      proofCases: proofCases.length,
      retainedEvidenceFiles: Object.keys(hashes).length,
    },
    null,
    2,
  ),
);
