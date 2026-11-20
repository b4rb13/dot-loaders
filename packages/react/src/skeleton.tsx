'use client';
import type { Animations } from 'dotquilt';
import {
  type SkeletonBlock as NativeSkeletonBlock,
  registerSkeletonBlock,
  type SkeletonPreset,
} from 'dotquilt/skeleton';
import { forwardRef, useState } from 'react';
import { useHost } from './host.js';
import { reactSkeletonMarkStyles, reactSkeletonStyles } from './server.js';
import {
  initialPolicy,
  markSheet,
  policyAttributes,
  sheet,
  useStyleNonce,
} from './static.js';
import type { HostProps } from './types.js';

export interface SkeletonBlockProps extends HostProps<NativeSkeletonBlock> {
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'skeleton'> | undefined;
  preset?: SkeletonPreset | undefined;
}
export const SkeletonBlock = /* @__PURE__ */ forwardRef<
  NativeSkeletonBlock,
  SkeletonBlockProps
>(function SkeletonBlock(
  {
    stylePolicy,
    animations,
    preset,
    speed,
    pointerResponse,
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
    speed: speed ?? preset?.speed ?? 1,
    pointerResponse: pointerResponse ?? preset?.pointerResponse ?? 'none',
  }));
  const nonce = useStyleNonce(initial.policy, 'skeleton');
  const host = useHost(
    ref,
    registerSkeletonBlock,
    {
      stylePolicy: stylePolicy ?? initial.policy,
      animations,
      preset,
      speed,
      pointerResponse,
      motion,
    },
    { onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError },
  );
  return (
    <>
      {sheet(reactSkeletonStyles, initial.policy, 'skeleton', nonce)}
      {markSheet(
        reactSkeletonMarkStyles,
        initial.policy,
        'skeleton',
        nonce,
        attributes.mark,
      )}
      <dotquilt-skeleton-block
        {...attributes}
        {...policyAttributes(initial.policy, nonce)}
        aria-hidden={attributes['aria-hidden'] ?? true}
        data-dotquilt-surface=""
        motion="paused"
        speed={initial.speed}
        pointer-response={initial.pointerResponse}
        ref={host}
      >
        <span data-dotquilt-react-static="" aria-hidden>
          <span data-dotquilt-static="" />
        </span>
      </dotquilt-skeleton-block>
    </>
  );
});
export type {
  SkeletonCircleProps,
  SkeletonLineProps,
  SkeletonTextProps,
} from './skeleton-shapes.js';
export {
  SkeletonCircle,
  SkeletonLine,
  SkeletonText,
} from './skeleton-shapes.js';
export type {
  DotquiltStyle,
  LoaderEvents,
  Motion,
  StylePolicy,
} from './types.js';
