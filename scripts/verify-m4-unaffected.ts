import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { entrySignature } from './m4-entry-equivalence.js';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m4');
const before = await Bun.file(
  resolve(
    output,
    'table-development/before-final/table-unaffected-before.json',
  ),
).json();
const old = await Bun.file(
  resolve(
    output,
    'table-development/pre-adapter-optimization/packed-report.json',
  ),
).json();
const after = await Bun.file(
  resolve(output, 'table-unaffected-after.json'),
).json();
const hash = (data: string | Uint8Array) =>
  createHash('sha256').update(data).digest('hex');

const scripts = [];
await mkdir(resolve(output, 'table-development/unaffected-reconstruction'), {
  recursive: true,
});
for (const [source, file] of [
  ['client.ts', 'native.js'],
  ['react.tsx', 'react.js'],
  ['text-client.ts', 'text.js'],
  ['text-react.tsx', 'text-react.js'],
  ['chart-client.ts', 'chart.js'],
  ['chart-react.tsx', 'chart-react.js'],
] as const) {
  const result = await Bun.build({
    entrypoints: [resolve(old.consumer, source)],
    format: 'esm',
    target: 'browser',
    minify: false,
  });
  if (!result.success || !result.outputs[0])
    throw new Error('Cannot reconstruct original consumer');
  const text = await result.outputs[0].text();
  if (hash(text) !== before.files[file])
    throw new Error(`Original observed bytes not reproduced: ${file}`);
  await writeFile(
    resolve(output, 'table-development/unaffected-reconstruction', file),
    text,
  );
  const prior = entrySignature(text),
    current = after.identityNeutral[file];
  if (
    prior.replacements !== 1 ||
    current?.replacements !== 1 ||
    prior.moduleComments !== current.moduleComments ||
    prior.sha256 !== current.sha256
  )
    throw new Error(`Non-table runtime changed: ${file}`);
  await writeFile(
    resolve(output, 'table-development/unaffected-reconstruction', file),
    text,
  );
  scripts.push({
    file,
    beforeSha256: before.files[file],
    afterSha256: after.files[file],
    identityNeutralSha256: prior.sha256,
    replacements: 1,
    status:
      'Only source-build registration identity and temporary module-path comments differ; current registration checks required separately',
  });
}
const unchanged = Object.entries(before.files)
  .filter(([key]) => !key.endsWith('.js'))
  .map(([file, sha256]) => {
    if (after.files[file] !== sha256)
      throw new Error(`Non-table fixture/CSS changed: ${file}`);
    return { file, sha256 };
  });
if (JSON.stringify(before.markup) !== JSON.stringify(after.markup))
  throw new Error('Non-table SSR markup changed');
await writeFile(
  resolve(output, 'table-unaffected-comparison.json'),
  `${JSON.stringify({ artifacts: after.artifacts, referenceArtifacts: before.artifacts, result: 'pass', scripts, unchanged, ssrSignatures: after.markup, scope: 'Reuses original existing-catalog rendering observations for proven equivalent non-table entry graphs. Raw scripts differ only in temporary module-path comments and the deterministic source-build identity used for registration; no fresh browser-run or whole-package equivalence claim. Current registration behavior is checked by the fresh native/React/Next matrix. TableLoader is tested independently.' }, null, 2)}\n`,
);
console.log(
  'Six non-table graphs differ only by build identity; 32 fixture/CSS files and 25 SSR outputs are exact',
);
