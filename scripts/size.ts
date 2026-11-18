// Size report: what each component adds to an app bundle (minified + gzip).
//
//   bun run size            print the report (run `bun run build` first)
//
// Each row bundles the smallest real usage (import + register, or the React
// component) from the workspace build with Bun, minified, default inline
// styles. "React adds" is the React entry minus the native one, with react and
// react-dom left external.
//
// Budgets are not enforced yet: the owner is deciding them (AUDIT.md decision 1).
// When decided, put them in scripts/size-budgets.json as
// { "<component>": <max total gzip bytes> } and this script fails on overruns.
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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

async function gzipSize(name: string, source: string, external: string[] = []) {
  const entry = resolve(work, `${name}.ts`);
  await writeFile(entry, source);
  const build = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    format: 'esm',
    minify: true,
    external,
  });
  if (!build.success || !build.outputs[0])
    throw new Error(`Cannot bundle ${name}:\n${build.logs.join('\n')}`);
  const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
  return gzipSync(bytes, { level: 9 }).length;
}

await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });
const budgetFile = resolve(import.meta.dir, 'size-budgets.json');
const budgets: Record<string, number> = existsSync(budgetFile)
  ? await Bun.file(budgetFile).json()
  : {};
const rows: Record<string, string | number>[] = [];
const overruns: string[] = [];
for (const [name, native, react] of components) {
  const nativeBytes = await gzipSize(`${name}-native`, native);
  const reactBytes = await gzipSize(`${name}-react`, `${native}\n${react}`, [
    'react',
    'react-dom',
    'react/jsx-runtime',
  ]);
  const budget = budgets[name];
  if (budget !== undefined && nativeBytes > budget)
    overruns.push(`${name}: ${nativeBytes} B > ${budget} B`);
  rows.push({
    component: name,
    'native gzip (B)': nativeBytes,
    'React adds (B)': reactBytes - nativeBytes,
    budget: budget ?? '—',
  });
}
console.table(rows);
if (!Object.keys(budgets).length)
  console.log('No budgets set yet (scripts/size-budgets.json); report only.');
if (overruns.length) {
  console.error(`Over budget:\n  ${overruns.join('\n  ')}`);
  process.exit(1);
}
