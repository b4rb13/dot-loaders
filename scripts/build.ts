import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  skeletonCircleStyles,
  skeletonLineStyles,
  skeletonTextStyles,
  typingStyles,
} from '../packages/core/src/catalog-styles.js';
import {
  chartStyles,
  staticChartStyles,
} from '../packages/core/src/chart-styles.js';
import {
  staticCircleStyles,
  staticLineStyles,
  staticTextStyles,
  staticTypingStyles,
} from '../packages/core/src/static-catalog-styles.js';
import {
  regionStyles,
  skeletonStyles,
  staticSkeletonStyles,
} from '../packages/core/src/styles.js';
import {
  staticTableStyles,
  tableStyles,
} from '../packages/core/src/table-styles.js';
import {
  staticTextLoaderStyles,
  textStyles,
} from '../packages/core/src/text-styles.js';
import { skeletonSheet } from './skeleton-sheet.js';

const root = resolve(import.meta.dir, '..');
const cwd = resolve(root, 'packages/core');
await rm(resolve(cwd, 'dist'), { recursive: true, force: true });
await mkdir(resolve(cwd, 'dist'), { recursive: true });
const proc = Bun.spawn(
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
if (await proc.exited) throw new Error('Declaration build failed');
await Promise.all([
  writeFile(
    resolve(cwd, 'dist/skeleton.css'),
    [...skeletonStyles, ...staticSkeletonStyles].join('\n'),
  ),
  writeFile(resolve(cwd, 'dist/region.css'), regionStyles.join('\n')),
]);

for (const [name, css] of Object.entries({
  line: [...skeletonLineStyles, ...staticLineStyles],
  circle: [...skeletonCircleStyles, ...staticCircleStyles],
  'skeleton-text': [...skeletonTextStyles, ...staticTextStyles],
  typing: [...typingStyles, ...staticTypingStyles],
  text: [...textStyles, ...staticTextLoaderStyles],
  chart: [...chartStyles, ...staticChartStyles],
  table: [...tableStyles, ...staticTableStyles],
}))
  await writeFile(resolve(cwd, `dist/${name}.css`), css.join('\n'));

await writeFile(
  resolve(cwd, 'dist/skeleton-family.css'),
  skeletonSheet(
    skeletonStyles,
    [
      ['dotquilt-skeleton-line', skeletonLineStyles],
      ['dotquilt-skeleton-circle', skeletonCircleStyles],
      ['dotquilt-skeleton-text', skeletonTextStyles],
    ],
    [
      staticSkeletonStyles,
      staticLineStyles,
      staticCircleStyles,
      staticTextStyles,
    ],
  ),
);
