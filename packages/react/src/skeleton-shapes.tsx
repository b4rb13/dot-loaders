'use client';
import type { Animations } from '@dotquilt-internal/core';
import {
  type SkeletonCircle as NativeSkeletonCircle,
  type SkeletonLine as NativeSkeletonLine,
  type SkeletonText as NativeSkeletonText,
  registerSkeletonCircle,
  registerSkeletonLine,
  registerSkeletonText,
  type SkeletonPreset,
} from '@dotquilt-internal/core/skeleton';
import {
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
  useState,
} from 'react';
import { useHost } from './host.js';
import {
  reactCircleMarkStyles,
  reactCircleStyles,
  reactLineMarkStyles,
  reactLineStyles,
  reactTextSkeletonMarkStyles,
  reactTextSkeletonStyles,
} from './server.js';
import {
  initialPolicy,
  markSheet,
  policyAttributes,
  sheet,
  useStyleNonce,
} from './static.js';
import type { HostProps } from './types.js';

export interface ShapeProps<
  E extends NativeSkeletonLine | NativeSkeletonCircle | NativeSkeletonText,
> extends HostProps<E> {
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'skeleton'> | undefined;
  preset?: SkeletonPreset | undefined;
}
export type SkeletonLineProps = ShapeProps<NativeSkeletonLine>;
export type SkeletonCircleProps = ShapeProps<NativeSkeletonCircle>;
export interface SkeletonTextProps extends ShapeProps<NativeSkeletonText> {
  lines?: number | undefined;
  widths?: readonly number[] | undefined;
}

function component<
  E extends NativeSkeletonLine | NativeSkeletonCircle | NativeSkeletonText,
>(
  name: string,
  register: () => void,
  css: readonly string[],
  markCss: readonly string[],
  multiline = false,
) {
  return forwardRef<
    E,
    ShapeProps<E> & {
      lines?: number | undefined;
      widths?: readonly number[] | undefined;
    }
  >(function SkeletonShape(
    {
      stylePolicy,
      animations,
      preset,
      speed,
      pointerResponse,
      motion,
      lines = 3,
      widths,
      onHandoffStart,
      onHandoffEnd,
      onHandoffCancel,
      onLoaderError,
      ...attributes
    },
    ref,
  ) {
    const [initial] = useState(() => {
      const count =
        Number.isInteger(lines) && lines > 0 ? Math.min(lines, 50) : 3;
      return {
        policy: initialPolicy(stylePolicy),
        speed: speed ?? preset?.speed ?? 1,
        pointerResponse: pointerResponse ?? preset?.pointerResponse ?? 'none',
        count,
        widths: Array.from({ length: count }, (_, index) => {
          const width = widths?.[index];
          return typeof width === 'number' &&
            Number.isFinite(width) &&
            width > 0 &&
            width <= 1
            ? width
            : count > 1 && index === count - 1
              ? 0.6
              : 1;
        }),
      };
    });
    const nonce = useStyleNonce(initial.policy, name);
    const host = useHost(
      ref,
      register,
      {
        stylePolicy: stylePolicy ?? initial.policy,
        animations,
        preset,
        speed,
        pointerResponse,
        motion,
        ...(multiline ? { lines, widths } : {}),
      },
      { onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError },
    );
    const Host = `dotquilt-${name}` as 'dotquilt-skeleton-line';
    return (
      <>
        {sheet(css, initial.policy, name, nonce)}
        {markSheet(markCss, initial.policy, name, nonce, attributes.mark)}
        <Host
          {...attributes}
          {...policyAttributes(initial.policy, nonce)}
          aria-hidden={attributes['aria-hidden'] ?? true}
          data-dotquilt-surface=""
          motion="paused"
          speed={initial.speed}
          pointer-response={initial.pointerResponse}
          {...(multiline ? { lines: initial.count } : {})}
          ref={host}
        >
          <span data-dotquilt-react-static="" aria-hidden>
            <span data-dotquilt-static="">
              {multiline
                ? initial.widths.map((width, index) => (
                    <svg
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative lines that never reorder
                      key={index}
                      data-dotquilt-static-line=""
                      width={`${width * 100}%`}
                      height={14}
                    />
                  ))
                : null}
            </span>
          </span>
        </Host>
      </>
    );
  });
}
export const SkeletonLine: ForwardRefExoticComponent<
  SkeletonLineProps & RefAttributes<NativeSkeletonLine>
> = /* @__PURE__ */ component<NativeSkeletonLine>(
  'skeleton-line',
  registerSkeletonLine,
  reactLineStyles,
  reactLineMarkStyles,
);
export const SkeletonCircle: ForwardRefExoticComponent<
  SkeletonCircleProps & RefAttributes<NativeSkeletonCircle>
> = /* @__PURE__ */ component<NativeSkeletonCircle>(
  'skeleton-circle',
  registerSkeletonCircle,
  reactCircleStyles,
  reactCircleMarkStyles,
);
export const SkeletonText = /* @__PURE__ */ component<NativeSkeletonText>(
  'skeleton-text',
  registerSkeletonText,
  reactTextSkeletonStyles,
  reactTextSkeletonMarkStyles,
  true,
);
