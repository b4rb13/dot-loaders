// biome-ignore-all assist/source/organizeImports: Preserve verified inert import order for complete gzip budgets; see docs/implementation/m4/configuration-size-progress.md.
'use client';
import type { Animations } from '@dotquilt-internal/core';
import type { HostProps } from './types.js';
import { useHost } from './host.js';
import {
  TableLoader as NativeTableLoader,
  registerTableLoader,
  type TableColumn,
  type TablePreset,
  type TableTargetProvider,
} from '@dotquilt-internal/core/table';
import { createElement, forwardRef, useState } from 'react';
import {
  initialPolicy,
  policyAttributes,
  sheet,
  useCustomAttribute,
  useStyleNonce,
} from './static.js';
import { reactTableStyles } from './server.js';

/** Private native/adapter capability, independent of DOM and registration. */
type StaticTableLayout = (
  rows: number | undefined,
  rowHeight: number | undefined,
  columns: readonly TableColumn[] | undefined,
) => {
  rows: number;
  rowHeight: number;
  parts: readonly Readonly<Record<string, string>>[];
};

export interface TableLoaderProps extends HostProps<NativeTableLoader> {
  rows?: number | undefined;
  rowHeight?: number | undefined;
  columns?: readonly TableColumn[] | undefined;
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'table'> | undefined;
  preset?: TablePreset | undefined;
  targetProvider?: TableTargetProvider | undefined;
}

export const TableLoader = /* @__PURE__ */ forwardRef<
  NativeTableLoader,
  TableLoaderProps
>(function TableLoader(
  {
    rows,
    rowHeight,
    columns,
    speed,
    pointerResponse,
    animations,
    preset,
    targetProvider,
    stylePolicy,
    motion,
    onHandoffStart,
    onHandoffEnd,
    onHandoffCancel,
    onLoaderError,
    ...attributes
  },
  ref,
) {
  // Capture the inert native layout once; React continues to own its SVG nodes.
  const [[policy, initialRows, initialHeight, content]] = useState(() => {
    const policy = initialPolicy(stylePolicy);
    const {
      rows: count,
      rowHeight: height,
      parts,
    } = (
      (NativeTableLoader as unknown as Record<symbol, StaticTableLayout>)[
        Symbol.for('dotquilt.table.static.v1')
      ] as StaticTableLayout
    )(rows, rowHeight, columns);
    return [
      policy,
      count,
      height,
      createElement(
        'span',
        { 'data-dotquilt-react-static': '', 'aria-hidden': true },
        createElement(
          'svg',
          {
            'data-dotquilt-static': '',
            width: '100%',
            height: count * height,
            viewBox: `0 0 100 ${count * height}`,
            preserveAspectRatio: 'none',
            fill: 'none',
            stroke: 'currentColor',
            opacity: 0.25,
          },
          ...parts.map((attrs, key) =>
            createElement('path', {
              key,
              d: attrs.d,
              strokeWidth: attrs['stroke-width'],
              strokeDasharray: attrs['stroke-dasharray'],
            }),
          ),
        ),
      ),
    ] as const;
  });
  const nonce = useStyleNonce(policy, 'table');
  const upgraded = useCustomAttribute();
  const host = useHost(
    ref,
    registerTableLoader,
    {
      rows,
      rowHeight,
      columns,
      speed,
      pointerResponse,
      animations,
      preset,
      targetProvider,
      stylePolicy: stylePolicy ?? policy,
      motion,
    },
    { onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError },
  );
  return [
    sheet(reactTableStyles, policy, 'table', nonce),
    createElement(
      'dotquilt-table-loader',
      {
        key: 'host',
        ...attributes,
        ...upgraded,
        ...policyAttributes(policy, nonce),
        'aria-hidden': true,
        'data-dotquilt-surface': '',
        motion: 'paused',
        rows: initialRows,
        'row-height': initialHeight,
        ref: host,
      },
      content,
    ),
  ];
});
