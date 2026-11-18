import type * as Core from '@dotquilt-internal/core';
import * as adapter from '@dotquilt-internal/react';
import { createElement as h, useLayoutEffect } from 'react';

export type Family = 'skeleton' | 'region' | 'text' | 'chart' | 'table';
export const css = (family: string) => ({
  mode: 'external' as const,
  href: `/styles/${family}.css`,
});
export interface Model {
  family: Family;
  state: Core.LoadingState;
  cycle: string;
  motion: Core.Motion;
  variant: Core.ChartVariant;
}
export const initial = (family: Family): Model => ({
  family,
  state: 'pending',
  cycle: 'initial',
  motion: 'paused',
  variant: 'line',
});
export function Scene({
  model,
  index,
  behavior = {},
  targets,
  onCommit,
}: {
  model: Model;
  index: number;
  behavior?: Record<string, unknown>;
  targets?: readonly Core.RevealTarget[] | undefined;
  onCommit?: (() => void) | undefined;
}) {
  useLayoutEffect(() => onCommit?.(), [onCommit]);
  const id = `owner-${index}`;
  if (model.family === 'text')
    return h(
      adapter.TextLoader,
      {
        id,
        ...behavior,
        state: model.state,
        cycle: model.cycle,
        motion: model.motion,
        mask: 'Loading',
        stylePolicy: css('text'),
      },
      'Outcome',
    );
  const common = {
    id: `source-${index}`,
    stylePolicy: css(model.family === 'region' ? 'skeleton' : model.family),
    motion: model.motion,
  };
  const placeholder =
    model.family === 'chart'
      ? h(adapter.ChartLoader, {
          ...common,
          ...behavior,
          variant: model.variant,
        })
      : model.family === 'table'
        ? h(adapter.TableLoader, {
            ...common,
            ...behavior,
            rows: 2,
            columns: [{ kind: 'text', width: 1 }],
          })
        : h(adapter.SkeletonBlock, {
            ...common,
            ...(model.family === 'skeleton' ? behavior : {}),
          });
  return h(
    adapter.LoadingRegion,
    {
      id,
      state: model.state,
      cycle: model.cycle,
      motion: model.motion,
      stylePolicy: css('region'),
      revealTargets: targets,
      placeholder,
      ...(model.family === 'region' ? behavior : {}),
    },
    h('input', {
      id: `input-${index}`,
      'aria-label': `Input ${index}`,
      defaultValue: 'retained',
    }),
    h('p', { id: `row-${index}-0` }, 'Row A'),
    h('p', { id: `row-${index}-1` }, 'Row B'),
  );
}
