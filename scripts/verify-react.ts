import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { hasClientDirective } from './client-directive.js';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m3');
await mkdir(output, { recursive: true });
const hash = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex');
const read = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const native = await read(resolve(root, '.artifacts/packed-report.json'));
if (hash(await readFile(native.artifact)) !== native.sha256)
  throw new Error('Changed native artifact');
const checks: { command: string; cwd: string; exitCode: number }[] = [];
async function run(args: string[], cwd: string) {
  const task = Bun.spawn(args, {
    cwd,
    env: {
      ...process.env,
      npm_config_cache: resolve(root, '.artifacts/npm-cache'),
      BUN_INSTALL_CACHE_DIR: resolve(root, '.artifacts/bun-cache'),
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(task.stdout).text(),
    new Response(task.stderr).text(),
  ]);
  const exitCode = await task.exited;
  checks.push({ command: args.join(' '), cwd, exitCode });
  if (exitCode)
    throw new Error(`${args.join(' ')} failed\n${stdout}\n${stderr}`);
  return stdout;
}
const manifest = await read(resolve(root, 'packages/react/package.json'));
if (
  !manifest.private ||
  manifest.version !== native.version ||
  manifest.dependencies['@dotquilt-internal/core'] !== native.version ||
  !manifest.scripts.prepublishOnly
)
  throw new Error('Private/coordinated artifact policy failed');
const packed = JSON.parse(
  await run(
    ['npm', 'pack', '--json', '--ignore-scripts', '--pack-destination', output],
    resolve(root, 'packages/react'),
  ),
)[0];
const artifact = resolve(output, packed.filename),
  sha256 = hash(await readFile(artifact));
const archive = resolve(output, 'history', sha256);
await mkdir(archive, { recursive: true });
await cp(artifact, resolve(archive, packed.filename));
const consumers: Record<string, string> = {},
  sizes: Record<string, unknown> = {};
const failures: string[] = [];
const versions = {
  current: { react: '19.3.1', typesReact: '19.3.0', typesDom: '19.3.0' },
  floor: { react: '19.0.9', typesReact: '19.0.14', typesDom: '19.0.6' },
};
for (const [line, versionsForLine] of Object.entries(versions)) {
  const consumer = await mkdtemp(resolve(tmpdir(), `dotquilt-react-${line}-`));
  consumers[line] = consumer;
  await writeFile(
    resolve(consumer, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        overrides: { '@dotquilt-internal/core': `file:${native.artifact}` },
        dependencies: {
          '@dotquilt-internal/core': `file:${native.artifact}`,
          '@dotquilt-internal/react': `file:${artifact}`,
          react: versionsForLine.react,
          'react-dom': versionsForLine.react,
          '@types/react': versionsForLine.typesReact,
          '@types/react-dom': versionsForLine.typesDom,
        },
      },
      null,
      2,
    ),
  );
  await run(
    line === 'current'
      ? ['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund']
      : ['bun', 'install', '--ignore-scripts'],
    consumer,
  );
  await writeFile(
    resolve(consumer, 'consumer.tsx'),
    (await readFile(resolve(root, 'tests/react/consumer.tsx'), 'utf8')).replace(
      '../../examples/api/react',
      './examples/api/react.js',
    ),
  );
  await cp(resolve(root, 'examples/api'), resolve(consumer, 'examples/api'), {
    recursive: true,
  });
  for (const compiler of ['typescript', 'typescript-min'])
    for (const mode of ['Bundler', 'NodeNext'])
      await run(
        [
          'node',
          resolve(root, `node_modules/${compiler}/bin/tsc`),
          '--noEmit',
          '--strict',
          '--skipLibCheck',
          'false',
          '--target',
          'ES2022',
          '--lib',
          'ES2022,DOM,DOM.Iterable',
          '--jsx',
          'react-jsx',
          '--moduleResolution',
          mode,
          '--module',
          mode === 'Bundler' ? 'ESNext' : mode,
          'consumer.tsx',
        ],
        consumer,
      );
  await writeFile(
    resolve(consumer, 'import-check.mjs'),
    `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ChartLoader, LoadingRegion, SkeletonBlock } from '@dotquilt-internal/react';
import { SkeletonBlock as S } from '@dotquilt-internal/react/skeleton';
import { LoadingRegion as R } from '@dotquilt-internal/react/region';
const {TableLoader:Table}=await import('@dotquilt-internal/react/table');let tableCalls=0;const tableHTML=renderToString(React.createElement(Table,{rows:5,rowHeight:32,targetProvider:()=>{tableCalls++;return null;}}));assert.equal(tableCalls,0);assert.ok(tableHTML.includes('dotquilt-table-loader')&&!tableHTML.includes('targetProvider'));const {ChartLoader:C}=await import('@dotquilt-internal/react/chart');assert.equal(ChartLoader,C);let chartCalls=0;const chartHTML=renderToString(React.createElement(ChartLoader,{variant:'scatter',targetProvider:()=>{chartCalls++;return null;}}));assert.equal(chartCalls,0);assert.ok(chartHTML.includes('variant="scatter"')&&!chartHTML.includes('targetProvider'));
assert.equal(SkeletonBlock,S); assert.equal(LoadingRegion,R);
assert.equal(typeof window,'undefined');assert.equal(typeof document,'undefined');
const require = createRequire(import.meta.url);
const fromAdapter = createRequire(import.meta.resolve('@dotquilt-internal/react'));
const nativeManifest = resolver => realpathSync(resolver.resolve.paths('@dotquilt-internal/core').map(path=>resolve(path,'@dotquilt-internal/core/package.json')).find(existsSync));
assert.equal(nativeManifest(require),nativeManifest(fromAdapter));
const {reactRegionStyles}=await import('@dotquilt-internal/react/server');assert.ok(reactRegionStyles.length);
const [a,b]=await Promise.all(['one','two'].map(async nonce=>renderToString(React.createElement(LoadingRegion,{state:'pending',stylePolicy:{mode:'inline',nonce},placeholder:React.createElement(SkeletonBlock)},React.createElement('input',{defaultValue:nonce})))));
assert.ok(a.includes('nonce="one"')&&!a.includes('nonce="two"'));
assert.ok(b.includes('value="two"')&&!b.includes('value="one"'));
assert.ok(a.includes('motion="paused"')&&a.includes('data-dotquilt-static'));
console.log('pass: DOM-free imports, root/family identity and isolated SSR');
`,
  );
  for (const runtime of ['node', 'bun'])
    await run([runtime, 'import-check.mjs'], consumer);
  if (line !== 'current') continue;
  for (const [name, nativeSource, reactSource] of [
    [
      'skeleton',
      "import {registerSkeletonBlock} from '@dotquilt-internal/core/skeleton';registerSkeletonBlock();document.body.append(document.createElement('dotquilt-skeleton-block'));",
      "import {SkeletonBlock} from '@dotquilt-internal/react/skeleton';import {createElement} from 'react';import {createRoot} from 'react-dom/client';createRoot(document.body).render(createElement(SkeletonBlock));",
    ],
    [
      'region',
      "import {registerLoadingRegion} from '@dotquilt-internal/core/region';registerLoadingRegion();document.body.append(document.createElement('dotquilt-region'));",
      "import {LoadingRegion} from '@dotquilt-internal/react/region';import {createElement} from 'react';import {createRoot} from 'react-dom/client';createRoot(document.body).render(createElement(LoadingRegion,null,'Outcome'));",
    ],
    [
      'availableSlice',
      "import {registerLoadingRegion,registerSkeletonBlock} from '@dotquilt-internal/core';registerLoadingRegion();registerSkeletonBlock();document.body.append(document.createElement('dotquilt-region'),document.createElement('dotquilt-skeleton-block'));",
      "import {LoadingRegion,SkeletonBlock} from '@dotquilt-internal/react';import {createElement} from 'react';import {createRoot} from 'react-dom/client';createRoot(document.body).render(createElement(LoadingRegion,{placeholder:createElement(SkeletonBlock)},'Outcome'));",
    ],
    [
      'skeletonRoot',
      "import {registerSkeletonBlock} from '@dotquilt-internal/core';registerSkeletonBlock();document.body.append(document.createElement('dotquilt-skeleton-block'));",
      "import {SkeletonBlock} from '@dotquilt-internal/react';import {createElement} from 'react';import {createRoot} from 'react-dom/client';createRoot(document.body).render(createElement(SkeletonBlock));",
    ],
    [
      'regionRoot',
      "import {registerLoadingRegion} from '@dotquilt-internal/core';registerLoadingRegion();document.body.append(document.createElement('dotquilt-region'));",
      "import {LoadingRegion} from '@dotquilt-internal/react';import {createElement} from 'react';import {createRoot} from 'react-dom/client';createRoot(document.body).render(createElement(LoadingRegion,null,'Outcome'));",
    ],
  ]) {
    const bytes: Record<string, number> = {};
    for (const [kind, source] of [
      ['native', nativeSource],
      ['react', reactSource],
    ]) {
      const entry = resolve(consumer, `${name}-${kind}.js`);
      await writeFile(entry, source ?? '');
      const result = await Bun.build({
        entrypoints: [entry],
        target: 'browser',
        format: 'esm',
        minify: true,
        external: [
          'react',
          'react-dom',
          'react-dom/client',
          'react/jsx-runtime',
        ],
      });
      if (!result.success || !result.outputs[0])
        throw new Error(`Bundle failed ${name}/${kind}`);
      const code = await result.outputs[0].arrayBuffer();
      bytes[kind ?? ''] = gzipSync(code, { level: 9 }).length;
      await writeFile(
        resolve(output, `${name}-${kind}.min.js`),
        new Uint8Array(code),
      );
    }
    const increment = (bytes.react ?? 0) - (bytes.native ?? 0),
      limit = name === 'availableSlice' ? 4096 : 2048;
    const families =
      name === 'availableSlice'
        ? ['skeleton', 'region']
        : [name?.replace('Root', '')];
    const assets: Record<
      string,
      { family: string; bytes: number; gzip: number }[]
    > = { native: [], react: [] };
    for (const [kind, pkg] of [
      ['native', 'core'],
      ['react', 'react'],
    ] as const)
      for (const family of families) {
        const css = await readFile(
          resolve(
            consumer,
            `node_modules/@dotquilt-internal/${pkg}/dist/${family}.css`,
          ),
        );
        assets[kind]?.push({
          family: family ?? '',
          bytes: css.length,
          gzip: gzipSync(css, { level: 9 }).length,
        });
      }
    const externalNative =
      (bytes.native ?? 0) +
      (assets.native ?? []).reduce((sum, asset) => sum + asset.gzip, 0);
    const externalReact =
      (bytes.react ?? 0) +
      (assets.react ?? []).reduce((sum, asset) => sum + asset.gzip, 0);
    const externalIncrement = externalReact - externalNative;
    sizes[name ?? ''] = {
      ...bytes,
      increment,
      limit,
      external: {
        native: externalNative,
        react: externalReact,
        increment: externalIncrement,
        assets,
      },
      pass: increment <= limit && externalIncrement <= limit,
      peers:
        'React/DOM and JSX runtime external in both bundles; native CSS and React static CSS embedded',
    };
    if (increment > limit)
      failures.push(`${name} React increment exceeds ${limit} B`);
    if (externalIncrement > limit)
      failures.push(`${name} external CSS React increment exceeds ${limit} B`);
  }
}
const files = packed.files.map((entry: { path: string }) => entry.path);
if (
  files.some(
    (file: string) =>
      !/^(dist\/[^.].*\.(js|d\.ts|css)|README\.md|LICENSE|package\.json)$/.test(
        file,
      ),
  )
)
  failures.push('Unexpected React artifact file');
for (const entry of [
  'index',
  'skeleton',
  'region',
  'typing',
  'text',
  'chart',
  'table',
])
  if (
    !hasClientDirective(
      await readFile(resolve(root, `packages/react/dist/${entry}.js`), 'utf8'),
    )
  )
    failures.push(`Missing client directive ${entry}`);
const sources: Record<string, string> = {};
for (const directory of ['packages/react/src', 'packages/core/src'])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  })) {
    const path = `${directory}/${file}`;
    sources[path] = hash(await readFile(resolve(root, path)));
  }
for (const file of [
  'package.json',
  'bun.lock',
  'turbo.json',
  'tsconfig.json',
  'scripts/build.ts',
  'scripts/build-react.ts',
  'scripts/verify-react.ts',
  'packages/core/package.json',
  'packages/react/package.json',
  'packages/react/tsconfig.json',
  'packages/react/README.md',
  'packages/react/LICENSE',
  'tests/react/consumer.tsx',
])
  sources[file] = hash(await readFile(resolve(root, file)));
const report = {
  recordedAt: new Date().toISOString(),
  artifact,
  sha256,
  version: manifest.version,
  native: {
    artifact: native.artifact,
    sha256: native.sha256,
    version: native.version,
  },
  files,
  versions,
  consumers,
  sizes,
  checks,
  environment: {
    ...native.environment,
    verifierBun: Bun.version,
    compilerLines: ['7.0.2', '5.7.3'],
  },
  accounting:
    'Matched production bundles with React/DOM/JSX peers external. Default inline and nonce modes share the embedded JS closure. External mode additionally counts each unique family stylesheet response at gzip level 9; static/SSR repeated output is a separate gate. availableSlice covers two implemented exports, not the future complete catalog.',
  sources,
  failures,
  result: failures.length ? 'fail' : 'pass',
};
await writeFile(
  resolve(output, 'packed-react-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify({ sha256, consumers, sizes, failures }, null, 2));
if (failures.length) process.exitCode = 1;
