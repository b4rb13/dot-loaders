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
    throw new Error('Changed chart artifact');
const sizes: Record<string, unknown> = {};
for (const fixture of ['firstParty', 'custom'] as const)
  for (const entry of ['root', 'family'] as const) {
    let native = 0,
      nativeExternal = 0;
    for (const framework of ['native', 'react'] as const) {
      const author =
        fixture === 'firstParty'
          ? `import {ridge,scan,terrain,bars,scatter,cycle,morphWipe} from '@dotquilt-internal/core/animations/chart';const idle=[ridge({amplitude:.4,highlightWidth:180}),scan({bandWidth:80,trail:240}),terrain({relief:1.4}),bars({sway:.12}),scatter({radius:24,spread:.35,sway:.1}),cycle({holdMs:800,blendMs:200})];const handoff=[morphWipe({morphEnd:.95,wipeStart:.6,edge:80})];`
          : `import {defineAnimation} from '@dotquilt-internal/core/animations';const idle=[defineAnimation({contractVersion:1,id:'example/chart-idle',family:'chart',phase:'idle',options:{parse:(v)=>({gain:v.gain??.5})},still(ctx){ctx.dot({x:ctx.surface.width/2,y:ctx.surface.height/2,size:2,opacity:.25,tone:'base'});},frame(ctx,o){ctx.dot({x:ctx.surface.width/2,y:ctx.surface.height/2+Math.sin(ctx.frame.timeMs/500)*10,size:2,opacity:o.gain,tone:'accent'});}})({gain:.6})];const handoff=[defineAnimation({contractVersion:1,id:'example/chart-handoff',family:'chart',phase:'handoff',options:{parse:()=>({})},duration:()=>500,prepare:surface=>surface.input.kind==='bar'?surface.input.bars.length:surface.input.points.length,frame(ctx){for(const d of ctx.surface.source)ctx.dot({...d,opacity:d.opacity*(1-ctx.frame.progress)});ctx.reveal({opacity:ctx.frame.progress});}})()];`;
      const suffix = entry === 'root' ? '' : '/chart',
        regionSuffix = entry === 'root' ? '' : '/region';
      const sample = `const sample=({width,height})=>({kind:'line',points:[{x:0,y:height},{x:width,y:0}],baseline:height});`;
      const source =
        author +
        sample +
        (framework === 'native'
          ? `import {registerChartLoader} from '@dotquilt-internal/core${suffix}';import {registerLoadingRegion} from '@dotquilt-internal/core${regionSuffix}';registerChartLoader();registerLoadingRegion();const region=document.createElement('dotquilt-region'),host=document.createElement('dotquilt-chart-loader');host.slot='placeholder';host.targetProvider=sample;region.append(host,document.createElement('div'));let count=0;const select=()=>{host.animations={idle:idle[count%idle.length],handoff:handoff[count%handoff.length]};region.state=count++%2?'ready':'pending';};document.body.append(region);document.addEventListener('click',select);select();`
          : `import {createElement as h,useState} from 'react';import {createRoot} from 'react-dom/client';import {ChartLoader} from '@dotquilt-internal/react${suffix}';import {LoadingRegion} from '@dotquilt-internal/react${regionSuffix}';function Example(){const [count,setCount]=useState(0);return h(LoadingRegion,{state:count%2?'ready':'pending',onClick:()=>setCount(count+1),placeholder:h(ChartLoader,{targetProvider:sample,animations:{idle:idle[count%idle.length],handoff:handoff[count%handoff.length]}})},h('div',null,'Application chart'));}createRoot(document.body).render(h(Example));`);
      const path = resolve(
        report.consumer,
        `chart-options-${fixture}-${entry}-${framework}.ts`,
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
        throw new Error('Cannot compile complete chart animation closure');
      const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
      const productionPath = resolve(
        root,
        `.artifacts/m4/chart-options-${fixture}-${entry}-${framework}-production.js`,
      );
      const runtimeBuild =
        framework === 'native'
          ? build
          : await Bun.build({
              entrypoints: [path],
              target: 'browser',
              format: 'esm',
              minify: true,
            });
      if (!runtimeBuild.success || !runtimeBuild.outputs[0])
        throw new Error('Cannot compile full optional React consumer');
      const runtimeBytes = new Uint8Array(
        await runtimeBuild.outputs[0].arrayBuffer(),
      );
      await writeFile(productionPath, runtimeBytes);
      const gzip = gzipSync(bytes, { level: 9 }).length;
      const css = await readFile(
        resolve(
          report.consumer,
          `node_modules/@dotquilt-internal/${framework === 'native' ? 'core' : 'react'}/dist/chart.css`,
        ),
      );
      const external =
        gzip +
        gzipSync(css, { level: 9 }).length +
        gzipSync(
          await readFile(
            resolve(
              report.consumer,
              `node_modules/@dotquilt-internal/${framework === 'native' ? 'core' : 'react'}/dist/region.css`,
            ),
          ),
          { level: 9 },
        ).length;
      if (framework === 'native') {
        native = gzip;
        nativeExternal = external;
      }
      sizes[`${fixture}-${entry}-${framework}`] = {
        source,
        productionPath,
        productionSha256: createHash('sha256')
          .update(runtimeBytes)
          .digest('hex'),
        runtimeMethod:
          framework === 'native'
            ? 'Exact measured native bytes'
            : 'Same complete fixture, including React/DOM peers; matched adapter increment remains measured separately',
        runtimeGzip: gzipSync(runtimeBytes, { level: 9 }).length,
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
        withinChartEntryCeiling:
          framework === 'native' ? external <= 12288 : undefined,
      };
    }
  }
await writeFile(
  resolve(root, '.artifacts/m4/chart-animation-closures.json'),
  `${JSON.stringify({ artifacts: report.artifacts, consumer: report.consumer, method: 'Complete compiled selectable first-party and custom-authoring consumers; mandatory defaults and owning region retained; real independently compressed CSS; React peers excluded. These are measurements, not additional size exceptions or browser runtime passes.', sizes }, null, 2)}\n`,
);
