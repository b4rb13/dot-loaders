import { ChartLoader } from '@dotquilt/react/chart';
import { LoadingRegion } from '@dotquilt/react/region';
import type {
  ChartInput,
  ChartVariant,
  ChartLoader as NativeChartLoader,
} from 'dotquilt/chart';
import { createRef, createElement as h, StrictMode, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';

const ref = createRef<NativeChartLoader>(),
  errors: string[] = [],
  events: string[] = [];
let change: ((state: 'pending' | 'ready' | 'refreshing') => void) | undefined;
export function ChartFixture({
  mode = typeof location === 'undefined'
    ? 'inline'
    : new URL(location.href).searchParams.get('mode'),
  variant = 'line',
}: {
  mode?: string | null;
  variant?: ChartVariant;
}) {
  const [state, setState] = useState<'pending' | 'ready' | 'refreshing'>(
    'pending',
  );
  change = setState;
  const policy = (name: string) =>
    mode?.startsWith('external')
      ? { mode: 'external' as const, href: `/react/styles/${name}.css` }
      : {
          mode: 'inline' as const,
          ...(mode === 'nonce' ? { nonce: 'm4-fixture' } : {}),
        };
  const provider = ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }): ChartInput =>
    variant === 'bar'
      ? {
          kind: 'bar',
          bars: [{ x: 20, y: 40, width: 60, height: height - 40 }],
          baseline: height,
        }
      : variant === 'scatter'
        ? { kind: 'scatter', points: [{ x: width / 2, y: height / 2 }] }
        : {
            kind: 'line',
            points: [
              { x: 0, y: height * 0.7 },
              { x: width, y: height * 0.3 },
            ],
            baseline: height,
          };
  return h(
    StrictMode,
    null,
    h(
      LoadingRegion,
      {
        id: 'chart-region',
        state,
        placeholder: h(ChartLoader, {
          id: 'chart',
          ref,
          variant,
          targetProvider: provider,
          stylePolicy: policy('chart'),
        }),
        stylePolicy: policy('region'),
        onHandoffStart: () => events.push('start'),
        onHandoffEnd: () => events.push('end'),
        onHandoffCancel: () => events.push('cancel'),
      },
      h(
        'div',
        { id: 'chart-content' },
        h(
          'button',
          { id: 'chart-control', type: 'button' },
          'Application chart',
        ),
      ),
    ),
  );
}
if (typeof document !== 'undefined') {
  const before = document.getElementById('chart-content'),
    node = before?.firstChild,
    root = hydrateRoot(
      document.getElementById('app') as HTMLElement,
      h(ChartFixture, {
        variant: (new URL(location.href).searchParams.get('variant') ??
          'line') as ChartVariant,
      }),
      { onRecoverableError: (error) => errors.push(String(error)) },
    );
  Object.assign(window, {
    m4ChartReact: {
      errors,
      events,
      change: (state: 'pending' | 'ready' | 'refreshing') => change?.(state),
      identity: () =>
        document.getElementById('chart-content') === before &&
        before?.firstChild === node,
      ref: () => ref.current?.localName,
      unmount: () => root.unmount(),
    },
  });
}
