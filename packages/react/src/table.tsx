'use client';
import type { Animations } from '@dotquilt-internal/core';
import {
  type TableLoader as NativeTableLoader,
  registerTableLoader,
  staticTableLayout,
  type TableColumn,
  type TablePreset,
  type TableTargetProvider,
} from '@dotquilt-internal/core/table';
import { forwardRef, useState } from 'react';
import { useHost } from './host.js';
import { reactTableStyles } from './server.js';
import {
  initialPolicy,
  policyAttributes,
  sheet,
  useCustomAttribute,
  useStyleNonce,
} from './static.js';
import type { HostProps } from './types.js';

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
  const [initial] = useState(() => {
    const policy = initialPolicy(stylePolicy);
    const {
      rows: count,
      rowHeight: height,
      parts,
    } = staticTableLayout(rows, rowHeight, columns);
    return {
      policy,
      rows: count,
      height,
      content: (
        <span data-dotquilt-react-static="" aria-hidden>
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: decoration inside an aria-hidden wrapper */}
          <svg
            data-dotquilt-static=""
            width="100%"
            height={count * height}
            viewBox={`0 0 100 ${count * height}`}
            preserveAspectRatio="none"
            fill="none"
            stroke="currentColor"
            opacity={0.25}
          >
            {parts.map((attrs, index) => (
              <path
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative rules that never reorder
                key={index}
                d={attrs.d}
                strokeWidth={attrs['stroke-width']}
                strokeDasharray={attrs['stroke-dasharray']}
              />
            ))}
          </svg>
        </span>
      ),
    };
  });
  const { policy } = initial;
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
  return (
    <>
      {sheet(reactTableStyles, policy, 'table', nonce)}
      <dotquilt-table-loader
        {...attributes}
        {...upgraded}
        {...policyAttributes(policy, nonce)}
        aria-hidden
        data-dotquilt-surface=""
        motion="paused"
        rows={initial.rows}
        row-height={initial.height}
        ref={host}
      >
        {initial.content}
      </dotquilt-table-loader>
    </>
  );
});
