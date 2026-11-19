// Size report: what each component adds to an app bundle (minified + gzip).
//
//   bun run size            print the report (run `bun run build` first)
//
// Each row bundles the smallest real usage (import + register, or the React
// component) from the workspace build with Bun, minified, default inline
// styles, with react and react-dom left external. Code an entry loads only
// later (a dynamic import, such as the region's reveal) is split off: the
// sizes and budgets count what loads up front (the entry and the chunks it
// imports statically, compressed together as Vite and webpack would bundle
// them), and "later" shows the rest.
//
// Budgets (AUDIT.md decision 1): scripts/size-budgets.json holds, per entry,
// the most gzip bytes the native usage and the React usage (native included)
// may reach: the size when they were set plus about 15% headroom. This script
// fails when an entry goes over. Raising a budget is a deliberate change made
// in a PR that says why.
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(import.meta.dir, '..');
const work = resolve(root, '.artifacts/size');

const components: [name: string, native: string, react: string][] = [
  [
    'SkeletonBlock',
    "import { registerSkeletonBlock } from '@dotquilt-internal/core/skeleton'; registerSkeletonBlock();",
    "export { SkeletonBlock } from '@dotquilt-internal/react/skeleton';",
  ],
  [
    'SkeletonLine',
    "import { registerSkeletonLine } from '@dotquilt-internal/core/skeleton'; registerSkeletonLine();",
    "export { SkeletonLine } from '@dotquilt-internal/react/skeleton';",
  ],
  [
    'SkeletonCircle',
    "import { registerSkeletonCircle } from '@dotquilt-internal/core/skeleton'; registerSkeletonCircle();",
    "export { SkeletonCircle } from '@dotquilt-internal/react/skeleton';",
  ],
  [
    'SkeletonText',
    "import { registerSkeletonText } from '@dotquilt-internal/core/skeleton'; registerSkeletonText();",
    "export { SkeletonText } from '@dotquilt-internal/react/skeleton';",
  ],
  [
    'TypingDots',
    "import { registerTypingDots } from '@dotquilt-internal/core/typing'; registerTypingDots();",
    "export { TypingDots } from '@dotquilt-internal/react/typing';",
  ],
  [
    'TextLoader',
    "import { registerTextLoader } from '@dotquilt-internal/core/text'; registerTextLoader();",
    "export { TextLoader } from '@dotquilt-internal/react/text';",
  ],
  [
    'ChartLoader',
    "import { registerChartLoader } from '@dotquilt-internal/core/chart'; registerChartLoader();",
    "export { ChartLoader } from '@dotquilt-internal/react/chart';",
  ],
  [
    'TableLoader',
    "import { registerTableLoader } from '@dotquilt-internal/core/table'; registerTableLoader();",
    "export { TableLoader } from '@dotquilt-internal/react/table';",
  ],
  [
    'LoadingRegion',
    "import { registerLoadingRegion } from '@dotquilt-internal/core/region'; registerLoadingRegion();",
    "export { LoadingRegion } from '@dotquilt-internal/react/region';",
  ],
  [
    'Everything',
    "import { registerAll } from '@dotquilt-internal/core/register-all'; registerAll();",
    "export * from '@dotquilt-internal/react';",
  ],
];

/** Gzip bytes the usage loads up front, and what it loads later on its own. */
async function gzipSize(name: string, source: string, external: string[] = []) {
  const entry = resolve(work, `${name}.ts`);
  await writeFile(entry, source);
  const build = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    format: 'esm',
    minify: true,
    splitting: true,
    external,
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
const budgets: Record<string, { native: number; react: number }> = existsSync(
  budgetFile,
)
  ? await Bun.file(budgetFile).json()
  : {};
const rows: Record<string, string | number>[] = [];
const overruns: string[] = [];
const left = (bytes: number, budget?: number) =>
  budget === undefined ? '—' : `${Math.round((1 - bytes / budget) * 100)}%`;
for (const [name, native, react] of components) {
  const nativeSize = await gzipSize(`${name}-native`, native);
  const reactSize = await gzipSize(`${name}-react`, `${native}\n${react}`, [
    'react',
    'react-dom',
    'react/jsx-runtime',
  ]);
  const nativeBytes = nativeSize.now,
    reactBytes = reactSize.now;
  const budget = budgets[name];
  if (budget && nativeBytes > budget.native)
    overruns.push(`${name} (native): ${nativeBytes} B > ${budget.native} B`);
  if (budget && reactBytes > budget.react)
    overruns.push(`${name} (React): ${reactBytes} B > ${budget.react} B`);
  rows.push({
    component: name,
    'native gzip (B)': nativeBytes,
    'native left': left(nativeBytes, budget?.native),
    'React gzip (B)': reactBytes,
    'React left': left(reactBytes, budget?.react),
    'later (B)': nativeSize.later || '—',
  });
}
console.table(rows);
if (!Object.keys(budgets).length)
  console.log('No budgets set (scripts/size-budgets.json); report only.');
if (overruns.length) {
  console.error(`Over budget:\n  ${overruns.join('\n  ')}`);
  process.exit(1);
}
