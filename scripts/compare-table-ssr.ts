import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const before = await Bun.file(
  resolve(root, '.artifacts/m4/table-size-work/before-packed.json'),
).json();
const after = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
const reference = await Bun.file(
  resolve(root, 'docs/implementation/m4/table-evidence.json'),
).json();
const hash = (data: string | Uint8Array) =>
  createHash('sha256').update(data).digest('hex');
for (const pkg of ['core', 'react']) {
  if (before.artifacts[pkg].sha256 !== reference.artifacts[pkg].sha256)
    throw new Error('Wrong SSR reference');
  const path = `packages/${pkg}/dist/${pkg === 'core' ? 'internal/table-model' : 'table'}.js`;
  if (
    hash(
      await readFile(
        resolve(
          before.consumer,
          `node_modules/@dotquilt-internal/${pkg}/dist/${pkg === 'core' ? 'internal/table-model' : 'table'}.js`,
        ),
      ),
    ) !== reference.sourceArchive[path]
  )
    throw new Error('Changed installed SSR reference');
}
const source = `import {createElement as h} from 'react';
import {renderToString} from 'react-dom/server';
import {TableLoader} from '@dotquilt-internal/react/table';
const cases = [
 {},
 {rows:5,rowHeight:32,columns:[{kind:'text',width:2},{kind:'number'},{kind:'badge'},{kind:'date'}]},
 {rows:100,rowHeight:12.5,columns:Array.from({length:21},()=>({kind:'text',width:1}))},
 {rows:-1,rowHeight:Infinity,columns:[]},
 {rows:NaN,rowHeight:0,columns:[{kind:'other'}]},
 {columns:[{kind:'text',width:1e308},{kind:'number',width:1e308}]},
 {columns:[{kind:'text',width:.1},{kind:'number',width:.2},{kind:'badge',width:.3}]},
];
const rows=[];
for(const stylePolicy of [{mode:'inline'},{mode:'inline',nonce:'table-compare'},{mode:'external',href:'/react/table.css'}])
 for(const [index,props] of cases.entries()) rows.push({index,mode:JSON.stringify(stylePolicy),html:renderToString(h(TableLoader,{...props,stylePolicy}))});
console.log(JSON.stringify(rows));`;
const outputs = [];
for (const packet of [before, after]) {
  const path = resolve(packet.consumer, '.table-size-ssr.mjs');
  await writeFile(path, source);
  const child = Bun.spawn(['bun', path], {
    cwd: packet.consumer,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if ((await child.exited) || stderr)
    throw new Error(`Table SSR comparison failed: ${stderr}`);
  outputs.push(JSON.parse(stdout));
}
if (JSON.stringify(outputs[0]) !== JSON.stringify(outputs[1]))
  throw new Error('React Table SSR changed');
await writeFile(
  resolve(root, '.artifacts/m4/table-ssr-comparison.json'),
  `${JSON.stringify(
    {
      result: 'pass',
      artifacts: after.artifacts,
      referenceArtifacts: before.artifacts,
      workerSha256: hash(source),
      cases: outputs[0].map(
        (row: { index: number; mode: string; html: string }) => ({
          index: row.index,
          mode: row.mode,
          sha256: hash(row.html),
        }),
      ),
      scope:
        '21 exact React Table SSR strings over default/weighted/fractional/extreme/capped/invalid configuration and inline/nonce/external delivery; no hydration or browser qualification inferred',
    },
    null,
    2,
  )}\n`,
);
console.log('21 React Table SSR strings unchanged');
