import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const root = resolve(import.meta.dir, '..');
const report = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
for (const artifact of Object.values(report.artifacts) as {
  path: string;
  sha256: string;
}[])
  if (
    createHash('sha256')
      .update(await readFile(artifact.path))
      .digest('hex') !== artifact.sha256
  )
    throw new Error('Changed text artifact');
const sizes: Record<string, unknown> = {};
for (const fixture of ['firstParty', 'custom'] as const)
  for (const entry of ['root', 'family'] as const) {
    let native = 0,
      nativeExternal = 0;
    for (const framework of ['native', 'react'] as const) {
      const author =
        fixture === 'firstParty'
          ? `import {scramble,scrambleCharacters,scrambleWords,labelPulse,lock,printText,fade} from '@dotquilt-internal/core/animations/text';const idle=[scramble({changesPerSecond:4}),scrambleCharacters({changesPerSecond:4}),scrambleWords({changesPerSecond:4}),labelPulse({travelPxPerSecond:140})];const handoff=[lock({staggerMs:40,pop:.3}),printText({reelMs:100,settleMs:180}),fade({duration:150})];`
          : `import {defineAnimation} from '@dotquilt-internal/core/animations';const idle=[defineAnimation({contractVersion:1,id:'example/text-idle',family:'text',phase:'idle',options:{parse:(options)=>({gain:options.gain??.5})},still(context){for(const cell of context.surface.input.mask)context.dot({x:cell.bounds.x,y:cell.bounds.y,size:1,opacity:.25,tone:'base'});},frame(context,options){for(const cell of context.surface.input.mask)context.dot({x:cell.bounds.x,y:cell.bounds.y,size:1,opacity:options.gain,tone:'accent'});}})({gain:.7})];const handoff=[defineAnimation({contractVersion:1,id:'example/text-handoff',family:'text',phase:'handoff',options:{parse:()=>({})},duration:()=>300,prepare:surface=>surface.input.value.length,frame(context){for(const dot of context.surface.source)context.dot({...dot,opacity:dot.opacity*(1-context.frame.progress)});context.reveal({opacity:context.frame.progress});}})()];`;
      const suffix = entry === 'root' ? '' : '/text';
      const source =
        author +
        (framework === 'native'
          ? `import {registerTextLoader} from '@dotquilt-internal/core${suffix}';registerTextLoader();const host=document.createElement('dotquilt-text-loader');host.textContent='42.50';host.mask='00.00';let count=0;const select=()=>{host.animations={idle:idle[count%idle.length],handoff:handoff[count%handoff.length]};host.state=count++%2?'ready':'pending';};document.body.append(host);document.addEventListener('click',select);select();`
          : `import {createElement as h,useState} from 'react';import {createRoot} from 'react-dom/client';import {TextLoader} from '@dotquilt-internal/react${suffix}';function Example(){const [count,setCount]=useState(0);return h(TextLoader,{state:count%2?'ready':'pending',mask:'00.00',animations:{idle:idle[count%idle.length],handoff:handoff[count%handoff.length]},onClick:()=>setCount(count+1)},'42.50');}createRoot(document.body).render(h(Example));`);
      const path = resolve(
        report.consumer,
        `text-options-${fixture}-${entry}-${framework}.ts`,
      );
      await writeFile(path, source);
      const build = await Bun.build({
        entrypoints: [path],
        target: 'browser',
        format: 'esm',
        minify: true,
        external: ['react', 'react-dom', 'react-dom/client'],
      });
      if (!build.success || !build.outputs[0])
        throw new Error('Cannot compile complete text animation closure');
      const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
      const gzip = gzipSync(bytes, { level: 9 }).length;
      const css = await readFile(
        resolve(
          report.consumer,
          `node_modules/@dotquilt-internal/${framework === 'native' ? 'core' : 'react'}/dist/text.css`,
        ),
      );
      const external = gzip + gzipSync(css, { level: 9 }).length;
      if (framework === 'native') {
        native = gzip;
        nativeExternal = external;
      }
      sizes[`${fixture}-${entry}-${framework}`] = {
        source,
        sourceSha256: createHash('sha256').update(source).digest('hex'),
        minified: bytes.length,
        gzip,
        brotli: brotliCompressSync(bytes).length,
        external,
        ...(framework === 'react'
          ? {
              increment: gzip - native,
              externalIncrement: external - nativeExternal,
            }
          : {}),
        withinTextEntryCeiling:
          framework === 'native' ? external <= 10240 : undefined,
      };
    }
  }
await writeFile(
  resolve(root, '.artifacts/m4/text-animation-closures.json'),
  `${JSON.stringify({ artifacts: report.artifacts, consumer: report.consumer, method: 'Complete compiled selectable first-party and custom-authoring consumers; mandatory defaults retained; real independently compressed CSS; React peers excluded. These are measurements, not additional size exceptions or browser runtime passes.', sizes }, null, 2)}\n`,
);
