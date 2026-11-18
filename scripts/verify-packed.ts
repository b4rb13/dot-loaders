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
      TMPDIR: '/private/tmp',
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
const pack = JSON.parse(
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
)[0];
const tarball = resolve(artifacts, pack.filename);
const files = pack.files.map((f: { path: string }) => f.path) as string[];
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
    dependencies: { '@dotquilt-internal/core': `file:${tarball}` },
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
const installed = resolve(consumer, 'node_modules/@dotquilt-internal/core');
const installedManifest = JSON.parse(
  await readFile(resolve(installed, 'package.json'), 'utf8'),
);
if (
  !installedManifest.private ||
  Object.keys(installedManifest.dependencies ?? {}).length
)
  throw new Error('Private/runtime dependency invariant failed');
for (const target of [consumer, bunConsumer]) {
  await writeFile(
    resolve(target, 'import-check.mjs'),
    `for (const path of ['', '/server', '/animations', '/skeleton', '/region', '/register-all', '/animations/skeleton','/table','/animations/table']) await import('@dotquilt-internal/core'+path); for (const path of ['/internal/table-static','/internal/table-model','/dist/internal/table-model.js']) { let rejected=false; try {await import('@dotquilt-internal/core'+path)} catch {rejected=true} if(!rejected) throw Error('Private implementation path exported: '+path); }`,
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
    "import {registerSkeletonBlock} from '@dotquilt-internal/core/skeleton';registerSkeletonBlock();document.body.append(document.createElement('dotquilt-skeleton-block'));",
    skeletonClosureLimit,
  ],
  [
    'region',
    "import {registerLoadingRegion} from '@dotquilt-internal/core/region';registerLoadingRegion();document.body.append(document.createElement('dotquilt-region'));",
    regionClosureLimit,
  ],
  ['server', "export * from '@dotquilt-internal/core/server';", 12288],
  [
    'skeletonRoot',
    "import {registerSkeletonBlock} from '@dotquilt-internal/core';registerSkeletonBlock();document.body.append(document.createElement('dotquilt-skeleton-block'));",
    skeletonClosureLimit,
  ],
  [
    'regionRoot',
    "import {registerLoadingRegion} from '@dotquilt-internal/core';registerLoadingRegion();document.body.append(document.createElement('dotquilt-region'));",
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
const buildInputs: Record<string, string> = {};
for (const path of [
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'packages/core/package.json',
  'packages/core/tsconfig.json',
  'scripts/build.ts',
  'scripts/verify-packed.ts',
  'scripts/verify-clean.ts',
  'scripts/verify-m1.ts',
  'docs/implementation/m1-requirement-review.json',
  'docs/implementation/requirements.json',
  'tests/browser/gaps.spec.ts',
  'tests/browser/m2.spec.ts',
  'tests/m2/client.ts',
  'tests/m2/trace-client.ts',
  'scripts/bench/run.ts',
  'scripts/bench/trace.ts',
  'tests/bench/trace.test.ts',
  'docs/implementation/m2/trace-manifest.json',
  'packages/core/test/dense.test.ts',
  'packages/core/test/fixtures/recipe-commands.json',
  'docs/implementation/m2/benchmark-manifest.json',
  'tests/types/consumer.ts',
  'tests/browser/native.spec.ts',
  'tests/browser/server.ts',
  'tests/browser/init.js',
  'tests/browser/resources.spec.ts',
  'playwright.config.ts',
  'packages/core/test/contracts.test.ts',
]) {
  buildInputs[path] = createHash('sha256')
    .update(await readFile(resolve(root, path)))
    .digest('hex');
}
const sourceFiles: Record<string, string> = {};
for await (const file of new Bun.Glob('**/*').scan(
  resolve(root, 'packages/core/src'),
)) {
  const path = resolve(root, 'packages/core/src', file);
  if (await Bun.file(path).exists())
    sourceFiles[`packages/core/src/${file}`] = createHash('sha256')
      .update(await readFile(path))
      .digest('hex');
}
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
  buildInputs,
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
  sourceFiles,
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
if (
  Object.values(sizes).some((s) => s.gzip > s.limit) ||
  Object.entries(externalModeGzip).some(
    ([name, bytes]) =>
      bytes >
      (name.startsWith('skeleton') ? skeletonClosureLimit : regionClosureLimit),
  )
) {
  console.error('Closure size gate failed; report retained.');
  process.exitCode = 1;
}
