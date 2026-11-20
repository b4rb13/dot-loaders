import { afterAll, beforeAll, expect, test } from 'bun:test';
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { hasClientDirective } from './client-directive.js';

// What a published package guarantees beyond the workspace build, checked
// without installing tarballs:
// - the packed file list and private manifests;
// - every JavaScript export imports in Node (which needs fully specified
//   relative paths) and in Bun, and private paths stay unreachable;
// - consumer types check on the newest and oldest supported TypeScript, in
//   Bundler and NodeNext resolution;
// - selective skeleton/region bundles leave the dense renderer out.
// The browser suites already run against the same dist files.
const root = resolve(import.meta.dir, '..');
// A folder outside the repo, like a real consumer: no tsconfig above it. Its
// node_modules links to the workspace, so packages resolve to the dist build.
let work = '';

async function run(command: string[], cwd = work) {
  const child = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { out, err, code };
}

beforeAll(async () => {
  work = await mkdtemp(resolve(tmpdir(), 'dotquilt-pack-smoke-'));
  await symlink(resolve(root, 'node_modules'), resolve(work, 'node_modules'));
  await writeFile(
    resolve(work, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  await cp(resolve(root, 'examples/api'), resolve(work, 'examples/api'), {
    recursive: true,
  });
  await cp(
    resolve(root, 'tests/types/consumer.ts'),
    resolve(work, 'consumer.ts'),
  );
  await writeFile(
    resolve(work, 'consumer.tsx'),
    (await readFile(resolve(root, 'tests/react/consumer.tsx'), 'utf8')).replace(
      '../../examples/api/react',
      './examples/api/react.js',
    ),
  );
});
afterAll(() => rm(work, { recursive: true, force: true }));

for (const name of ['core', 'react'] as const) {
  const directory = resolve(root, 'packages', name);
  const manifest = require(resolve(directory, 'package.json')) as {
    name: string;
    private?: boolean;
    exports: Record<string, unknown>;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };

  test(`${name}: the manifest stays private with only the expected dependencies`, () => {
    expect(manifest.private).toBe(true);
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(
      name === 'core' ? [] : ['dotquilt'],
    );
    expect(Object.keys(manifest.peerDependencies ?? {}).sort()).toEqual(
      name === 'core' ? [] : ['react', 'react-dom'],
    );
  });

  test(`${name}: the packed tarball holds only dist, the README, LICENSE and package.json`, async () => {
    const { out, err, code } = await run(
      ['npm', 'pack', '--dry-run', '--json', '--ignore-scripts'],
      directory,
    );
    expect(code, err).toBe(0);
    const files = (JSON.parse(out)[0].files as { path: string }[]).map(
      (file) => file.path,
    );
    expect(
      files.filter(
        (file) =>
          !file.startsWith('dist/') &&
          !['README.md', 'LICENSE', 'package.json'].includes(file),
      ),
    ).toEqual([]);
    expect(files).toContain('dist/index.js');
  }, 30_000);

  test(`${name}: dist imports stay inside the package and reach only allowed packages`, async () => {
    const dist = resolve(directory, 'dist');
    const core = require(resolve(root, 'packages/core/package.json')) as {
      exports: Record<string, unknown>;
    };
    const problems: string[] = [];
    let scanned = 0;
    for await (const file of new Bun.Glob('**/*.{js,d.ts}').scan({
      cwd: dist,
      onlyFiles: true,
    })) {
      const path = resolve(dist, file);
      const code = await readFile(path, 'utf8');
      scanned++;
      for (const [, specifier = ''] of code.matchAll(
        /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g,
      )) {
        if (specifier.startsWith('.')) {
          const target = resolve(path, '..', specifier);
          if (
            !target.startsWith(`${dist}/`) ||
            !(await Bun.file(target).exists())
          )
            problems.push(`${file}: ${specifier} escapes dist or is missing`);
        } else if (name === 'react' && specifier.startsWith('dotquilt')) {
          const entry = specifier.slice('dotquilt'.length);
          if (!Object.hasOwn(core.exports, entry ? `.${entry}` : '.'))
            problems.push(`${file}: ${specifier} is not a core export`);
        } else if (
          name === 'core' ||
          ![
            'react',
            'react/jsx-runtime',
            'react-dom',
            'react-dom/client',
          ].includes(specifier)
        )
          problems.push(`${file}: unexpected dependency ${specifier}`);
      }
    }
    expect(scanned).toBeGreaterThan(10);
    expect(problems).toEqual([]);
  });

  test(`${name}: every JavaScript export imports in Node and Bun; private paths do not`, async () => {
    const subpaths = Object.keys(manifest.exports)
      .filter((key) => !key.includes('*') && !key.endsWith('.css'))
      .map((key) => key.slice(1));
    const script = resolve(work, `import-${name}.mjs`);
    await writeFile(
      script,
      `const name = '${manifest.name}';
for (const path of ${JSON.stringify(subpaths)}) await import(name + path);
for (const path of ['/internal/table-model', '/dist/index.js']) {
  let rejected = false;
  try { await import(name + path); } catch { rejected = true; }
  if (!rejected) throw new Error('private path imported: ' + path);
}`,
    );
    for (const runtime of ['node', 'bun']) {
      const { err, code } = await run([runtime, script]);
      expect(code, `${runtime}: ${err}`).toBe(0);
    }
  }, 30_000);
}

test('consumer types check on TypeScript 7 and 5.7 with Bundler and NodeNext resolution', async () => {
  const runs = [];
  for (const compiler of ['typescript', 'typescript-min'])
    for (const mode of ['Bundler', 'NodeNext'])
      for (const file of ['consumer.ts', 'consumer.tsx'])
        runs.push(
          run([
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
            // Only React's types; the repo's Bun types would clash with DOM.
            '--types',
            'react',
            '--moduleResolution',
            mode,
            '--module',
            mode === 'Bundler' ? 'ESNext' : mode,
            file,
          ]).then((result) => ({
            ...result,
            label: `${compiler} ${mode} ${file}`,
          })),
        );
  const failures = (await Promise.all(runs))
    .filter((result) => result.code !== 0)
    .map((result) => `${result.label}\n${result.out}${result.err}`);
  expect(failures).toEqual([]);
}, 120_000);

test('selective skeleton and region bundles leave the dense renderer out', async () => {
  for (const [name, source] of [
    [
      'skeleton',
      "import {registerSkeletonBlock} from 'dotquilt/skeleton';registerSkeletonBlock();",
    ],
    [
      'region',
      "import {registerLoadingRegion} from 'dotquilt/region';registerLoadingRegion();",
    ],
    [
      'skeleton-root',
      "import {registerSkeletonBlock} from 'dotquilt';registerSkeletonBlock();",
    ],
    [
      'region-root',
      "import {registerLoadingRegion} from 'dotquilt';registerLoadingRegion();",
    ],
  ] as const) {
    const entry = resolve(work, `${name}-entry.ts`);
    await writeFile(entry, source);
    const bundle = await Bun.build({
      entrypoints: [entry],
      minify: true,
      target: 'browser',
      format: 'esm',
    });
    expect(bundle.success).toBe(true);
    const code = (await bundle.outputs[0]?.text()) ?? '';
    expect(code.length).toBeGreaterThan(0);
    expect(
      code.includes('dotquilt.view.v1') || code.includes('getContext'),
    ).toBe(false);
  }
}, 30_000);

// Each loader carries only its own styles: TypingDots, TextLoader and the
// region don't bring the skeletons' stylesheets (their glow layer's rule),
// and TextLoader doesn't bring the region's refresh cue.
test('typing, text and region bundles leave the skeleton stylesheets out', async () => {
  for (const [name, source, absent] of [
    [
      'typing',
      "import {registerTypingDots} from 'dotquilt/typing';registerTypingDots();",
      [':host .pulse{', '--dotquilt-refresh-gap'],
    ],
    [
      'text',
      "import {registerTextLoader} from 'dotquilt/text';registerTextLoader();",
      [':host .pulse{', '--dotquilt-refresh-gap'],
    ],
    [
      'region-only',
      "import {registerLoadingRegion} from 'dotquilt/region';registerLoadingRegion();",
      [':host .pulse{'],
    ],
  ] as const) {
    const entry = resolve(work, `${name}-styles-entry.ts`);
    await writeFile(entry, source);
    const bundle = await Bun.build({
      entrypoints: [entry],
      minify: true,
      target: 'browser',
      format: 'esm',
    });
    expect(bundle.success).toBe(true);
    const code = (await bundle.outputs[0]?.text()) ?? '';
    for (const text of absent)
      expect(code.includes(text), `${name}: ${text}`).toBe(false);
  }
}, 30_000);

// Only a region hands a skeleton or TypingDots over, so the dissolve and the
// morph's mark reading are the region's code, not theirs.
test('skeleton and typing bundles leave the region handoff out', async () => {
  for (const [name, source] of [
    [
      'block',
      "import {registerSkeletonBlock} from 'dotquilt/skeleton';registerSkeletonBlock();",
    ],
    [
      'text-skeleton',
      "import {registerSkeletonText} from 'dotquilt/skeleton';registerSkeletonText();",
    ],
    [
      'typing',
      "import {registerTypingDots} from 'dotquilt/typing';registerTypingDots();",
    ],
  ] as const) {
    const entry = resolve(work, `${name}-handoff-entry.ts`);
    await writeFile(entry, source);
    const bundle = await Bun.build({
      entrypoints: [entry],
      minify: true,
      target: 'browser',
      format: 'esm',
    });
    expect(bundle.success).toBe(true);
    const code = (await bundle.outputs[0]?.text()) ?? '';
    expect(code.length).toBeGreaterThan(0);
    // The dissolve's SVG pattern, and the morph marks' symbol. (The skeleton
    // stylesheet still styles the dissolve's layer, which the region adds.)
    for (const text of ['userSpaceOnUse', 'dotquilt.morph-marks'])
      expect(code.includes(text), `${name}: ${text}`).toBe(false);
  }
}, 30_000);

// Server components may import the adapter directly; the directive is what
// keeps its hooks on the client side of that boundary.
test('react: every component entry keeps its client directive', async () => {
  for (const entry of [
    'index',
    'skeleton',
    'region',
    'typing',
    'text',
    'chart',
    'table',
  ])
    expect(
      hasClientDirective(
        await readFile(
          resolve(root, `packages/react/dist/${entry}.js`),
          'utf8',
        ),
      ),
      entry,
    ).toBe(true);
});
