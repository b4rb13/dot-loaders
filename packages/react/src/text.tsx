'use client';
import type { Animations, LoadingState, Timing } from '@dotquilt-internal/core';
import {
  type TextLoader as NativeTextLoader,
  registerTextLoader,
  type TextPreset,
} from '@dotquilt-internal/core/text';
import { forwardRef, useState } from 'react';
import { useHost } from './host.js';
import { reactTextMarkStyles, reactTextStyles } from './server.js';
import {
  initialPolicy,
  markSheet,
  policyAttributes,
  sheet,
  useStyleNonce,
  useUpgradeAttributes,
} from './static.js';
import type { HostProps } from './types.js';
export interface TextLoaderProps extends HostProps<NativeTextLoader> {
  children?: string | number | undefined;
  mask?: string | undefined;
  state?: LoadingState | undefined;
  cycle?: string | undefined;
  /** Milliseconds to wait before showing the placeholder. */
  delay?: number | undefined;
  /** Milliseconds a placeholder stays once shown. */
  minDisplay?: number | undefined;
  timing?: Timing | undefined;
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'text'> | undefined;
  preset?: TextPreset | undefined;
}
export const TextLoader = /* @__PURE__ */ forwardRef<
  NativeTextLoader,
  TextLoaderProps
>(function TextLoader(
  {
    children,
    mask,
    state = 'ready',
    cycle,
    delay,
    minDisplay,
    timing,
    speed,
    pointerResponse,
    animations,
    preset,
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
    mask:
      (mask ?? String(children ?? '')).length <= 256
        ? (mask ?? String(children ?? ''))
        : '',
  }));
  const nonce = useStyleNonce(initial.policy, 'text');
  const upgraded = useUpgradeAttributes([
    'data-custom',
    'data-presentation',
    'data-dotquilt-glyphs',
  ]);
  const contentAttributes = useUpgradeAttributes(['aria-hidden', 'inert'], {
    'aria-hidden': initial.state === 'pending' ? 'true' : null,
    inert: initial.state === 'pending' ? '' : null,
  });
  const host = useHost(
    ref,
    registerTextLoader,
    {
      state,
      cycle,
      delay,
      minDisplay,
      timing,
      speed,
      pointerResponse,
      animations,
      preset,
      mask,
      motion,
      stylePolicy: stylePolicy ?? initial.policy,
    },
    { onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError },
  );
  return (
    <>
      {sheet(reactTextStyles, initial.policy, 'text', nonce)}
      {markSheet(
        reactTextMarkStyles,
        initial.policy,
        'text',
        nonce,
        attributes.mark,
      )}
      <dotquilt-text-loader
        {...attributes}
        {...upgraded}
        {...policyAttributes(initial.policy, nonce)}
        role={attributes.role ?? 'group'}
        state={initial.state}
        mask={initial.mask}
        motion="paused"
        ref={host}
      >
        <span
          slot="placeholder"
          data-dotquilt-text-placeholder=""
          aria-hidden
          inert
        >
          {initial.mask}
        </span>
        <span
          data-dotquilt-text-content=""
          {...contentAttributes}
          inert={contentAttributes.inert === '' ? true : undefined}
        >
          {children}
        </span>
      </dotquilt-text-loader>
    </>
  );
});
