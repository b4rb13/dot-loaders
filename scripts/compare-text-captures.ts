import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const packet = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
const previous = `${root}/.artifacts/evidence-runs/m4-text-1a065a0b5cde-1792198631329`;
const comparisons = [];
for await (const file of new Bun.Glob('text-fixed*/**/*.png').scan(
  `${root}/.artifacts/m4/test-results`,
)) {
  const relative = `.artifacts/m4/test-results/${file}`;
  const old = Bun.file(`${previous}/${relative}`);
  if (!(await old.exists())) throw new Error(`Missing ${relative}`);
  const digest = async (file: ReturnType<typeof Bun.file>) =>
    createHash('sha256')
      .update(new Uint8Array(await file.arrayBuffer()))
      .digest('hex');
  const before = await digest(old),
    after = await digest(Bun.file(`${root}/${relative}`));
  comparisons.push({
    file: relative,
    before,
    after,
    identical: before === after,
  });
}
await Bun.write(
  `${root}/.artifacts/m4/text-size-visual-comparison.json`,
  JSON.stringify(
    {
      artifacts: packet.artifacts,
      baseline: '.artifacts/evidence-runs/m4-text-1a065a0b5cde-1792198631329',
      method:
        'Exact PNG byte/hash comparison of fixed-progress captures against immutable earlier TextLoader packet. Supplementary only; natural playback and owner review remain independent.',
      comparisons,
      identical: comparisons.filter((item) => item.identical).length,
      total: comparisons.length,
    },
    null,
    2,
  ),
);
console.log({
  identical: comparisons.filter((item) => item.identical).length,
  total: comparisons.length,
});

if (comparisons.length !== 60)
  throw new Error('Incomplete fixed-progress comparison');
