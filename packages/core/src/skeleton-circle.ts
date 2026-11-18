import { skeletonCircleStyles } from './catalog-styles.js';
import { register } from './internal/dom.js';
import { SkeletonBlock } from './skeleton-block.js';

export class SkeletonCircle extends SkeletonBlock {
  protected override get styles(): readonly string[] {
    return skeletonCircleStyles;
  }
}
export function registerSkeletonCircle(): void {
  register('dotquilt-skeleton-circle', SkeletonCircle);
}
