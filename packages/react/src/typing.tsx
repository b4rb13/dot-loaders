'use client';
import {
  type TypingDots as NativeTypingDots,
  registerTypingDots,
  type TypingPreset,
} from '@dotquilt-internal/core/typing';
import { forwardRef, useState } from 'react';
import { useHost } from './host.js';
import { reactTypingMarkStyles, reactTypingStyles } from './server.js';
import {
  initialPolicy,
  markSheet,
  policyAttributes,
  sheet,
  useStyleNonce,
} from './static.js';
import type { HostProps } from './types.js';

export interface TypingDotsProps extends HostProps<NativeTypingDots> {
  count?: number | undefined;
  preset?: TypingPreset | undefined;
  speed?: number | undefined;
}
export const TypingDots = /* @__PURE__ */ forwardRef<
  NativeTypingDots,
  TypingDotsProps
>(function TypingDots(
  {
    count,
    preset,
    speed,
    motion,
    stylePolicy,
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
    count:
      Number.isInteger(count ?? preset?.count ?? 3) &&
      (count ?? preset?.count ?? 3) > 0
        ? Math.min(count ?? preset?.count ?? 3, 8)
        : 3,
    speed: speed ?? preset?.speed ?? 1,
  }));
  const nonce = useStyleNonce(initial.policy, 'typing');
  const host = useHost(
    ref,
    registerTypingDots,
    {
      count,
      speed,
      preset,
      motion,
      stylePolicy: stylePolicy ?? initial.policy,
    },
    { onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError },
  );
  return (
    <>
      {sheet(reactTypingStyles, initial.policy, 'typing', nonce)}
      {markSheet(
        reactTypingMarkStyles,
        initial.policy,
        'typing',
        nonce,
        attributes.mark,
      )}
      <dotquilt-typing-dots
        {...attributes}
        {...policyAttributes(initial.policy, nonce)}
        aria-hidden={attributes['aria-hidden'] ?? true}
        data-dotquilt-surface=""
        count={initial.count}
        speed={initial.speed}
        motion="paused"
        ref={host}
      >
        <span data-dotquilt-react-static="" aria-hidden>
          <span data-dotquilt-static="">
            {Array.from({ length: initial.count }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative dots that never reorder
              <i key={index} className="dot" />
            ))}
          </span>
        </span>
      </dotquilt-typing-dots>
    </>
  );
});
