import { ChartLoader } from './chart.js';
import { register } from './internal/dom.js';
import { implementationVersion } from './internal/version.js';
import { LoadingRegion } from './region.js';
import {
  SkeletonBlock,
  SkeletonCircle,
  SkeletonLine,
  SkeletonText,
} from './skeleton.js';
import { TableLoader } from './table.js';
import { TextLoader } from './text.js';
import { LoaderRegistrationError } from './types.js';
import { TypingDots } from './typing.js';

/** Explicit convenience setup. Importing this module never registers elements. */
export function registerAll(): void {
  if (typeof customElements === 'undefined')
    throw new Error('Registration requires a browser');
  const definitions = [
    ['dotquilt-skeleton-block', SkeletonBlock],
    ['dotquilt-skeleton-line', SkeletonLine],
    ['dotquilt-skeleton-circle', SkeletonCircle],
    ['dotquilt-skeleton-text', SkeletonText],
    ['dotquilt-typing-dots', TypingDots],
    ['dotquilt-text-loader', TextLoader],
    ['dotquilt-chart-loader', ChartLoader],
    ['dotquilt-table-loader', TableLoader],
    ['dotquilt-region', LoadingRegion],
  ] as const;
  // Check the entire batch before avoidable writes. Reentrant upgrades still use
  // each definition's normal conflict check; there is no rollback promise.
  for (const [name] of definitions) {
    const existing = customElements.get(name);
    if (
      existing &&
      (!Object.hasOwn(existing, Symbol.for('dotquilt.implementation')) ||
        Reflect.get(existing, Symbol.for('dotquilt.implementation')) !==
          implementationVersion)
    )
      throw new LoaderRegistrationError(name);
  }
  for (const [name, definition] of definitions) register(name, definition);
}
