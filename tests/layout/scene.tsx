import type {
  LoadingState,
  StylePolicy,
  TableColumn,
} from '@dotquilt-internal/core';
import * as adapter from '@dotquilt-internal/react';
import { createElement as h, useLayoutEffect } from 'react';

export const profiles = {
  block: { kind: 'skeleton-block', family: 'skeleton', height: 64 },
  line: { kind: 'skeleton-line', family: 'line', height: 14 },
  circle: { kind: 'skeleton-circle', family: 'circle', height: 80 },
  multiline: {
    kind: 'skeleton-text',
    family: 'skeleton-text',
    height: 1092,
    lines: 50,
    widths: Array.from({ length: 50 }, (_, i) => (i % 2 ? 0.01 : 1)),
  },
  multilineOverlimit: {
    kind: 'skeleton-text',
    family: 'skeleton-text',
    height: 1092,
    lines: 500,
    widths: Array(50).fill(1),
  },
  typing: { kind: 'typing-dots', family: 'typing', height: 24, count: 8 },
  latin: {
    kind: 'text-loader',
    family: 'text',
    height: 256,
    text: 'W'.repeat(256),
    mask: 'M'.repeat(256),
  },
  unicode: {
    kind: 'text-loader',
    family: 'text',
    height: 256,
    text: 'مرحبا 世界 👩🏽‍💻 '.repeat(16),
    mask: 'M'.repeat(256),
  },
  long: {
    kind: 'text-loader',
    family: 'text',
    height: 2048,
    text: 'Long content '.repeat(320),
    mask: 'M'.repeat(256),
  },
  chartLine: {
    kind: 'chart-loader',
    family: 'chart',
    height: 240,
    variant: 'line',
  },
  chartBar: {
    kind: 'chart-loader',
    family: 'chart',
    height: 240,
    variant: 'bar',
  },
  chartScatter: {
    kind: 'chart-loader',
    family: 'chart',
    height: 240,
    variant: 'scatter',
  },
  tableRows: {
    kind: 'table-loader',
    family: 'table',
    height: 1600,
    rows: 100,
    rowHeight: 16,
    columns: [{ kind: 'text', width: 1 }],
  },
  tableProduct: {
    kind: 'table-loader',
    family: 'table',
    height: 800,
    rows: 100,
    rowHeight: 16,
    columns: Array.from({ length: 20 }, (_, i) => ({
      kind: (['text', 'number', 'badge', 'date'] as const)[i % 4] ?? 'text',
      width: i + 1,
    })),
  },
  tableExtreme: {
    kind: 'table-loader',
    family: 'table',
    height: 240,
    rows: 100,
    rowHeight: Number.MAX_SAFE_INTEGER / 100,
    columns: Array.from({ length: 20 }, () => ({
      kind: 'text' as const,
      width: 1,
    })),
  },
  region: { kind: 'skeleton-block', family: 'skeleton', height: 240 },
} as const;
export type Profile = keyof typeof profiles;
export const policy = (
  family: string,
  mode: string,
  react = false,
): StylePolicy =>
  mode === 'external'
    ? {
        mode: 'external',
        href: `/${react ? 'react-' : ''}styles/${family}.css`,
      }
    : { mode: 'inline', nonce: 'layout-fixture' };
export function sourceProps(profile: Profile) {
  const p = profiles[profile];
  return {
    ...('lines' in p ? { lines: p.lines, widths: [...p.widths] } : {}),
    ...('count' in p ? { count: p.count } : {}),
    ...('variant' in p ? { variant: p.variant } : {}),
    ...('rows' in p
      ? {
          rows: p.rows,
          rowHeight: p.rowHeight,
          columns: p.columns as readonly TableColumn[],
        }
      : {}),
    ...('mask' in p ? { mask: p.mask } : {}),
  };
}
export function Scene({
  profile,
  mode,
  state = 'pending',
  cycle = 'initial',
  onCommit,
}: {
  profile: Profile;
  mode: string;
  state?: LoadingState;
  cycle?: string;
  onCommit?: (() => void) | undefined;
}) {
  useLayoutEffect(() => onCommit?.());
  const p = profiles[profile];
  const common = {
    id: 'source',
    className: 'source',
    motion: 'system' as const,
    stylePolicy: policy(p.family, mode, true),
    ...sourceProps(profile),
  };
  if ('text' in p)
    return h(
      adapter.TextLoader,
      { ...common, id: 'owner', state, cycle, timing: { duration: 150 } },
      p.text,
    );
  const placeholder =
    p.kind === 'chart-loader'
      ? h(adapter.ChartLoader, common)
      : p.kind === 'table-loader'
        ? h(adapter.TableLoader, common)
        : p.kind === 'skeleton-line'
          ? h(adapter.SkeletonLine, common)
          : p.kind === 'skeleton-circle'
            ? h(adapter.SkeletonCircle, common)
            : p.kind === 'skeleton-text'
              ? h(adapter.SkeletonText, common)
              : p.kind === 'typing-dots'
                ? h(adapter.TypingDots, common)
                : h(adapter.SkeletonBlock, common);
  return h(
    adapter.LoadingRegion,
    {
      id: 'owner',
      state,
      cycle,
      motion: 'system',
      timing: { duration: 150 },
      stylePolicy: policy('region', mode, true),
      placeholder,
    },
    h(
      'div',
      { id: 'content' },
      h('input', {
        id: 'value',
        'aria-label': 'Retained value',
        defaultValue: 'retained',
      }),
      h('p', null, 'Application content'),
    ),
  );
}
