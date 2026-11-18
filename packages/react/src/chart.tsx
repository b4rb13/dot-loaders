'use client';
import type { Animations } from '@dotquilt-internal/core';
import {
  type ChartPreset,
  type ChartVariant,
  type ChartLoader as NativeChartLoader,
  registerChartLoader,
  type TargetProvider,
} from '@dotquilt-internal/core/chart';
import { forwardRef, useState } from 'react';
import { useHost } from './host.js';
import { reactChartMarkStyles, reactChartStyles } from './server.js';
import {
  initialPolicy,
  markSheet,
  policyAttributes,
  sheet,
  useCustomAttribute,
  useStyleNonce,
} from './static.js';
import type { HostProps } from './types.js';

export interface ChartLoaderProps extends HostProps<NativeChartLoader> {
  variant?: ChartVariant | undefined;
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'chart'> | undefined;
  preset?: ChartPreset | undefined;
  targetProvider?: TargetProvider | undefined;
}

export const ChartLoader = /* @__PURE__ */ forwardRef<
  NativeChartLoader,
  ChartLoaderProps
>(function ChartLoader(
  {
    variant,
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
  const [initial] = useState(() => ({
    policy: initialPolicy(stylePolicy),
    variant: variant ?? preset?.variant ?? 'line',
  }));
  const nonce = useStyleNonce(initial.policy, 'chart');
  const upgraded = useCustomAttribute();
  const host = useHost(
    ref,
    registerChartLoader,
    {
      variant,
      speed,
      pointerResponse,
      animations,
      preset,
      targetProvider,
      stylePolicy: stylePolicy ?? initial.policy,
      motion,
    },
    { onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError },
  );
  return (
    <>
      {sheet(reactChartStyles, initial.policy, 'chart', nonce)}
      {markSheet(
        reactChartMarkStyles,
        initial.policy,
        'chart',
        nonce,
        attributes.mark,
      )}
      <dotquilt-chart-loader
        {...attributes}
        {...upgraded}
        {...policyAttributes(initial.policy, nonce)}
        aria-hidden
        data-dotquilt-surface=""
        motion="paused"
        variant={initial.variant}
        ref={host}
      >
        <span data-dotquilt-react-static="" aria-hidden>
          <span data-dotquilt-static="" />
        </span>
      </dotquilt-chart-loader>
    </>
  );
});
