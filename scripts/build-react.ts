import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chartStyles } from '../packages/core/src/chart-styles.js';
import { regionStyles, skeletonStyles } from '../packages/core/src/styles';
import { tableStyles } from '../packages/core/src/table-styles.js';
import { textStyles } from '../packages/core/src/text-styles.js';
import {
  reactRegionStyles,
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
  [...skeletonStyles, ...reactSkeletonStyles].join('\n'),
);
await writeFile(
  resolve(cwd, 'dist/region.css'),
  [...regionStyles, ...reactRegionStyles].join('\n'),
);

const nativeCatalog = await import('../packages/core/src/catalog-styles.js');
const reactCatalog = await import('../packages/react/src/server.js');
for (const [name, native, fallback] of [
  ['line', nativeCatalog.skeletonLineStyles, reactCatalog.reactLineStyles],
  [
    'circle',
    nativeCatalog.skeletonCircleStyles,
    reactCatalog.reactCircleStyles,
  ],
  [
    'skeleton-text',
    nativeCatalog.skeletonTextStyles,
    reactCatalog.reactTextSkeletonStyles,
  ],
  ['typing', nativeCatalog.typingStyles, reactCatalog.reactTypingStyles],
  ['text', textStyles, reactCatalog.reactTextStyles],
  ['chart', chartStyles, reactCatalog.reactChartStyles],
  ['table', tableStyles, reactCatalog.reactTableStyles],
] as const)
  await writeFile(
    resolve(cwd, `dist/${name}.css`),
    [...native, ...fallback].join('\n'),
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
      reactCatalog.reactLineStyles,
      reactCatalog.reactCircleStyles,
      reactCatalog.reactTextSkeletonStyles,
    ],
  ),
);
