import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const baseline = '.artifacts/m4/chart-size-development/deterministic-reference';
const current =
  '.artifacts/m4/chart-size-development/deterministic-current/test-results';
const packed = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
const referencePacket = await Bun.file(
  resolve(
    root,
    '.artifacts/evidence-runs/m4-chart-8f199142cd4d-1792206523796/evidence.json',
  ),
).json();
for (const [directory, expected] of [
  [baseline, referencePacket.artifacts],
  [
    '.artifacts/m4/chart-size-development/deterministic-current',
    packed.artifacts,
  ],
] as const) {
  const report = await Bun.file(
    resolve(root, directory, 'results.json'),
  ).json();
  if (
    report.stats.expected !== 3 ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.stats.skipped ||
    ['core', 'react'].some(
      (name) =>
        report.config.metadata.artifacts[name].sha256 !== expected[name].sha256,
    )
  )
    throw new Error('Incomplete or stale paired chart inspection');
}
for (const name of ['core', 'react']) {
  const bytes = await Bun.file(
    resolve(
      root,
      '.artifacts/evidence-runs/m4-chart-8f199142cd4d-1792206523796/artifacts',
      `${name}.tgz`,
    ),
  ).arrayBuffer();
  if (
    createHash('sha256').update(new Uint8Array(bytes)).digest('hex') !==
    referencePacket.artifacts[name].sha256
  )
    throw new Error('Changed immutable chart reference');
}
const digest = async (path: string) =>
  createHash('sha256')
    .update(new Uint8Array(await Bun.file(path).arrayBuffer()))
    .digest('hex');
const comparisons = [];
for await (const file of new Bun.Glob('**/chart-fixed-*.png').scan(
  resolve(root, current),
)) {
  const before = await digest(resolve(root, baseline, 'test-results', file)),
    after = await digest(resolve(root, current, file));
  comparisons.push({ file, before, after, identical: before === after });
}
const result = {
  artifacts: packed.artifacts,
  baseline,
  referenceArtifacts: referencePacket.artifacts,
  originalArchive:
    '.artifacts/evidence-runs/m4-chart-8f199142cd4d-1792206523796',
  method:
    'Exact PNG/hash comparison using fresh captures from immutable previous tarballs and candidate tarballs with the same final public refresh at paused inspection time. Original archived PNGs remain unchanged; they had uncontrolled final idle-frame timing. Supplementary evidence; owner normal-speed approval remains separate.',
  total: comparisons.length,
  identical: comparisons.filter((row) => row.identical).length,
  comparisons,
};
await Bun.write(
  resolve(root, '.artifacts/m4/chart-size-visual-comparison.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log({ total: result.total, identical: result.identical });
if (result.total !== 270 || result.identical !== 270)
  throw new Error('Chart capture comparison failed');
