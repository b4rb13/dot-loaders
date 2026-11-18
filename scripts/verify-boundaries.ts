import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m4-final-api');
const packed = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
const consumer = packed.consumer as string;
const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
for (const a of Object.values(packed.artifacts) as {
  path: string;
  sha256: string;
}[])
  if (hash(await readFile(a.path)) !== a.sha256)
    throw Error('Changed artifact');
const graphs = [];
for (const name of ['core', 'react']) {
  const directory = resolve(consumer, 'node_modules/@dotquilt-internal', name),
    manifest = await Bun.file(resolve(directory, 'package.json')).json();
  if (
    !manifest.private ||
    Object.keys(manifest.exports).some(
      (p) => p.includes('internal') || p.includes('*'),
    )
  )
    throw Error('Private/wildcard export exposed');
  const modules = [];
  for await (const file of new Bun.Glob('**/*.{js,d.ts}').scan({
    cwd: resolve(directory, 'dist'),
    onlyFiles: true,
  })) {
    const path = resolve(directory, 'dist', file),
      code = await readFile(path, 'utf8');
    const imports = [
      ...code.matchAll(/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g),
    ].map((m) => m[1] as string);
    for (const specifier of imports) {
      if (specifier.startsWith('.')) {
        const resolved = resolve(dirname(path), specifier);
        if (
          !resolved.startsWith(directory + sep) ||
          !(await Bun.file(resolved).exists())
        )
          throw Error(
            `Escaping or missing relative dependency ${name}/${file}: ${specifier}`,
          );
      } else if (specifier.startsWith('@dotquilt-internal/core')) {
        const native = await Bun.file(
          resolve(
            consumer,
            'node_modules/@dotquilt-internal/core/package.json',
          ),
        ).json();
        const entry = specifier.slice('@dotquilt-internal/core'.length);
        if (!Object.hasOwn(native.exports, entry ? `.${entry}` : '.'))
          throw Error(`Unexported core dependency: ${specifier}`);
      } else if (
        !['react', 'react-dom', 'react-dom/client'].includes(specifier)
      )
        throw Error(`Unexpected external dependency ${specifier}`);
    }
    modules.push({ file, sha256: hash(code), imports });
  }
  if (
    name === 'react' &&
    (await Bun.file(
      resolve(directory, 'dist/internal/table-static.d.ts'),
    ).exists())
  )
    throw Error('Build-only forwarding declaration shipped');
  graphs.push({
    package: name,
    exports: Object.keys(manifest.exports),
    modules,
  });
}
const runtimeSource = `
import assert from 'node:assert/strict';
import {createElement as h} from 'react';import {renderToString} from 'react-dom/server';
import {TableLoader} from '@dotquilt-internal/react/table';import {renderStatic} from '@dotquilt-internal/core/server';
assert.equal(typeof document,'undefined');assert.equal(typeof window,'undefined');
for(const specifier of ['@dotquilt-internal/core/internal/table-static','@dotquilt-internal/core/internal/table-model','@dotquilt-internal/core/dist/internal/table-model.js','@dotquilt-internal/react/internal/table-static','@dotquilt-internal/react/dist/internal/table-static.js']){
 let rejected=false;try{await import(specifier)}catch{rejected=true}assert.ok(rejected,specifier);
}
const columns=Object.freeze(Array.from({length:21},(_,i)=>Object.freeze({kind:['text','number','badge','date'][i%4],width:i+1})));
const inputs=[{}, {rows:100,rowHeight:16,columns:columns.slice(0,1)},{rows:100,rowHeight:16,columns},{rows:0,rowHeight:Infinity,columns:[]},{rows:1,rowHeight:1,columns:[{kind:'text',width:Number.MIN_VALUE},{kind:'badge',width:Number.MAX_VALUE}]},{rows:100,rowHeight:Number.MAX_SAFE_INTEGER/100,columns}];
const geometry=html=>{
 const svg=html.match(/<svg\\b([^>]*)>([\\s\\S]*?)<\\/svg>/);assert.ok(svg);
 const attrs=s=>Object.fromEntries([...s.matchAll(/([\\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 const outer=attrs(svg[1]);return {height:outer.height,viewBox:outer.viewBox,paths:[...svg[2].matchAll(/<path\\b([^>]*)>/g)].map(m=>attrs(m[1]))};
};
const rows=[];
for(const [index,props] of inputs.entries()){
 const before=JSON.stringify(props);let calls=0;
 const native=geometry(renderStatic({kind:'table-loader',...props}));
 const adapter=geometry(renderToString(h(TableLoader,{...props,targetProvider:()=>{calls++;throw Error('SSR provider');}})));
 assert.deepEqual(adapter,native);assert.equal(calls,0);assert.equal(JSON.stringify(props),before);assert.ok(native.paths.length<=20);rows.push({index,geometry:native});
}
console.log(JSON.stringify({runtime:process.release.name,version:process.version,privateImportDenials:5,parityCases:rows}));
`;
await Bun.write(resolve(consumer, 'boundary-check.mjs'), runtimeSource);
const runtimes = [];
for (const runtime of ['node', 'bun']) {
  const p = Bun.spawn([runtime, 'boundary-check.mjs'], {
    cwd: consumer,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  await Bun.write(resolve(output, `boundary-${runtime}.log`), stdout + stderr);
  if (await p.exited) throw Error(`Boundary failure ${runtime}`);
  runtimes.push({ runtime, ...JSON.parse(stdout) });
}
await Bun.write(
  resolve(output, 'boundaries.json'),
  `${JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      artifacts: packed.artifacts,
      graphs,
      runtimes,
      status: 'pass',
      sourceSha256: hash(await readFile(import.meta.filename)),
    },
    null,
    2,
  )}\n`,
);
console.log(
  'Public-only package graph, Node/Bun private-import denials and bounded native/React static parity pass.',
);
