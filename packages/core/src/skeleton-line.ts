import { skeletonLineStyles } from './catalog-styles.js';
import { register } from './internal/dom.js';
import { SkeletonBlock } from './skeleton-block.js';

export class SkeletonLine extends SkeletonBlock {
  protected override get styles(): readonly string[] {
    return skeletonLineStyles;
  }
}
export function registerSkeletonLine(): void {
  register('dotquilt-skeleton-line', SkeletonLine);
}
