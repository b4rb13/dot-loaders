// Size report: what each component adds to an app bundle (minified + gzip).
//
//   bun run size            print the report (run `bun run build` first)
//
// Each row bundles the smallest real usage (import + register, or a framework
// package's component) from the workspace build with Bun, minified, default
// inline styles, with the framework itself left external. Code an entry loads only
// later (a dynamic import, such as the region's reveal) is split off: the
// sizes and budgets count what loads up front (the entry and the chunks it
// imports statically, compressed together as Vite and webpack would bundle
// them), and "later" shows the rest.
//
// Budgets (AUDIT.md decision 1): scripts/size-budgets.json holds, per entry,
// the most gzip bytes the native usage and each framework usage (native
// included) may reach: the size when they were set plus about 15% headroom. This script
// fails when an entry goes over. Raising a budget is a deliberate change made
// in a PR that says why.
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { BunPlugin } from 'bun';
import { compile, compileModule } from 'svelte/compiler';

/** Compiles Svelte components for the browser, as an app's bundler would. */
const svelte: BunPlugin = {
  name: 'svelte',
  setup(build) {
    build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => ({
      contents: compile(await Bun.file(path).text(), {
        filename: path,
        generate: 'client',
      }).js.code,
      loader: 'js',
    }));
    build.onLoad({ filter: /\.svelte\.js$/ }, async ({ path }) => ({
      contents: compileModule(await Bun.file(path).text(), {
        filename: path,
        generate: 'client',
      }).js.code,
      loader: 'js',
    }));
  },
};

const root = resolve(import.meta.dir, '..');
const work = resolve(root, '.artifacts/size');

/** Framework packages, each measured with its framework left external. */
const frameworks = [
  {
    key: 'react',
    label: 'React',
    name: '@dotquilt/react',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  { key: 'vue', label: 'Vue', name: '@dotquilt/vue', external: ['vue'] },
  {
    key: 'svelte',
    label: 'Svelte',
    name: '@dotquilt/svelte',
    external: ['svelte', 'svelte/*'],
  },
] as const;

// Component, its native usage, and its entry in every framework package
// (empty: the package root, for everything).
const components: [name: string, native: string, entry: string][] = [
  [
    'SkeletonBlock',
    "import { registerSkeletonBlock } from 'dotquilt/skeleton'; registerSkeletonBlock();",
    'skeleton',
  ],
  [
    'SkeletonLine',
    "import { registerSkeletonLine } from 'dotquilt/skeleton'; registerSkeletonLine();",
    'skeleton',
  ],
  [
    'SkeletonCircle',
    "import { registerSkeletonCircle } from 'dotquilt/skeleton'; registerSkeletonCircle();",
    'skeleton',
  ],
  [
    'SkeletonText',
    "import { registerSkeletonText } from 'dotquilt/skeleton'; registerSkeletonText();",
    'skeleton',
  ],
  [
    'TypingDots',
    "import { registerTypingDots } from 'dotquilt/typing'; registerTypingDots();",
    'typing',
  ],
  [
    'TextLoader',
    "import { registerTextLoader } from 'dotquilt/text'; registerTextLoader();",
    'text',
  ],
  [
    'ChartLoader',
    "import { registerChartLoader } from 'dotquilt/chart'; registerChartLoader();",
    'chart',
  ],
  [
    'TableLoader',
    "import { registerTableLoader } from 'dotquilt/table'; registerTableLoader();",
    'table',
  ],
  [
    'LoadingRegion',
    "import { registerLoadingRegion } from 'dotquilt/region'; registerLoadingRegion();",
    'region',
  ],
  [
    'Everything',
    "import { registerAll } from 'dotquilt/register-all'; registerAll();",
    '',
  ],
];

/** Gzip bytes the usage loads up front, and what it loads later on its own. */
async function gzipSize(name: string, source: string, external: string[] = []) {
  const forSvelte = external.includes('svelte');
  const entry = resolve(work, `${name}.ts`);
  await writeFile(entry, source);
  const build = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    format: 'esm',
    minify: true,
    splitting: true,
    external,
    ...(forSvelte ? { plugins: [svelte], conditions: ['svelte'] } : {}),
  });
  if (!build.success || !build.outputs[0])
    throw new Error(`Cannot bundle ${name}:\n${build.logs.join('\n')}`);
  const files = new Map<string, string>();
  for (const output of build.outputs)
    files.set(basename(output.path), await output.text());
  // Up front: the entry and every chunk it reaches through static imports.
  const upFront = new Set<string>();
  const visit = (file: string) => {
    if (upFront.has(file)) return;
    upFront.add(file);
    for (const [, chunk = ''] of (files.get(file) ?? '').matchAll(
      /(?:from|import)\s*"\.\/([^"]+)"/g,
    ))
      visit(chunk);
  };
  visit(basename(build.outputs[0].path));
  const gzip = (texts: string[]) =>
    texts.length ? gzipSync(texts.join('\n'), { level: 9 }).length : 0;
  return {
    now: gzip([...upFront].map((file) => files.get(file) ?? '')),
    later: gzip(
      [...files].filter(([file]) => !upFront.has(file)).map(([, t]) => t),
    ),
  };
}

await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });
const budgetFile = resolve(import.meta.dir, 'size-budgets.json');
const budgets: Record<string, Record<string, number>> = existsSync(budgetFile)
  ? await Bun.file(budgetFile).json()
  : {};
const rows: Record<string, string | number>[] = [];
const overruns: string[] = [];
const left = (bytes: number, budget?: number) =>
  budget === undefined ? '—' : `${Math.round((1 - bytes / budget) * 100)}%`;
for (const [name, native, entry] of components) {
  const budget = budgets[name];
  const nativeSize = await gzipSize(`${name}-native`, native);
  const row: Record<string, string | number> = {
    component: name,
    'native gzip (B)': nativeSize.now,
    'native left': left(nativeSize.now, budget?.native),
  };
  if (budget?.native !== undefined && nativeSize.now > budget.native)
    overruns.push(`${name} (native): ${nativeSize.now} B > ${budget.native} B`);
  for (const framework of frameworks) {
    const usage = entry
      ? `export { ${name} } from '${framework.name}/${entry}';`
      : `export * from '${framework.name}';`;
    const { now } = await gzipSize(
      `${name}-${framework.key}`,
      `${native}\n${usage}`,
      [...framework.external],
    );
    const limit = budget?.[framework.key];
    if (limit !== undefined && now > limit)
      overruns.push(`${name} (${framework.label}): ${now} B > ${limit} B`);
    row[`${framework.label} gzip (B)`] = now;
    row[`${framework.label} left`] = left(now, limit);
  }
  row['later (B)'] = nativeSize.later || '—';
  rows.push(row);
}
console.table(rows);
if (!Object.keys(budgets).length)
  console.log('No budgets set (scripts/size-budgets.json); report only.');
if (overruns.length) {
  console.error(`Over budget:\n  ${overruns.join('\n  ')}`);
  process.exit(1);
}
