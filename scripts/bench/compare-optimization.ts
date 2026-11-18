import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { wholeWorkSummary } from './whole-work';

// Postprocessing only: never changes capture inputs, raw samples or exclusions.
const root = resolve(import.meta.dir, '../..');
const baselinePath = process.argv
  .find((arg) => arg.startsWith('--baseline='))
  ?.slice(11);
if (!baselinePath)
  throw new Error('Supply --baseline=<retained M2 evidence.json>');
const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const read = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
const baseline = await read(baselinePath);
const packed = await read('.artifacts/packed-report.json');
const hashes: Record<string, string> = {
  [baselinePath]: hash(await readFile(resolve(root, baselinePath))),
  'scripts/bench/compare-optimization.ts': hash(
    await readFile(import.meta.filename),
  ),
  'scripts/bench/whole-work.ts': hash(
    await readFile(resolve(root, 'scripts/bench/whole-work.ts')),
  ),
};
for (const pattern of [
  '.artifacts/m2-optimization/before/*',
  '.artifacts/m2-optimization/probes/*',
  '.artifacts/m2-optimization/batch-probe.log',
])
  for await (const path of new Bun.Glob(pattern).scan(root))
    hashes[path] = hash(await readFile(resolve(root, path)));
async function reportAt(path: string, digest: string) {
  if (hash(await readFile(resolve(root, path))) !== digest)
    throw new Error(`Changed report ${path}`);
  hashes[path] = digest;
  const report = await read(path);
  if (
    !report.protocolComplete ||
    report.smoke ||
    !report.collectionPass ||
    report.summary.validPairs !== 20 ||
    report.warmups.length !== 3
  )
    throw new Error(`Incomplete/failing collection ${path}`);
  for (const [file, expected] of Object.entries(report.evidenceFiles)) {
    if (hash(await readFile(resolve(root, file))) !== expected)
      throw new Error(`Changed capture ${file}`);
    hashes[file] = expected as string;
  }
  return report;
}
const compare = (before: number, after: number) => ({
  before,
  after,
  deltaMs: after - before,
  changePercent: before ? ((after - before) / before) * 100 : null,
  // Diagnostic flag using the approved dual threshold; no waiver or qualification inferred.
  regressionThresholdReached:
    after - before >= 0.5 && after - before >= before * 0.1,
});
const phases: Record<string, unknown> = {};
for (const phase of ['idle', 'handoff']) {
  const oldPointer = baseline.sampling[phase];
  const newPointer = await read(`.artifacts/m2-trace-latest-${phase}.json`);
  const before = await reportAt(oldPointer.report, oldPointer.sha256);
  const after = await reportAt(newPointer.report, newPointer.sha256);
  if (
    before.artifactSha256 !== baseline.artifact.sha256 ||
    after.artifactSha256 !== packed.sha256
  )
    throw new Error(`Artifact mismatch ${phase}`);
  for (const field of ['candidate', 'family', 'profile', 'phase'])
    if (before[field] !== after[field])
      throw new Error(`Changed workload ${field}`);
  if (JSON.stringify(before.inputs) !== JSON.stringify(after.inputs))
    throw new Error(
      'Changed capture protocol/fixture inputs; cannot compare directly',
    );
  const oldRuntime = (await read(`${before.directory}/manifest.json`)).runtime;
  const newRuntime = (await read(`${after.directory}/manifest.json`)).runtime;
  for (const field of [
    'browser',
    'os',
    'bun',
    'node',
    'viewport',
    'dpr',
    'zoom',
  ])
    if (JSON.stringify(oldRuntime[field]) !== JSON.stringify(newRuntime[field]))
      throw new Error(`Changed diagnostic environment ${field}`);
  if (
    Math.abs(newRuntime.frameMs - oldRuntime.frameMs) / oldRuntime.frameMs >=
    0.01
  )
    throw new Error(
      'Incomparable scheduling calibration (>=1% bin-width difference)',
    );
  const valid = (report: typeof before) =>
    report.attempts.filter((attempt: { valid: boolean }) => attempt.valid);
  const limits =
    before.profile === 'stress' ? { p95: 8, p99: 12 } : { p95: 4, p99: 8 };
  const oldWhole = wholeWorkSummary(valid(before), limits);
  const newWhole = wholeWorkSummary(valid(after), limits);
  phases[phase] = {
    baseline: oldPointer,
    optimized: newPointer,
    identicalCaptureInputs: true,
    identicalRecordedEnvironment: true,
    frameBinMs: { before: oldRuntime.frameMs, after: newRuntime.frameMs },
    classifiedRenderP95Ms: compare(
      before.summary.pooledP95,
      after.summary.pooledP95,
    ),
    classifiedRenderP99Ms: compare(
      before.summary.pooledP99,
      after.summary.pooledP99,
    ),
    classifiedRenderMaximumMs: compare(
      before.summary.maximum,
      after.summary.maximum,
    ),
    wholeBusyP95Ms: compare(oldWhole.pooledP95, newWhole.pooledP95),
    wholeBusyP99Ms: compare(oldWhole.pooledP99, newWhole.pooledP99),
    wholeBusyMaximumMs: compare(oldWhole.maximum, newWhole.maximum),
    additionalCpuUpperP95Ms: compare(
      before.summary.pooledAdditionalCpuUpperP95,
      after.summary.pooledAdditionalCpuUpperP95,
    ),
    additionalCpuUpperP99Ms: compare(
      before.summary.pooledAdditionalCpuUpperP99,
      after.summary.pooledAdditionalCpuUpperP99,
    ),
    initializationP95Ms: compare(
      before.phaseTotals.initialization.animated.traceBusyP95Ms,
      after.phaseTotals.initialization.animated.traceBusyP95Ms,
    ),
    setupP95Ms: compare(
      before.phaseTotals.setup.animated.traceBusyP95Ms,
      after.phaseTotals.setup.animated.traceBusyP95Ms,
    ),
    teardownP95Ms: compare(
      before.phaseTotals.teardown.animated.traceBusyP95Ms,
      after.phaseTotals.teardown.animated.traceBusyP95Ms,
    ),
    classifiedPassingBoth: {
      before: before.summary.passingBoth,
      after: after.summary.passingBoth,
    },
    wholeBusyPassingBoth: {
      before: oldWhole.passingBoth,
      after: newWhole.passingBoth,
    },
    wholeBusyNumericPass: newWhole.numericPass,
    independentLongTaskGate: after.summary.independentLongTaskGate,
    invalidAttempts: after.attempts.filter(
      (attempt: { valid: boolean }) => !attempt.valid,
    ).length,
    measuredPairs: after.summary.validPairs,
    calibration: { before: before.calibration, after: after.calibration },
  };
}
const report = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  baselineArtifactSha256: baseline.artifact.sha256,
  optimizedArtifactSha256: packed.sha256,
  status:
    'local before/after diagnostics only; all valid samples retained; no final renderer or reference qualification',
  qualification:
    'Separate local sessions with uncontrolled thermal/power conditions; wall-time work proxies and conservative CPU bounds are not reference CPU or optical cadence. Causal hardware qualification is unverified.',
  phases,
  evidenceSha256: hashes,
};
await writeFile(
  resolve(root, 'docs/implementation/m2/optimization-evidence.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    { baseline: baseline.artifact.sha256, optimized: packed.sha256, phases },
    null,
    2,
  ),
);
