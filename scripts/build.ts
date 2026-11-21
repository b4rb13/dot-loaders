import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { elements } from '../packages/core/meta/elements.js';
import {
  skeletonCircleStyles,
  skeletonLineStyles,
  skeletonTextStyles,
  typingStyles,
} from '../packages/core/src/catalog-styles.js';
import {
  chartStyles,
  staticChartMarkStyles,
  staticChartStyles,
} from '../packages/core/src/chart-styles.js';
import {
  staticCircleMarkStyles,
  staticCircleStyles,
  staticLineMarkStyles,
  staticLineStyles,
  staticTextMarkStyles,
  staticTextStyles,
  staticTypingMarkStyles,
  staticTypingStyles,
} from '../packages/core/src/static-catalog-styles.js';
import {
  regionStyles,
  skeletonStyles,
  staticSkeletonMarkStyles,
  staticSkeletonStyles,
} from '../packages/core/src/styles.js';
import {
  staticTableStyles,
  tableStyles,
} from '../packages/core/src/table-styles.js';
import {
  staticTextLoaderMarkStyles,
  staticTextLoaderStyles,
  textStyles,
} from '../packages/core/src/text-styles.js';
import { customElementsManifest, webTypes } from './element-manifest.js';
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
    [
      ...skeletonStyles,
      ...staticSkeletonStyles,
      ...staticSkeletonMarkStyles,
    ].join('\n'),
  ),
  writeFile(resolve(cwd, 'dist/region.css'), regionStyles.join('\n')),
]);

for (const [name, css] of Object.entries({
  // External stylesheets carry every mark; inline markup only the one it uses.
  line: [...skeletonLineStyles, ...staticLineStyles, ...staticLineMarkStyles],
  circle: [
    ...skeletonCircleStyles,
    ...staticCircleStyles,
    ...staticCircleMarkStyles,
  ],
  'skeleton-text': [
    ...skeletonTextStyles,
    ...staticTextStyles,
    ...staticTextMarkStyles,
  ],
  typing: [...typingStyles, ...staticTypingStyles, ...staticTypingMarkStyles],
  text: [
    ...textStyles,
    ...staticTextLoaderStyles,
    ...staticTextLoaderMarkStyles,
  ],
  chart: [...chartStyles, ...staticChartStyles, ...staticChartMarkStyles],
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
      staticSkeletonMarkStyles,
      staticLineStyles,
      staticLineMarkStyles,
      staticCircleStyles,
      staticCircleMarkStyles,
      staticTextStyles,
      staticTextMarkStyles,
    ],
  ),
);

// What editors and tools read about the elements (packages/core/meta).
const { version } = await Bun.file(resolve(cwd, 'package.json')).json();
await writeFile(
  resolve(cwd, 'dist/custom-elements.json'),
  `${JSON.stringify(customElementsManifest(elements), null, 2)}\n`,
);
await writeFile(
  resolve(cwd, 'dist/web-types.json'),
  `${JSON.stringify(webTypes(elements, version), null, 2)}\n`,
);
