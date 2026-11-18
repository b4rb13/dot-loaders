import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const report = await Bun.file(
  resolve(root, '.artifacts/m4/chart-animation-closures.json'),
).json();
const packed = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
for (const name of ['core', 'react']) {
  const artifact = packed.artifacts[name];
  if (
    report.artifacts?.[name]?.sha256 !== artifact.sha256 ||
    createHash('sha256')
      .update(await readFile(artifact.path))
      .digest('hex') !== artifact.sha256
  )
    throw new Error('Stale complete chart closure');
}
const reference = await Bun.file(
  resolve(
    root,
    '.artifacts/evidence-runs/m4-chart-8f199142cd4d-1792206523796/.artifacts/m4/chart-animation-closures.json',
  ),
).json();
if (
  Object.keys(report.sizes).length !== 8 ||
  Object.keys(reference.sizes).some(
    (key) =>
      report.sizes[key]?.sourceSha256 !== reference.sizes[key].sourceSha256,
  )
)
  throw new Error('Complete consumer fixtures changed');
const failures: string[] = [];
const rows = [];
for (const fixture of ['firstParty', 'custom'])
  for (const entry of ['root', 'family']) {
    const key = `${fixture}-${entry}`;
    const native = report.sizes[`${key}-native`],
      react = report.sizes[`${key}-react`];
    for (const row of [native, react])
      if (
        !row ||
        !Number.isSafeInteger(row.external) ||
        !Number.isSafeInteger(row.gzip) ||
        row.gzip < 0 ||
        row.external < row.gzip ||
        createHash('sha256').update(row.source).digest('hex') !==
          row.sourceSha256
      )
        throw new Error(`Invalid ${key} closure`);
    const nativePass = native.external <= 12288;
    const increment = Math.max(
      react.gzip - native.gzip,
      react.external - native.external,
    );
    const reactPass = increment <= 2048;
    if (!nativePass) failures.push(`${key}-native`);
    if (!reactPass) failures.push(`${key}-react-increment`);
    rows.push({
      key,
      native: native.external,
      limit: 12288,
      overBy: Math.max(0, native.external - 12288),
      nativePass,
      reactIncrement: increment,
      reactLimit: 2048,
      reactPass,
    });
  }
const result = {
  artifacts: packed.artifacts,
  method:
    'Unchanged complete selectable fixture closures, gzip-9 JS plus independently compressed actual chart and region CSS. Native ceiling 12 KiB; matched React increment 2 KiB. No ceiling exceptions.',
  rows,
  failures,
  result: failures.length ? 'fail' : 'pass',
};
await writeFile(
  resolve(root, '.artifacts/m4/chart-animation-budget.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(result);
if (failures.length)
  throw new Error(
    `Complete chart animation gates fail: ${failures.join(', ')}`,
  );
