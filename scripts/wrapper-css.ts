import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as wrapper from 'dotquilt/wrapper';
import * as catalog from '../packages/core/src/catalog-styles.js';
import { chartStyles } from '../packages/core/src/chart-styles.js';
import { regionStyles, skeletonStyles } from '../packages/core/src/styles.js';
import { tableStyles } from '../packages/core/src/table-styles.js';
import { textStyles } from '../packages/core/src/text-styles.js';
import { skeletonSheet } from './skeleton-sheet.js';

/**
 * The stylesheets a framework package ships for an external style policy
 * (`styles/*.css`): each element's own styles, then the rules for the
 * wrapper's markup before the element is defined, with every mark.
 */
export async function writeWrapperStyles(dist: string): Promise<void> {
  const files: Record<string, readonly (readonly string[])[]> = {
    skeleton: [
      skeletonStyles,
      wrapper.wrapperSkeletonStyles(),
      wrapper.wrapperSkeletonMarkStyles(),
    ],
    region: [regionStyles, wrapper.wrapperRegionStyles],
    line: [
      catalog.skeletonLineStyles,
      wrapper.wrapperLineStyles(),
      wrapper.wrapperLineMarkStyles(),
    ],
    circle: [
      catalog.skeletonCircleStyles,
      wrapper.wrapperCircleStyles(),
      wrapper.wrapperCircleMarkStyles(),
    ],
    'skeleton-text': [
      catalog.skeletonTextStyles,
      wrapper.wrapperSkeletonTextStyles(),
      wrapper.wrapperSkeletonTextMarkStyles(),
    ],
    typing: [
      catalog.typingStyles,
      wrapper.wrapperTypingStyles(),
      wrapper.wrapperTypingMarkStyles(),
    ],
    text: [
      textStyles,
      wrapper.wrapperTextStyles,
      wrapper.wrapperTextMarkStyles,
    ],
    chart: [
      chartStyles,
      wrapper.wrapperChartStyles,
      wrapper.wrapperChartMarkStyles,
    ],
    table: [tableStyles, wrapper.wrapperTableStyles],
  };
  for (const [name, parts] of Object.entries(files))
    await writeFile(resolve(dist, `${name}.css`), parts.flat().join('\n'));
  await writeFile(
    resolve(dist, 'skeleton-family.css'),
    skeletonSheet(
      skeletonStyles,
      [
        ['dotquilt-skeleton-line', catalog.skeletonLineStyles],
        ['dotquilt-skeleton-circle', catalog.skeletonCircleStyles],
        ['dotquilt-skeleton-text', catalog.skeletonTextStyles],
      ],
      [
        wrapper.wrapperSkeletonStyles(),
        wrapper.wrapperSkeletonMarkStyles(),
        wrapper.wrapperLineStyles(),
        wrapper.wrapperLineMarkStyles(),
        wrapper.wrapperCircleStyles(),
        wrapper.wrapperCircleMarkStyles(),
        wrapper.wrapperSkeletonTextStyles(),
        wrapper.wrapperSkeletonTextMarkStyles(),
      ],
    ),
  );
}
