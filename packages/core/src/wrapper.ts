/**
 * For framework packages (`@dotquilt/vue`, `@dotquilt/svelte`,
 * `@dotquilt/angular`), not applications: what a component renders around a
 * native element, so server HTML shows the placeholder before the element is
 * defined, and hydration never has to match nodes the element changed.
 *
 * A component renders, as plain markup it owns:
 *   - the host with its initial attributes and `wrapperPolicyAttributes()`;
 *   - inside it, first, a `<style slot="dotquilt-wrapper-style">` with the
 *     family's styles below (or a `<link>` for an external policy);
 *   - then `<span data-dotquilt-wrapper-static aria-hidden="true">`
 *     holding the static drawing (`<span data-dotquilt-static>` and its
 *     contents), which stays put: once defined, the element draws in its
 *     shadow root and no longer shows light-DOM children it doesn't slot.
 * It then registers the element on the client and delivers every option
 * through `update()`.
 *
 * Every rule here applies only while the element is undefined or waiting for
 * an external stylesheet (`:state(unstyled)`). Pure and DOM-free.
 */
import {
  staticCircleMarkStyles,
  staticCircleStyles,
  staticLineMarkStyles,
  staticLineStyles,
  staticTextMarkStyles,
  staticTextStyles,
  staticTypingMarkStyles,
  staticTypingStyles,
} from './static-catalog-styles.js';
import { staticSkeletonMarkStyles, staticSkeletonStyles } from './styles.js';
import { LoaderConfigurationError, type StylePolicy } from './types.js';

export {
  type StaticTableLayout,
  staticTableLayout,
} from './internal/table-model.js';

import { staticChartMarkStyles, staticChartStyles } from './chart-styles.js';
import { staticTableStyles } from './table-styles.js';
import {
  staticTextLoaderMarkStyles,
  staticTextLoaderStyles,
} from './text-styles.js';

/**
 * The `slot` of the wrapper's own `<style>` or `<link>` inside a host: no
 * slot has this name, so it never shows or counts as content, and its rules
 * apply all the same.
 */
export const wrapperStyleSlot = 'dotquilt-wrapper-style';
/** Marks the wrapper-owned node that holds a loader's static drawing. */
export const wrapperStatic = 'data-dotquilt-wrapper-static';
/** Marks the wrapper-owned element filling a region slot. */
export const wrapperSlot = 'data-dotquilt-wrapper-slot';
/** On a region host that has no placeholder to show. */
export const wrapperEmpty = 'data-dotquilt-wrapper-empty';

/**
 * The element while it's undefined or waiting for its stylesheet, at zero
 * specificity: the page's own classes win over these rules, as they do over
 * the element's shadow styles once it's defined.
 */
const beforeDefinition = (tag: string) =>
  `:where(${tag}:is(:not(:defined),:state(unstyled)))`;
/** Lowers every element selector in rules core already scopes. */
const lowered = (css: readonly string[]) =>
  Object.freeze(
    css.map((text) =>
      text.replace(
        /(?<!:where\()(dotquilt-[a-z-]+):is\(:not\(:defined\),:state\(unstyled\)\)/g,
        (_, tag: string) => beforeDefinition(tag),
      ),
    ),
  );
function scoped(
  css: readonly string[],
  tag: string,
  hidden: boolean,
): readonly string[] {
  const rules = css.map((text) => text.replaceAll(tag, beforeDefinition(tag)));
  return Object.freeze(
    hidden
      ? rules.concat(`${beforeDefinition(tag)}[hidden]{display:none}`)
      : rules,
  );
}

// Getters, not constants: a bundle keeps only the families a component
// actually draws, even though the shared style modules do work as they load.
const cache = new Map<string, readonly string[]>();
const lazily = (key: string, make: () => readonly string[]) => {
  let value = cache.get(key);
  if (!value) {
    value = make();
    cache.set(key, value);
  }
  return value;
};
const styles = (
  key: string,
  css: () => readonly string[],
  tag: string,
  hidden: boolean,
) => lazily(key, () => scoped(css(), tag, hidden));

export function wrapperSkeletonStyles(): readonly string[] {
  return styles(
    'skeleton',
    () => staticSkeletonStyles,
    'dotquilt-skeleton-block',
    true,
  );
}
export function wrapperLineStyles(): readonly string[] {
  return styles('line', () => staticLineStyles, 'dotquilt-skeleton-line', true);
}
export function wrapperCircleStyles(): readonly string[] {
  return styles(
    'circle',
    () => staticCircleStyles,
    'dotquilt-skeleton-circle',
    true,
  );
}
export function wrapperSkeletonTextStyles(): readonly string[] {
  return styles(
    'skeleton-text',
    () => staticTextStyles,
    'dotquilt-skeleton-text',
    true,
  );
}
export function wrapperTypingStyles(): readonly string[] {
  return styles(
    'typing',
    // The wrapper's own node must not add a second inline baseline.
    () =>
      staticTypingStyles.concat(
        `dotquilt-typing-dots [${wrapperStatic}]{display:contents}`,
      ),
    'dotquilt-typing-dots',
    true,
  );
}

export function wrapperTextStyles(): readonly string[] {
  return lazily('text', () => lowered(staticTextLoaderStyles));
}
export function wrapperTextMarkStyles(): readonly string[] {
  return lazily('text-marks', () => lowered(staticTextLoaderMarkStyles));
}
export function wrapperChartStyles(): readonly string[] {
  return lazily('chart', () => lowered(staticChartStyles));
}
export function wrapperChartMarkStyles(): readonly string[] {
  return lazily('chart-marks', () => lowered(staticChartMarkStyles));
}
export function wrapperTableStyles(): readonly string[] {
  return lazily('table', () => lowered(staticTableStyles));
}

/** Static rules for squares and dashes; add them only when drawing one. */
export function wrapperSkeletonMarkStyles(): readonly string[] {
  return styles(
    'skeleton-marks',
    () => staticSkeletonMarkStyles,
    'dotquilt-skeleton-block',
    false,
  );
}
export function wrapperLineMarkStyles(): readonly string[] {
  return styles(
    'line-marks',
    () => staticLineMarkStyles,
    'dotquilt-skeleton-line',
    false,
  );
}
export function wrapperCircleMarkStyles(): readonly string[] {
  return styles(
    'circle-marks',
    () => staticCircleMarkStyles,
    'dotquilt-skeleton-circle',
    false,
  );
}
export function wrapperSkeletonTextMarkStyles(): readonly string[] {
  return styles(
    'skeleton-text-marks',
    () => staticTextMarkStyles,
    'dotquilt-skeleton-text',
    false,
  );
}
export function wrapperTypingMarkStyles(): readonly string[] {
  return styles(
    'typing-marks',
    () => staticTypingMarkStyles,
    'dotquilt-typing-dots',
    false,
  );
}

const region = beforeDefinition('dotquilt-region');
/**
 * A region's slots. While pending, the placeholder is in flow, with any
 * content below it, so the first HTML reserves its space (and without
 * JavaScript the content stays visible under it). The refresh cue lies over
 * the content.
 */
export const wrapperRegionStyles: readonly string[] = [
  `${region}{display:flow-root;position:relative}${region}[hidden]{display:none}${region}>[${wrapperSlot}]{position:absolute;inset:0;pointer-events:none}${region}[state=pending]>[slot=placeholder]{position:relative}${region}:not([state=pending])>[slot=placeholder],${region}:not([state=refreshing])>[slot=refresh-indicator]{display:none}${region}[state=pending][${wrapperEmpty}]::before{content:"";position:absolute;inset:0;min-height:1em;border:1px dotted currentColor}`,
];

/** Checks a style policy the way the elements do, before any markup uses it. */
export function wrapperPolicy(value: StylePolicy | undefined): StylePolicy {
  const policy = value ?? { mode: 'inline' };
  if (
    !policy ||
    (policy.mode !== 'inline' && policy.mode !== 'external') ||
    (policy.mode === 'inline' &&
      policy.nonce !== undefined &&
      (typeof policy.nonce !== 'string' || policy.nonce.length > 256)) ||
    (policy.mode === 'external' &&
      (typeof policy.href !== 'string' ||
        policy.href.length > 2048 ||
        !/^(https?:\/\/|\/[^/]|\.\.?\/)/.test(policy.href)))
  )
    throw new LoaderConfigurationError(
      'invalid-style-policy',
      'Invalid style policy',
    );
  return Object.freeze({ ...policy });
}

/** The host attributes that carry a style policy to the element. */
export function wrapperPolicyAttributes(
  policy: StylePolicy,
): Readonly<Record<string, string>> {
  if (policy.mode === 'external')
    return { 'data-dotquilt-style-href': policy.href };
  return policy.nonce === undefined ? {} : { nonce: policy.nonce };
}

/** Whether a mark needs its extra static rules (the default dot doesn't). */
export const wrapperNeedsMarkStyles = (
  policy: StylePolicy,
  mark: unknown,
): boolean =>
  policy.mode !== 'external' && (mark === 'dash' || mark === 'square');

/** SkeletonText's line count and widths, normalized as the element does. */
export function wrapperSkeletonLines(
  lines: number | undefined,
  widths: readonly number[] | undefined,
): { readonly count: number; readonly widths: readonly number[] } {
  const count =
    lines !== undefined && Number.isInteger(lines) && lines > 0
      ? Math.min(lines, 50)
      : 3;
  return {
    count,
    widths: Array.from({ length: count }, (_, index) => {
      const width = widths?.[index];
      return typeof width === 'number' &&
        Number.isFinite(width) &&
        width > 0 &&
        width <= 1
        ? width
        : count > 1 && index === count - 1
          ? 0.6
          : 1;
    }),
  };
}
