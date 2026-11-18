import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const table = await Bun.file(
  resolve(root, 'docs/implementation/m4/table-evidence.json'),
).json();
const chart = await Bun.file(
  resolve(root, 'docs/implementation/m4/chart-size-evidence.json'),
).json();
const packet = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
const directory = '.artifacts/m4/table-size-work/deterministic';
for (const [name, artifacts] of [
  ['current', packet.artifacts],
  ['reference', table.artifacts],
] as const) {
  const report = await Bun.file(
    resolve(root, `${directory}/${name}/results.json`),
  ).json();
  if (
    report.stats.expected !== 3 ||
    report.stats.unexpected ||
    report.stats.flaky ||
    report.errors?.length
  )
    throw new Error('Incomplete paired Table inspection');
  for (const pkg of ['core', 'react'])
    if (report.config.metadata.artifacts[pkg].sha256 !== artifacts[pkg].sha256)
      throw new Error('Stale paired Table inspection');
}
const paired = await Array.fromAsync(
  new Bun.Glob('**/*.png').scan(
    resolve(root, `${directory}/current/test-results`),
  ),
);
if (paired.length !== 84)
  throw new Error('Incomplete controlled Table captures');
const comparisons = [];
for (const file of paired) {
  const path = `${directory}/current/test-results/${file}`;
  const before = await hash(`${directory}/reference/test-results/${file}`),
    after = await hash(path);
  comparisons.push({
    group: 'table',
    path,
    before,
    after,
    identical: before === after,
  });
}
const groups = [
  {
    name: 'chart',
    archive: chart.archive,
    files: chart.chartVisuals.map(
      (r: { path: string }) => `.artifacts/m4/test-results/${r.path}`,
    ) as string[],
    source: chart.sourceArchive,
    expected: 270,
  },
  {
    name: 'text',
    archive: chart.archive,
    files: chart.visualComparison.comparisons.map(
      (r: { file: string }) => r.file,
    ) as string[],
    source: chart.sourceArchive,
    expected: 60,
  },
];
for (const group of groups) {
  if (group.files.length !== group.expected)
    throw new Error('Incomplete visual reference');
  for (const path of group.files) {
    const before = await hash(`${group.archive}/${path}`),
      after = await hash(path);
    if (before !== group.source[path])
      throw new Error(`Archived visual changed: ${path}`);
    comparisons.push({
      group: group.name,
      path,
      before,
      after,
      identical: before === after,
    });
  }
}
const differences = comparisons.filter((r) => !r.identical);
await writeFile(
  resolve(root, '.artifacts/m4/table-size-visual-comparison.json'),
  `${JSON.stringify(
    {
      artifacts: packet.artifacts,
      referenceArchives: { table: table.archive, chart: chart.archive },
      result: differences.length ? 'fail' : 'pass',
      comparisons,
      differences,
      method:
        'Exact PNG bytes from fresh fixed-progress captures compared with immutable earlier packets. Normal-speed owner review remains separate.',
    },
    null,
    2,
  )}\n`,
);
if (differences.length)
  throw new Error(`Visual differences: ${differences.length}`);
console.log('414 exact PNG comparisons: 84 Table, 270 Chart, 60 Text');
