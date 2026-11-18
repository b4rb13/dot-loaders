import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chartStyles } from '../packages/core/src/chart-styles.js';
import { regionStyles, skeletonStyles } from '../packages/core/src/styles';
import { tableStyles } from '../packages/core/src/table-styles.js';
import { textStyles } from '../packages/core/src/text-styles.js';
import {
  reactRegionStyles,
  reactSkeletonMarkStyles,
  reactSkeletonStyles,
} from '../packages/react/src/server';
import { skeletonSheet } from './skeleton-sheet.js';

const cwd = resolve(import.meta.dir, '../packages/react');
await rm(resolve(cwd, 'dist'), { recursive: true, force: true });
await mkdir(resolve(cwd, 'dist'), { recursive: true });
const compiler = Bun.spawn(
  [
    'bun',
    'x',
    '--no-install',
    'tsc',
    '-p',
    'tsconfig.json',
    '--emitDeclarationOnly',
    'false',
  ],
  { cwd, stdout: 'inherit', stderr: 'inherit' },
);
if (await compiler.exited) throw new Error('React build failed');
await writeFile(
  resolve(cwd, 'dist/skeleton.css'),
  [...skeletonStyles, ...reactSkeletonStyles, ...reactSkeletonMarkStyles].join(
    '\n',
  ),
);
await writeFile(
  resolve(cwd, 'dist/region.css'),
  [...regionStyles, ...reactRegionStyles].join('\n'),
);

const nativeCatalog = await import('../packages/core/src/catalog-styles.js');
const reactCatalog = await import('../packages/react/src/server.js');
// External stylesheets carry every mark; inline styles only the one in use.
for (const [name, native, fallback, marks] of [
  [
    'line',
    nativeCatalog.skeletonLineStyles,
    reactCatalog.reactLineStyles,
    reactCatalog.reactLineMarkStyles,
  ],
  [
    'circle',
    nativeCatalog.skeletonCircleStyles,
    reactCatalog.reactCircleStyles,
    reactCatalog.reactCircleMarkStyles,
  ],
  [
    'skeleton-text',
    nativeCatalog.skeletonTextStyles,
    reactCatalog.reactTextSkeletonStyles,
    reactCatalog.reactTextSkeletonMarkStyles,
  ],
  [
    'typing',
    nativeCatalog.typingStyles,
    reactCatalog.reactTypingStyles,
    reactCatalog.reactTypingMarkStyles,
  ],
  [
    'text',
    textStyles,
    reactCatalog.reactTextStyles,
    reactCatalog.reactTextMarkStyles,
  ],
  [
    'chart',
    chartStyles,
    reactCatalog.reactChartStyles,
    reactCatalog.reactChartMarkStyles,
  ],
  ['table', tableStyles, reactCatalog.reactTableStyles, []],
] as const)
  await writeFile(
    resolve(cwd, `dist/${name}.css`),
    [...native, ...fallback, ...marks].join('\n'),
  );

await writeFile(
  resolve(cwd, 'dist/skeleton-family.css'),
  skeletonSheet(
    skeletonStyles,
    [
      ['dotquilt-skeleton-line', nativeCatalog.skeletonLineStyles],
      ['dotquilt-skeleton-circle', nativeCatalog.skeletonCircleStyles],
      ['dotquilt-skeleton-text', nativeCatalog.skeletonTextStyles],
    ],
    [
      reactSkeletonStyles,
      reactSkeletonMarkStyles,
      reactCatalog.reactLineStyles,
      reactCatalog.reactLineMarkStyles,
      reactCatalog.reactCircleStyles,
      reactCatalog.reactCircleMarkStyles,
      reactCatalog.reactTextSkeletonStyles,
      reactCatalog.reactTextSkeletonMarkStyles,
    ],
  ),
);
