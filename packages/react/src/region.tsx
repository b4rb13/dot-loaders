// biome-ignore-all assist/source/organizeImports: Preserve verified inert import order for complete gzip budgets; see docs/implementation/m4/configuration-size-progress.md.
'use client';
import type {
  Animations,
  LoadingState,
  RevealTarget,
  Timing,
} from '@dotquilt-internal/core';
import type { HostProps } from './types.js';
import { useHost } from './host.js';
import {
  type LoadingRegion as NativeLoadingRegion,
  type RegionPreset,
  registerLoadingRegion,
} from '@dotquilt-internal/core/region';
import {
  Children,
  createElement,
  forwardRef,
  type ReactNode,
  useState,
} from 'react';
import {
  initialPolicy,
  policyAttributes,
  sheet,
  useStyleNonce,
} from './static.js';
import { reactRegionStyles } from './server.js';

export interface LoadingRegionProps extends HostProps<NativeLoadingRegion> {
  children?: ReactNode;
  placeholder?: ReactNode;
  refreshIndicator?: ReactNode;
  state?: LoadingState | undefined;
  cycle?: string | undefined;
  timing?: Timing | undefined;
  animations?: Pick<Animations<'region'>, 'handoff'> | undefined;
  preset?: RegionPreset | undefined;
  revealTargets?: readonly RevealTarget[] | undefined;
}

export const LoadingRegion = /* @__PURE__ */ forwardRef<
  NativeLoadingRegion,
  LoadingRegionProps
>(function LoadingRegion(
  {
    children,
    placeholder,
    refreshIndicator,
    state = 'ready',
    cycle,
    timing,
    animations,
    preset,
    revealTargets,
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
    state,
  }));
  const nonce = useStyleNonce(initial.policy, 'region');
  const host = useHost(
    ref,
    registerLoadingRegion,
    {
      state,
      cycle,
      timing,
      animations,
      preset,
      revealTargets,
      motion,
      stylePolicy: stylePolicy ?? initial.policy,
    },
    { onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError },
  );
  const hasPlaceholder = Children.toArray(placeholder).length > 0;
  const slot = (name: string, content: ReactNode) =>
    createElement(
      'div',
      {
        slot: name,
        'data-dotquilt-react-slot': '',
        'aria-hidden': true,
        inert: true,
      },
      content,
    );
  return [
    sheet(reactRegionStyles, initial.policy, 'region', nonce),
    createElement(
      'dotquilt-region',
      {
        key: 'host',
        ...attributes,
        ...policyAttributes(initial.policy, nonce),
        role: attributes.role ?? 'group',
        state: initial.state,
        'data-presentation': initial.state,
        motion: 'paused',
        ref: host,
        'data-dotquilt-react-empty': !hasPlaceholder ? '' : undefined,
      },
      hasPlaceholder ? slot('placeholder', placeholder) : null,
      refreshIndicator !== undefined
        ? slot('refresh-indicator', refreshIndicator)
        : null,
      children,
    ),
  ];
});

export type {
  DotquiltStyle,
  LoaderEvents,
  LoadingState,
  Motion,
  StylePolicy,
  Timing,
} from './types.js';
