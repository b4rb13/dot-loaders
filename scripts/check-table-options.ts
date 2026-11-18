import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const load = (p: string) =>
  Bun.file(new URL(`../${p}`, import.meta.url)).json();
const report = await load('.artifacts/m4/table-animation-closures.json');
const catalog = await load('.artifacts/m4/packed-report.json');
const hash = (data: string | Uint8Array) =>
  createHash('sha256').update(data).digest('hex');
for (const name of ['core', 'react']) {
  const a = report.artifacts[name];
  if (
    a.sha256 !== catalog.artifacts[name].sha256 ||
    hash(await readFile(a.path)) !== a.sha256
  )
    throw new Error('Stale TableLoader artifact');
}
if (Object.keys(report.sizes).length !== 8)
  throw new Error('Incomplete table closure measurements');
const rows = [];
for (const fixture of ['firstParty', 'custom'])
  for (const entry of ['root', 'family']) {
    const key = `${fixture}-${entry}`;
    const native = report.sizes[`${key}-native`],
      react = report.sizes[`${key}-react`];
    for (const value of [native, react]) {
      if (
        !value ||
        !Number.isSafeInteger(value.gzip) ||
        value.gzip < 0 ||
        !Number.isSafeInteger(value.external) ||
        value.external < value.gzip ||
        hash(value.source) !== value.sourceSha256 ||
        hash(await readFile(value.productionPath)) !== value.productionSha256
      )
        throw new Error('Invalid complete table closure');
    }
    const increment = Math.max(
      react.gzip - native.gzip,
      react.external - native.external,
    );
    if (
      react.increment !== react.gzip - native.gzip ||
      react.externalIncrement !== react.external - native.external
    )
      throw new Error('Invalid table React increment');
    rows.push({
      key,
      native: native.external,
      limit: 12288,
      nativePass: native.external <= 12288,
      reactIncrement: increment,
      reactLimit: 2048,
      reactPass: increment <= 2048,
    });
  }
const failures = rows.filter((r) => !r.nativePass || !r.reactPass);
const result = {
  artifacts: report.artifacts,
  rows,
  failures,
  result: failures.length ? 'fail' : 'pass',
  method:
    'Complete selectable/custom table closures; actual CSS compressed independently; unchanged 12 KiB native and 2 KiB matched React limits. No exception or automatic baseline acceptance.',
};
await writeFile(
  new URL('../.artifacts/m4/table-animation-budget.json', import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
if (failures.length)
  throw new Error(
    `Complete optional table budgets fail: ${failures.map((r) => r.key).join(', ')}`,
  );
console.log('Complete optional table size budgets pass');
