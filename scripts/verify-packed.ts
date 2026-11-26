import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { packResults } from './npm-pack.js';

// Full-interface M4 amendment; historical reports retain their original ceilings.
const skeletonClosureLimit = 6144;
const regionClosureLimit = 8192;
const skeletonBudgetDecision =
  'https://github.com/b4rb13/dot-loaders/issues/9#issuecomment-6226666680';

const root = resolve(import.meta.dir, '..');
const artifacts = resolve(root, '.artifacts');
await mkdir(artifacts, { recursive: true });
async function run(args: string[], cwd: string) {
  const result = Bun.spawn(args, {
    cwd,
    env: {
      ...process.env,
      npm_config_cache: resolve(artifacts, 'npm-cache'),
      BUN_INSTALL_CACHE_DIR: resolve(artifacts, 'bun-cache'),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = await new Response(result.stdout).text();
  const stderr = await new Response(result.stderr).text();
  if (await result.exited)
    throw new Error(`${args[0]} failed: ${stdout}\n${stderr}`);
  return stdout;
}
const [pack] = packResults<{ filename: string; files: { path: string }[] }>(
  await run(
    [
      'npm',
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      artifacts,
    ],
    resolve(root, 'packages/core'),
  ),
);
if (!pack) throw new Error('npm pack printed nothing for packages/core');
const tarball = resolve(artifacts, pack.filename);
const files = pack.files.map((f) => f.path);
if (
  files.some(
    (f) =>
      !f.startsWith('dist/') &&
      !['README.md', 'LICENSE', 'package.json'].includes(f),
  )
)
  throw new Error('Unexpected package contents');
const consumer = await mkdtemp(resolve(tmpdir(), 'dotquilt-consumer-'));
await writeFile(
  resolve(consumer, 'package.json'),
  JSON.stringify({
    private: true,
    type: 'module',
    dependencies: { dotquilt: `file:${tarball}` },
  }),
);
await run(
  [
    'npm',
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--package-lock=false',
  ],
  consumer,
);
const bunConsumer = await mkdtemp(resolve(tmpdir(), 'dotquilt-bun-consumer-'));
await writeFile(
  resolve(bunConsumer, 'package.json'),
  await readFile(resolve(consumer, 'package.json')),
);
await run(['bun', 'install', '--ignore-scripts'], bunConsumer);
const installed = resolve(consumer, 'node_modules/dotquilt');
const installedManifest = JSON.parse(
  await readFile(resolve(installed, 'package.json'), 'utf8'),
);
if (Object.keys(installedManifest.dependencies ?? {}).length)
  throw new Error('Runtime dependency invariant failed');
for (const target of [consumer, bunConsumer]) {
  await writeFile(
    resolve(target, 'import-check.mjs'),
    `for (const path of ['', '/server', '/animations', '/skeleton', '/region', '/register-all', '/animations/skeleton','/table','/animations/table']) await import('dotquilt'+path); for (const path of ['/internal/table-static','/internal/table-model','/dist/internal/table-model.js']) { let rejected=false; try {await import('dotquilt'+path)} catch {rejected=true} if(!rejected) throw Error('Private implementation path exported: '+path); }`,
  );
  await run(['node', 'import-check.mjs'], target);
  await run(['bun', 'import-check.mjs'], target);
}
const typeSource = await readFile(
  resolve(root, 'tests/types/consumer.ts'),
  'utf8',
);
for (const file of ['native.ts', 'geometry.ts', 'recipes.ts', 'custom.ts']) {
  await mkdir(resolve(consumer, 'examples/api'), { recursive: true });
  await copyFile(
    resolve(root, 'examples/api', file),
    resolve(consumer, 'examples/api', file),
  );
}
await writeFile(resolve(consumer, 'consumer.ts'), typeSource);
for (const compiler of ['typescript', 'typescript-min'])
  for (const mode of ['Bundler', 'NodeNext']) {
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
        '--moduleResolution',
        mode,
        '--module',
        mode === 'Bundler' ? 'ESNext' : mode,
        'consumer.ts',
      ],
      consumer,
    );
  }
const sizes: Record<
  string,
  { minified: number; gzip: number; brotli: number; limit: number }
> = {};
for (const [name, source, limit] of [
  [
    'skeleton',
    "import {registerSkeletonBlock} from 'dotquilt/skeleton';registerSkeletonBlock();document.body.append(document.createElement('dotquilt-skeleton-block'));",
    skeletonClosureLimit,
  ],
  [
    'region',
    "import {registerLoadingRegion} from 'dotquilt/region';registerLoadingRegion();document.body.append(document.createElement('dotquilt-region'));",
    regionClosureLimit,
  ],
  ['server', "export * from 'dotquilt/server';", 12288],
  [
    'skeletonRoot',
    "import {registerSkeletonBlock} from 'dotquilt';registerSkeletonBlock();document.body.append(document.createElement('dotquilt-skeleton-block'));",
    skeletonClosureLimit,
  ],
  [
    'regionRoot',
    "import {registerLoadingRegion} from 'dotquilt';registerLoadingRegion();document.body.append(document.createElement('dotquilt-region'));",
    regionClosureLimit,
  ],
] as const) {
  const entry = resolve(consumer, `${name}-entry.ts`);
  await writeFile(entry, source);
  const bundle = await Bun.build({
    entrypoints: [entry],
    minify: true,
    target: 'browser',
    format: 'esm',
  });
  if (!bundle.success) throw new Error('Consumer bundling failed');
  const output = bundle.outputs[0];
  if (!output) throw new Error('Missing consumer output');
  const bytes = new Uint8Array(await output.arrayBuffer());
  if (
    new TextDecoder().decode(bytes).includes('dotquilt.view.v1') ||
    new TextDecoder().decode(bytes).includes('getContext')
  )
    throw new Error('Dense renderer leaked into selective public closure');
  await writeFile(resolve(artifacts, `${name}-consumer.js`), bytes);
  sizes[name] = {
    minified: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes).length,
    limit,
  };
}
const externalStyles = {
  skeleton: gzipSync(await readFile(resolve(installed, 'dist/skeleton.css')), {
    level: 9,
  }).length,
  region: gzipSync(await readFile(resolve(installed, 'dist/region.css')), {
    level: 9,
  }).length,
};
const externalModeGzip = {
  skeleton: (sizes.skeleton?.gzip ?? 0) + externalStyles.skeleton,
  region: (sizes.region?.gzip ?? 0) + externalStyles.region,
  skeletonRoot: (sizes.skeletonRoot?.gzip ?? 0) + externalStyles.skeleton,
  regionRoot: (sizes.regionRoot?.gzip ?? 0) + externalStyles.region,
};
const hash = createHash('sha256')
  .update(await readFile(tarball))
  .digest('hex');
const report = {
  artifact: tarball,
  sha256: hash,
  version: installedManifest.version,
  provisionalName: installedManifest.name,
  sourceCommit: (await run(['git', 'rev-parse', 'HEAD'], root)).trim(),
  dirtyWorkspace: true,
  environment: {
    bun: Bun.version,
    node: (await run(['node', '--version'], root)).trim(),
    platform: process.platform,
    arch: process.arch,
  },
  consumer,
  bunConsumer,
  files,
  sizes,
  externalStylesGzip: externalStyles,
  externalModeGzip,
  budgetPolicy: {
    skeletonClosureLimit,
    previousSkeletonClosureLimit: 4608,
    regionClosureLimit,
    previousRegionClosureLimit: 6144,
    regionDecision:
      'https://github.com/b4rb13/dot-loaders/issues/9#issuecomment-6295086603',
    decision: skeletonBudgetDecision,
    scope:
      'Block and Region family/named-root consumers; every CSS mode; full approved API. Other M4 faces use the separately enforced catalog gate.',
    otherLimitsChanged: true,
  },
  measurement: {
    bundler: `Bun ${Bun.version}`,
    target: 'browser',
    minify: true,
    format: 'esm',
    gzip: { level: 9 },
    brotli: 'node:zlib defaults',
    closure:
      'working selective registration + appended host; root and family entries; external CSS responses compressed separately and added',
  },
  limitations: [
    'Physical reference timing/heap protocol and actual browser-floor/manual-AT matrix remain unverified.',
    'Private M2 dense proof is diagnostic; no full dense catalog, React/Next/site/release validation claimed.',
    'Source commit is base; current implementation is uncommitted. Artifact hash identifies tested bytes.',
  ],
};
const history = resolve(artifacts, 'history', hash);
await mkdir(history, { recursive: true });
await copyFile(tarball, resolve(history, pack.filename));
await writeFile(
  resolve(history, 'packed-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
  resolve(artifacts, 'packed-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(resolve(artifacts, 'consumer-path'), consumer);
console.log(
  JSON.stringify(
    { sha256: hash, sizes, consumer, files: files.length },
    null,
    2,
  ),
);
