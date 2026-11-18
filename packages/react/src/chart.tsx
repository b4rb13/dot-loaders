// biome-ignore-all assist/source/organizeImports: Preserve verified inert import order for complete gzip budgets; see docs/implementation/m4/configuration-size-progress.md.
'use client';
import type { Animations } from '@dotquilt-internal/core';
import type { HostProps } from './types.js';
import {
  type ChartPreset,
  type ChartVariant,
  type ChartLoader as NativeChartLoader,
  registerChartLoader,
  type TargetProvider,
} from '@dotquilt-internal/core/chart';
import { createElement, Fragment, forwardRef, useState } from 'react';
import { useHost } from './host.js';
import {
  initialPolicy,
  policyAttributes,
  sheet,
  useCustomAttribute,
  useStyleNonce,
} from './static.js';
import { reactChartStyles } from './server.js';

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
  return createElement(
    Fragment,
    null,
    sheet(reactChartStyles, initial.policy, 'chart', nonce),
    createElement(
      'dotquilt-chart-loader',
      {
        ...attributes,
        ...upgraded,
        ...policyAttributes(initial.policy, nonce),
        'aria-hidden': true,
        'data-dotquilt-surface': '',
        motion: 'paused',
        variant: initial.variant,
        ref: host,
      },
      createElement(
        'span',
        { 'data-dotquilt-react-static': '', 'aria-hidden': true },
        createElement('span', { 'data-dotquilt-static': '' }),
      ),
    ),
  );
});
