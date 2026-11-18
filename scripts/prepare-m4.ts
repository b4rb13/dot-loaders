import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const root = resolve(import.meta.dir, '..');
const output = resolve(root, '.artifacts/m4');
await mkdir(output, { recursive: true });
async function run(args: string[], cwd: string) {
  const task = Bun.spawn(args, {
    cwd,
    env: {
      ...process.env,
      npm_config_cache: resolve(root, '.artifacts/npm-cache'),
      BUN_INSTALL_CACHE_DIR: resolve(root, '.artifacts/bun-cache'),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(task.stdout).text(),
    new Response(task.stderr).text(),
  ]);
  if (await task.exited)
    throw new Error(`${args.join(' ')}: ${stdout}\n${stderr}`);
  return stdout;
}
const artifacts: Record<string, { path: string; sha256: string }> = {};
for (const pkg of ['core', 'react']) {
  const packed = JSON.parse(
    await run(
      [
        'npm',
        'pack',
        '--json',
        '--ignore-scripts',
        '--pack-destination',
        output,
      ],
      resolve(root, `packages/${pkg}`),
    ),
  )[0];
  const path = resolve(output, packed.filename);
  artifacts[pkg] = {
    path,
    sha256: createHash('sha256')
      .update(await readFile(path))
      .digest('hex'),
  };
}
await mkdir(resolve(output, 'history'), { recursive: true });
for (const [name, artifact] of Object.entries(artifacts))
  await cp(
    artifact.path,
    resolve(output, 'history', `${name}-${artifact.sha256}.tgz`),
  );
const core = artifacts.core,
  react = artifacts.react;
if (!core || !react) throw new Error('Missing packages');
const consumer = await mkdtemp(resolve(tmpdir(), 'dotquilt-m4-'));
await writeFile(
  resolve(consumer, 'package.json'),
  JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      '@dotquilt-internal/core': `file:${core.path}`,
      '@dotquilt-internal/react': `file:${react.path}`,
      react: '19.3.1',
      'react-dom': '19.3.1',
      '@types/react': '19.3.0',
      '@types/react-dom': '19.3.0',
    },
    overrides: { '@dotquilt-internal/core': `file:${core.path}` },
  }),
);
await run(['bun', 'install', '--ignore-scripts'], consumer);
const require = createRequire(resolve(consumer, 'package.json'));
const cssAssets = [];
for (const pkg of ['core', 'react']) {
  const specifier = `@dotquilt-internal/${pkg}/styles/skeleton-family.css`;
  const path = require.resolve(specifier);
  const bytes = await readFile(path);
  const css = bytes.toString('utf8');
  if (css.includes('@import'))
    throw new Error('Unaccounted shared stylesheet dependency');
  for (const shape of ['line', 'circle', 'text'])
    if (!css.includes(`:host(dotquilt-skeleton-${shape})`))
      throw new Error('Missing shared stylesheet host scope');
  cssAssets.push({
    specifier,
    path,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
  });
}
await writeFile(
  resolve(output, 'css-delivery.json'),
  `${JSON.stringify(
    {
      artifacts,
      assets: cssAssets,
      result: 'pass',
      method:
        'Resolve exact installed public CSS exports; verify self-contained, host-scoped shared resources. Browser behavior is recorded separately.',
    },
    null,
    2,
  )}\n`,
);
for (const file of [
  'client.ts',
  'react.tsx',
  'text-client.ts',
  'text-react.tsx',
  'chart-client.ts',
  'chart-react.tsx',
]) {
  await cp(resolve(root, `tests/m4/${file}`), resolve(consumer, file));
  const result = await Bun.build({
    entrypoints: [resolve(consumer, file)],
    format: 'esm',
    target: 'browser',
    minify: false,
  });
  if (!result.success || !result.outputs[0])
    throw new Error(`Cannot build ${file}`);
  await writeFile(
    resolve(
      output,
      file === 'chart-client.ts'
        ? 'chart.js'
        : file === 'chart-react.tsx'
          ? 'chart-react.js'
          : file === 'client.ts'
            ? 'native.js'
            : file === 'react.tsx'
              ? 'react.js'
              : file === 'text-client.ts'
                ? 'text.js'
                : 'text-react.js',
    ),
    new Uint8Array(await result.outputs[0].arrayBuffer()),
  );
}
const production: Record<string, unknown> = {};
const tableProduction: Record<string, unknown> = {};
const sizes: Record<string, object> = {};
const rows = [
  ['block', 'SkeletonBlock', 'skeleton', 'skeleton', 6144],
  ['line', 'SkeletonLine', 'skeleton', 'line', 6144],
  ['circle', 'SkeletonCircle', 'skeleton', 'circle', 6144],
  ['multiline', 'SkeletonText', 'skeleton', 'skeleton-text', 8192],
  ['typing', 'TypingDots', 'typing', 'typing', 4096],
  ['text', 'TextLoader', 'text', 'text', 10240],
  ['chart', 'ChartLoader', 'chart', 'chart', 12288],
  ['table', 'TableLoader', 'table', 'table', 12288],
] as const;
for (const [label, component, family, css, limit] of rows) {
  for (const entry of ['root', 'family']) {
    const suffix = entry === 'root' ? '' : `/${family}`;
    const simpleNativeSource = `import {register${component}} from '@dotquilt-internal/core${suffix}'; register${component}(); document.body.append(document.createElement('dotquilt-${label === 'table' ? 'table-loader' : label === 'chart' ? 'chart-loader' : label === 'text' ? 'text-loader' : label === 'multiline' ? 'skeleton-text' : label === 'typing' ? 'typing-dots' : `skeleton-${label}`}'));`;
    const simpleReactSource = `import {createElement as h} from 'react'; import {createRoot} from 'react-dom/client'; import {${component}} from '@dotquilt-internal/react${suffix}'; createRoot(document.body).render(h(${component}));`;
    const regionSuffix = entry === 'root' ? '' : '/region';
    const nativeSource =
      label === 'chart'
        ? `import {ChartLoader,registerChartLoader} from '@dotquilt-internal/core${suffix}';import {LoadingRegion,registerLoadingRegion} from '@dotquilt-internal/core${regionSuffix}';registerChartLoader();registerLoadingRegion();for(const variant of ['line','bar','scatter']){const region=new LoadingRegion(),chart=new ChartLoader();chart.variant=variant;chart.slot='placeholder';chart.targetProvider=({width,height})=>variant==='bar'?{kind:'rects',rects:[{x:0,y:0,width,height}]}:{kind:'points',points:[{x:0,y:height},{x:width,y:0}]};region.append(chart,'0');document.body.append(region);region.state='pending';region.onclick=()=>region.state='ready';}`
        : label === 'table'
          ? `import {TableLoader,registerTableLoader} from '@dotquilt-internal/core${suffix}';import {LoadingRegion,registerLoadingRegion} from '@dotquilt-internal/core${regionSuffix}';registerTableLoader();registerLoadingRegion();const r=new LoadingRegion(),t=new TableLoader(),content=document.createElement('div');content.textContent='0';r.state='pending';t.slot='placeholder';t.targetProvider=()=>({kind:'table',cells:[{bounds:{x:0,y:0,width:100,height:32},text:'0',baseline:24,tone:'base',rowId:'a',rowIndex:0,columnIndex:0,kind:'number',glyphs:[{character:'0',bounds:{x:8,y:6,width:12,height:18}}]}]});r.revealTargets=[{id:'a',element:content}];r.append(t,content);document.body.append(r);r.onclick=()=>r.state='ready';`
          : simpleNativeSource;
    const reactSource =
      label === 'chart'
        ? `import {createElement as h,useState} from 'react';import {createRoot} from 'react-dom/client';import {ChartLoader} from '@dotquilt-internal/react${suffix}';import {LoadingRegion} from '@dotquilt-internal/react${regionSuffix}';function Fixture(){const [state,setState]=useState('pending');return ['line','bar','scatter'].map(variant=>h(LoadingRegion,{key:variant,state,onClick:()=>setState('ready'),placeholder:h(ChartLoader,{variant,targetProvider:({width,height})=>variant==='bar'?{kind:'rects',rects:[{x:0,y:0,width,height}]}:{kind:'points',points:[{x:0,y:height},{x:width,y:0}]}})},h('div',null,'0')));}createRoot(document.body).render(h(Fixture));`
        : label === 'table'
          ? `import {createElement as h,useState,useCallback} from 'react';import {createRoot} from 'react-dom/client';import {TableLoader} from '@dotquilt-internal/react${suffix}';import {LoadingRegion} from '@dotquilt-internal/react${regionSuffix}';function Fixture(){const [state,setState]=useState('pending'),[targets,setTargets]=useState([]),ref=useCallback(element=>{setTargets(element?[{id:'a',element}]:[])},[]);return h(LoadingRegion,{state,revealTargets:targets,onClick:()=>setState('ready'),placeholder:h(TableLoader,{targetProvider:()=>({kind:'table',cells:[{bounds:{x:0,y:0,width:100,height:32},text:'0',baseline:24,tone:'base',rowId:'a',rowIndex:0,columnIndex:0,kind:'number',glyphs:[{character:'0',bounds:{x:8,y:6,width:12,height:18}}]}]})})},h('div',{ref},'0'));}createRoot(document.body).render(h(Fixture));`
          : simpleReactSource;
    let nativeGzip = 0;
    let nativeExternal = 0;
    for (const [name, source] of [
      ['native', nativeSource],
      ['react', reactSource],
    ] as const) {
      const path = resolve(consumer, `${label}-${entry}-${name}.ts`);
      await writeFile(path, source);
      const build = await Bun.build({
        entrypoints: [path],
        format: 'esm',
        target: 'browser',
        minify: true,
        external: ['react', 'react-dom', 'react-dom/client'],
      });
      if (!build.success || !build.outputs[0])
        throw new Error(`Size fixture ${label}`);
      const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
      const gzip = gzipSync(bytes, { level: 9 }).length;
      if (label === 'chart' || label === 'table') {
        const full =
          name === 'native'
            ? build
            : await Bun.build({
                entrypoints: [path],
                format: 'esm',
                target: 'browser',
                minify: true,
              });
        if (!full.success || !full.outputs[0])
          throw new Error('Broken full chart consumer');
        const fullBytes = new Uint8Array(await full.outputs[0].arrayBuffer()),
          file = `${label}-${entry}-${name}-production.js`;
        await writeFile(resolve(output, file), fullBytes);
        (label === 'chart' ? production : tableProduction)[`${entry}-${name}`] =
          {
            file,
            sha256: createHash('sha256').update(fullBytes).digest('hex'),
            minified: fullBytes.length,
            gzip: gzipSync(fullBytes, { level: 9 }).length,
            method:
              name === 'native'
                ? 'Exact measured native bytes'
                : 'Full production React consumer, including React/DOM peers; adapter increments measured independently',
          };
      }

      const styleBytes = await readFile(
        resolve(
          consumer,
          `node_modules/@dotquilt-internal/${name === 'native' ? 'core' : 'react'}/dist/${css}.css`,
        ),
      );
      const external =
        gzip +
        gzipSync(styleBytes, { level: 9 }).length +
        (['chart', 'table'].includes(label)
          ? gzipSync(
              await readFile(
                resolve(
                  consumer,
                  `node_modules/@dotquilt-internal/${name === 'native' ? 'core' : 'react'}/dist/region.css`,
                ),
              ),
              { level: 9 },
            ).length
          : 0);
      if (name === 'native') {
        nativeGzip = gzip;
        nativeExternal = external;
      }
      sizes[`${label}-${entry}-${name}`] = {
        minified: bytes.length,
        gzip,
        brotli: brotliCompressSync(bytes).length,
        external,
        ...(name === 'native'
          ? { limit, pass: external <= limit }
          : {
              increment: gzip - nativeGzip,
              incrementLimit: 2048,
              externalIncrement: external - nativeExternal,
              incrementPass:
                Math.max(gzip - nativeGzip, external - nativeExternal) <= 2048,
            }),
      };
    }
  }
}
for (const entry of ['root', 'family']) {
  const suffix = entry === 'root' ? '' : '/skeleton';
  let nativeGzip = 0,
    nativeExternal = 0,
    nativeSharedExternal = 0;
  for (const name of ['native', 'react']) {
    const file = resolve(consumer, `skeleton-family-${entry}-${name}.ts`);
    const source =
      name === 'native'
        ? `import {registerSkeletonBlock,registerSkeletonLine,registerSkeletonCircle,registerSkeletonText} from '@dotquilt-internal/core${suffix}'; for(const register of [registerSkeletonBlock,registerSkeletonLine,registerSkeletonCircle,registerSkeletonText])register(); for(const tag of ['block','line','circle','text'])document.body.append(document.createElement('dotquilt-skeleton-'+tag));`
        : `import {createElement as h} from 'react';import {createRoot} from 'react-dom/client';import {SkeletonBlock,SkeletonLine,SkeletonCircle,SkeletonText} from '@dotquilt-internal/react${suffix}';createRoot(document.body).render([SkeletonBlock,SkeletonLine,SkeletonCircle,SkeletonText].map((component,key)=>h(component,{key})));`;
    await writeFile(file, source);
    const build = await Bun.build({
      entrypoints: [file],
      format: 'esm',
      target: 'browser',
      minify: true,
      external: ['react', 'react-dom', 'react-dom/client'],
    });
    if (!build.success || !build.outputs[0])
      throw new Error('Skeleton family consumer failed');
    const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
    const gzip = gzipSync(bytes, { level: 9 }).length;
    let external = gzip;
    for (const css of ['skeleton', 'line', 'circle', 'skeleton-text'])
      external += gzipSync(
        await readFile(
          resolve(
            consumer,
            `node_modules/@dotquilt-internal/${name === 'native' ? 'core' : 'react'}/dist/${css}.css`,
          ),
        ),
        { level: 9 },
      ).length;
    const sharedExternal =
      gzip +
      gzipSync(
        await readFile(
          resolve(
            consumer,
            `node_modules/@dotquilt-internal/${name === 'native' ? 'core' : 'react'}/dist/skeleton-family.css`,
          ),
        ),
        { level: 9 },
      ).length;
    if (name === 'native') {
      nativeGzip = gzip;
      nativeExternal = external;
      nativeSharedExternal = sharedExternal;
    }
    sizes[`skeletonFamily-${entry}-${name}`] = {
      minified: bytes.length,
      gzip,
      brotli: brotliCompressSync(bytes).length,
      external,
      sharedExternal,
      ...(name === 'native'
        ? {
            limit: 10240,
            pass: external <= 10240,
            sharedPass: sharedExternal <= 10240,
          }
        : {
            increment: gzip - nativeGzip,
            externalIncrement: external - nativeExternal,
            sharedExternalIncrement: sharedExternal - nativeSharedExternal,
            incrementLimit: 2048,
            incrementPass:
              Math.max(
                gzip - nativeGzip,
                external - nativeExternal,
                sharedExternal - nativeSharedExternal,
              ) <= 2048,
          }),
      externalAccounting:
        'Per-face mode counts four independent responses; sharedExternal counts the shipped, host-scoped skeleton-family.css response once, verified in native/React browser fixtures',
    };
  }
}
await writeFile(
  resolve(output, 'chart-production.json'),
  `${JSON.stringify({ artifacts, production }, null, 2)}\n`,
);
await writeFile(
  resolve(output, 'table-production.json'),
  `${JSON.stringify({ artifacts, production: tableProduction }, null, 2)}\n`,
);
await writeFile(resolve(output, 'consumer-path'), consumer);
await writeFile(
  resolve(output, 'packed-report.json'),
  `${JSON.stringify(
    {
      date: new Date().toISOString(),
      artifacts,
      consumer,
      sizes,
      provisional: true,
      catalog:
        'nine incremental exports; table/other motion and full catalog still require acceptance',
      budgetDecision:
        'https://github.com/b4rb13/dot-loaders/issues/9#issuecomment-6226666680',
      measurement: {
        bundler: `Bun ${Bun.version}`,
        target: 'browser',
        format: 'esm',
        minify: true,
        gzipLevel: 9,
        brotli: 'node:zlib defaults',
        externalResources: 'Actual separate responses compressed independently',
        reactPeers:
          'React and React DOM excluded in matched native/adapter closures',
      },
      npmPublishing: 'disabled',
      limitations: [
        'Physical-reference qualification unavailable; M2 remains open',
        'Approved M4 size amendment; significant regressions remain independently gated',
        'Not a full-catalog benchmark or renderer decision',
      ],
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify({ artifacts, consumer, sizes }, null, 2));
