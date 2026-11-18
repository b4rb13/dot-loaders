'use client';
import {
  type TypingDots as NativeTypingDots,
  registerTypingDots,
  type TypingPreset,
} from '@dotquilt-internal/core/typing';
import { Fragment, forwardRef, createElement as h, useState } from 'react';
import { useHost } from './host.js';
import { reactTypingStyles } from './server.js';
import {
  initialPolicy,
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
  return h(
    Fragment,
    null,
    sheet(reactTypingStyles, initial.policy, 'typing', nonce),
    h(
      'dotquilt-typing-dots',
      {
        ...attributes,
        ...policyAttributes(initial.policy, nonce),
        'aria-hidden': attributes['aria-hidden'] ?? true,
        'data-dotquilt-surface': '',
        count: initial.count,
        speed: initial.speed,
        motion: 'paused',
        ref: host,
      },
      h(
        'span',
        { 'data-dotquilt-react-static': '', 'aria-hidden': true },
        h(
          'span',
          { 'data-dotquilt-static': '' },
          Array.from({ length: initial.count }, (_, index) =>
            h('i', { key: index, className: 'dot' }),
          ),
        ),
      ),
    ),
  );
});
