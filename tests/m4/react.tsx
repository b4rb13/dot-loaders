import type { SkeletonText as NativeSkeletonText } from '@dotquilt-internal/core/skeleton';
import {
  SkeletonCircle,
  SkeletonLine,
  SkeletonText,
} from '@dotquilt-internal/react/skeleton';
import { TypingDots } from '@dotquilt-internal/react/typing';
import { createRef, createElement as h, StrictMode, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';

const errors: string[] = [];
const textRef = createRef<NativeSkeletonText>();
const before =
  typeof document === 'undefined'
    ? null
    : document.getElementById('react-value');
let change: ((n: number) => void) | undefined;
export function Fixture({
  mode = typeof location === 'undefined'
    ? null
    : new URL(location.href).searchParams.get('mode'),
}: {
  mode?: string | null;
}) {
  const policies = (css: string) =>
    mode?.startsWith('external')
      ? {
          mode: 'external' as const,
          href: `/react/styles/${mode === 'external-family' && css !== 'typing' ? 'skeleton-family' : css}.css`,
        }
      : {
          mode: 'inline' as const,
          ...(mode === 'nonce' ? { nonce: 'm4-fixture' } : {}),
        };

  const [lines, setLines] = useState(4);
  if (typeof document !== 'undefined') change = setLines;
  return h(
    StrictMode,
    null,
    h(SkeletonLine, {
      id: 'react-line',
      className: 'line',
      stylePolicy: policies('line'),
    }),
    h(SkeletonCircle, { id: 'react-circle', stylePolicy: policies('circle') }),
    h(SkeletonText, {
      id: 'react-multiline',
      className: 'multiline',
      lines,
      widths: [0.8, 0.4],
      ref: textRef,
      stylePolicy: policies('skeleton-text'),
    }),
    h(TypingDots, {
      id: 'react-typing',
      count: 3,
      stylePolicy: policies('typing'),
    }),
    h('input', { id: 'react-value', defaultValue: 'kept' }),
  );
}
if (typeof document !== 'undefined') {
  const root = hydrateRoot(
    document.getElementById('app') as HTMLElement,
    h(Fixture, {}),
    { onRecoverableError: (error) => errors.push(String(error)) },
  );
  Object.assign(window, {
    m4React: {
      errors,
      ref: () => textRef.current?.lines,
      change: (lines: number) => change?.(lines),
      identity: () => before === document.getElementById('react-value'),
      unmount: () => root.unmount(),
    },
  });
}
