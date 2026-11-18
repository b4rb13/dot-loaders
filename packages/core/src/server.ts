import {
  skeletonCircleStyles,
  skeletonLineStyles,
  skeletonTextStyles,
  typingStyles,
} from './catalog-styles.js';
import { chartStyles, staticChartStyles } from './chart-styles.js';
import { boundedCount, lineWidths } from './internal/count.js';
import { capturePreset, type Preset } from './internal/preset.js';
import {
  tableColumns,
  tableHeight,
  tableRows,
  tableStaticParts,
} from './internal/table-model.js';
import {
  staticCircleStyles,
  staticLineStyles,
  staticTextStyles,
  staticTypingStyles,
} from './static-catalog-styles.js';
import {
  regionStyles,
  skeletonStyles,
  staticSkeletonStyles,
} from './styles.js';
import { staticTableStyles, tableStyles } from './table-styles.js';
import { staticTextLoaderStyles, textStyles } from './text-styles.js';
import {
  LoaderConfigurationError,
  type LoadingState,
  type StylePolicy,
} from './types.js';

export {
  chartStyles,
  skeletonCircleStyles,
  skeletonLineStyles,
  skeletonTextStyles,
  staticChartStyles,
  staticCircleStyles,
  staticLineStyles,
  staticTableStyles,
  staticTextLoaderStyles,
  staticTextStyles,
  staticTypingStyles,
  tableStyles,
  textStyles,
  typingStyles,
};

export type DecorativeDescription =
  | Readonly<{
      kind: 'table-loader';
      preset?: Preset<'table'>;
      rows?: number;
      rowHeight?: number;
      columns?: readonly import('./table.js').TableColumn[];
      stylePolicy?: StylePolicy;
    }>
  | Readonly<{
      kind: 'chart-loader';
      preset?: Preset<'chart'>;
      variant?: import('./chart.js').ChartVariant;
      stylePolicy?: StylePolicy;
    }>
  | {
      [K in 'skeleton-block' | 'skeleton-line' | 'skeleton-circle']: Readonly<{
        kind: K;
        preset?: Preset<'skeleton'>;
        stylePolicy?: StylePolicy;
      }>;
    }['skeleton-block' | 'skeleton-line' | 'skeleton-circle']
  | Readonly<{
      kind: 'skeleton-text';
      preset?: Preset<'skeleton'>;
      lines?: number;
      widths?: readonly number[];
      stylePolicy?: StylePolicy;
    }>
  | Readonly<{
      kind: 'typing-dots';
      preset?: Preset<'typing'>;
      count?: number;
      stylePolicy?: StylePolicy;
    }>;

export { regionStyles, skeletonStyles, staticSkeletonStyles };
export type StaticDescription =
  | DecorativeDescription
  | Readonly<{
      kind: 'text-loader';
      preset?: Preset<'text'>;
      text?: string | number;
      mask?: string;
      state?: LoadingState;
      stylePolicy?: StylePolicy;
    }>
  | Readonly<{
      kind: 'region';
      preset?: Preset<'region'>;
      state?: LoadingState;
      label?: string;
      placeholder?: DecorativeDescription;
      stylePolicy?: StylePolicy;
    }>;
const escapeHTML = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] ?? char,
  );
function style(
  css: readonly string[],
  policy: StylePolicy | undefined,
): string {
  if (
    policy?.mode === 'inline' &&
    policy.nonce !== undefined &&
    (typeof policy.nonce !== 'string' || policy.nonce.length > 256)
  )
    throw new LoaderConfigurationError('invalid-style-policy', 'Invalid nonce');
  if (policy?.mode === 'external') {
    if (
      typeof policy.href !== 'string' ||
      policy.href.length > 2048 ||
      !/^(https?:\/\/|\/[^/]|\.\.?\/)/.test(policy.href)
    )
      throw new LoaderConfigurationError(
        'invalid-style-policy',
        'Invalid stylesheet URL',
      );
    return `<link data-dotquilt-style rel="stylesheet" href="${escapeHTML(policy.href)}">`;
  }
  if (policy && policy.mode !== 'inline')
    throw new LoaderConfigurationError(
      'invalid-style-policy',
      'Invalid style policy',
    );
  return css
    .map(
      (text) =>
        `<style data-dotquilt-style${policy?.nonce ? ` nonce="${escapeHTML(policy.nonce)}"` : ''}>${text}</style>`,
    )
    .join('');
}
/** Renders only library decoration. Applications render real content using their own templates. */
export function renderStatic(description: StaticDescription): string {
  if (
    !description ||
    ![
      'skeleton-block',
      'skeleton-line',
      'skeleton-circle',
      'skeleton-text',
      'typing-dots',
      'region',
      'text-loader',
      'chart-loader',
      'table-loader',
    ].includes(description.kind)
  )
    throw new LoaderConfigurationError(
      'invalid-static-description',
      'Unsupported static description',
    );
  const preset =
    description.preset === undefined
      ? undefined
      : capturePreset(
          description.preset,
          description.kind.startsWith('skeleton-')
            ? 'skeleton'
            : description.kind === 'typing-dots'
              ? 'typing'
              : description.kind === 'region'
                ? 'region'
                : description.kind === 'text-loader'
                  ? 'text'
                  : description.kind === 'chart-loader'
                    ? 'chart'
                    : 'table',
        );
  if (description.kind === 'table-loader') {
    const columns = tableColumns(description.columns),
      rows = tableRows(description.rows ?? 5, columns.length),
      height = tableHeight(description.rowHeight ?? 32);
    const paths = tableStaticParts(rows, height, columns)
      .map(
        (attrs) =>
          `<path ${Object.entries(attrs)
            .map(([k, v]) => `${k}="${escapeHTML(v)}"`)
            .join(' ')}></path>`,
      )
      .join('');
    return `<dotquilt-table-loader rows="${rows}" row-height="${height}" aria-hidden="true" data-dotquilt-surface>${style(staticTableStyles, description.stylePolicy)}<svg data-dotquilt-static width="100%" height="${rows * height}" viewBox="0 0 100 ${rows * height}" preserveAspectRatio="none" fill="none" stroke="currentColor" opacity=".25">${paths}</svg></dotquilt-table-loader>`;
  }
  if (description.kind === 'chart-loader') {
    const variant = description.variant ?? preset?.variant ?? 'line';
    if (!['line', 'bar', 'scatter'].includes(variant))
      throw new LoaderConfigurationError(
        'invalid-static-description',
        'Invalid chart variant',
      );
    return `<dotquilt-chart-loader variant="${variant}"${description.variant === undefined && preset?.variant !== undefined ? ` data-dotquilt-preset-variant="${variant}"` : ''} aria-hidden="true" data-dotquilt-surface>${style(staticChartStyles, description.stylePolicy)}<span data-dotquilt-static></span></dotquilt-chart-loader>`;
  }
  if (description.kind === 'text-loader') {
    const state = description.state ?? 'ready';
    if (
      !['ready', 'pending', 'refreshing'].includes(state) ||
      (description.text !== undefined &&
        typeof description.text !== 'string' &&
        typeof description.text !== 'number') ||
      (typeof description.text === 'number' &&
        !Number.isFinite(description.text)) ||
      (description.mask !== undefined && typeof description.mask !== 'string')
    )
      throw new LoaderConfigurationError(
        'invalid-static-description',
        'Invalid text description',
      );
    const value = String(description.text ?? '');
    const requestedMask = description.mask ?? value;
    const mask = requestedMask.length <= 256 ? requestedMask : '';
    return `<dotquilt-text-loader state="${state}" mask="${escapeHTML(mask)}">${style(staticTextLoaderStyles, description.stylePolicy)}<span slot="placeholder" data-dotquilt-text-placeholder aria-hidden="true" inert>${escapeHTML(mask)}</span><span data-dotquilt-text-content${state === 'pending' ? ' aria-hidden="true" inert' : ''}>${escapeHTML(value)}</span></dotquilt-text-loader>`;
  }
  if (description.kind === 'skeleton-block')
    return `<dotquilt-skeleton-block aria-hidden="true" data-dotquilt-surface>${style(staticSkeletonStyles, description.stylePolicy)}<span data-dotquilt-static></span></dotquilt-skeleton-block>`;
  if (
    description.kind === 'skeleton-line' ||
    description.kind === 'skeleton-circle'
  ) {
    const css =
      description.kind === 'skeleton-line'
        ? staticLineStyles
        : staticCircleStyles;
    return `<dotquilt-${description.kind} aria-hidden="true" data-dotquilt-surface>${style(css, description.stylePolicy)}<span data-dotquilt-static></span></dotquilt-${description.kind}>`;
  }
  if (description.kind === 'skeleton-text') {
    const lines = boundedCount(description.lines ?? 3, 3, 50);
    const widths = lineWidths(
      lines,
      Array.isArray(description.widths) ? description.widths : [],
    );
    // SVG geometry attributes are data, not inline style; strict CSP needs no per-instance CSS.
    const content = widths.map(
      (width) =>
        `<svg data-dotquilt-static-line aria-hidden="true" width="${width * 100}%" height="14"></svg>`,
    );
    return `<dotquilt-skeleton-text lines="${lines}" aria-hidden="true" data-dotquilt-surface>${style(staticTextStyles, description.stylePolicy)}<span data-dotquilt-static>${content.join('')}</span></dotquilt-skeleton-text>`;
  }
  if (description.kind === 'typing-dots') {
    const count = boundedCount(description.count ?? preset?.count ?? 3, 3, 8);
    return `<dotquilt-typing-dots count="${count}"${description.count === undefined && preset?.count !== undefined ? ` data-dotquilt-preset-count="${count}"` : ''} aria-hidden="true" data-dotquilt-surface>${style(staticTypingStyles, description.stylePolicy)}<span data-dotquilt-static>${'<i class="dot"></i>'.repeat(count)}</span></dotquilt-typing-dots>`;
  }
  if (description.label !== undefined && typeof description.label !== 'string')
    throw new LoaderConfigurationError(
      'invalid-static-description',
      'Label must be text',
    );
  const state = description.state ?? 'ready';
  if (
    !['ready', 'pending', 'refreshing'].includes(state) ||
    (description.label?.length ?? 0) > 1024
  )
    throw new LoaderConfigurationError(
      'invalid-static-description',
      'Invalid region state or label',
    );
  const placeholder = description.placeholder
    ? `<span slot="placeholder" data-dotquilt-placeholder${state === 'ready' ? ' hidden' : ''}>${renderStatic(description.placeholder)}</span>`
    : '';
  return `<dotquilt-region state="${state}"${description.label ? ` aria-label="${escapeHTML(description.label)}"` : ''}>${style(regionStyles, description.stylePolicy)}${placeholder}</dotquilt-region>`;
}
