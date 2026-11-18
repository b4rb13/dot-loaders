'use client';
import type {
  HandoffDetail,
  LoadingState,
  Motion,
  StylePolicy,
} from '@dotquilt-internal/core';
import { definePreset } from '@dotquilt-internal/core/animations';
import {
  ChartLoader,
  LoadingRegion,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonLine,
  SkeletonText,
  TableLoader,
  TextLoader,
  TypingDots,
} from '@dotquilt-internal/react';
import {
  createElement as h,
  type ReactNode,
  Suspense,
  startTransition,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

export const catalogKeys = [
  'block',
  'line',
  'circle',
  'multiline',
  'typing',
  'chart',
  'table',
  'region',
  'text',
] as const;
export interface CatalogModel {
  state: LoadingState;
  cycle: string;
  duration: number;
  motion: Motion;
  alternate: boolean;
  presets: boolean;
  show: boolean;
}
export interface CatalogEvent {
  key: string;
  type: string;
  revision: number;
  id: number;
  cycle: string | undefined;
  at: number;
  reason: string | undefined;
}
export interface CatalogAPI {
  update(patch: Partial<CatalogModel>): void;
  rerender(): void;
  suspend(): void;
  resume(): void;
  remove(): void;
  refs: Record<string, HTMLElement>;
  events: CatalogEvent[];
  errors: string[];
  providers: { chart: number; table: number };
}
declare global {
  interface Window {
    catalogTest: CatalogAPI;
  }
}
const waitingForever = new Promise<never>(() => {});
const presets = {
  skeleton: definePreset({
    kind: 'skeleton',
    speed: 1.25,
    pointerResponse: 'lift',
  }),
  typing: definePreset({ kind: 'typing', speed: 1.25, count: 4 }),
  chart: definePreset({ kind: 'chart', speed: 1.25, variant: 'bar' }),
  table: definePreset({ kind: 'table', speed: 1.25 }),
  text: definePreset({ kind: 'text', speed: 1.25 }),
  region: definePreset({ kind: 'region', timing: { duration: 240 } }),
};

/** Executable packed-consumer example; also copied into the production Next fixture. */
export function Catalog({
  initialState,
  policy,
  cssPrefix = '/pkg/react/dist',
  extra,
}: {
  initialState: LoadingState;
  policy: StylePolicy;
  cssPrefix?: string;
  extra?: ReactNode;
}) {
  const [model, setModel] = useState<CatalogModel>({
    state: initialState,
    cycle: 'initial',
    duration: 600,
    motion: 'system',
    alternate: false,
    presets: false,
    show: true,
  });
  const [revision, setRevision] = useState(0),
    [waiting, setWaiting] = useState(false);
  const [row, setRow] = useState<HTMLTableRowElement | null>(null);
  const refs = useRef<Record<string, HTMLElement>>({}),
    events = useRef<CatalogEvent[]>([]),
    errors = useRef<string[]>([]);
  const providers = useRef({ chart: 0, table: 0 });
  const retainRow = useCallback(
    (node: HTMLTableRowElement | null) => setRow(node),
    [],
  );
  useLayoutEffect(() => {
    window.catalogTest = {
      update: (patch) =>
        flushSync(() => setModel((value) => ({ ...value, ...patch }))),
      rerender: () => flushSync(() => setRevision((value) => value + 1)),
      suspend: () =>
        startTransition(() => {
          setRevision((value) => value + 1);
          setWaiting(true);
        }),
      resume: () => flushSync(() => setWaiting(false)),
      remove: () =>
        flushSync(() => setModel((value) => ({ ...value, show: false }))),
      refs: refs.current,
      events: events.current,
      errors: errors.current,
      providers: providers.current,
    };
  });
  if (waiting) throw waitingForever;
  const sheet = (family: string): StylePolicy =>
    policy.mode === 'external'
      ? { mode: 'external', href: `${cssPrefix}/${family}.css` }
      : policy;
  const ref = (key: string) => (node: HTMLElement | null) => {
    if (node) refs.current[key] = node;
  };
  const observe = (key: string) => ({
    onHandoffStart: (e: CustomEvent<HandoffDetail>) =>
      events.current.push({
        key,
        type: 'start',
        revision,
        id: e.detail.handoffId,
        cycle: e.detail.cycle,
        reason: e.detail.reason,
        at: performance.now(),
      }),
    onHandoffEnd: (e: CustomEvent<HandoffDetail>) =>
      events.current.push({
        key,
        type: 'end',
        revision,
        id: e.detail.handoffId,
        cycle: e.detail.cycle,
        reason: e.detail.reason,
        at: performance.now(),
      }),
    onHandoffCancel: (e: CustomEvent<HandoffDetail>) =>
      events.current.push({
        key,
        type: 'cancel',
        revision,
        id: e.detail.handoffId,
        cycle: e.detail.cycle,
        reason: e.detail.reason,
        at: performance.now(),
      }),
    onLoaderError: (e: CustomEvent<{ code: string }>) =>
      errors.current.push(`${key}:${e.detail.code}`),
  });
  const common = (key: string, family: string) => ({
    id: `catalog-${key}`,
    className: 'catalog-surface',
    ref: ref(key),
    motion: model.motion,
    stylePolicy: sheet(family),
    ...observe(key),
  });
  const skeleton = model.presets ? presets.skeleton : undefined;
  const placeholder = (key: string) => {
    const config = {
      speed: model.alternate ? 1.5 : undefined,
      pointerResponse: model.alternate ? ('lift' as const) : undefined,
      preset: skeleton,
    };
    switch (key) {
      case 'block':
        return h(SkeletonBlock, { ...common(key, 'skeleton'), ...config });
      case 'line':
        return h(SkeletonLine, { ...common(key, 'line'), ...config });
      case 'circle':
        return h(SkeletonCircle, { ...common(key, 'circle'), ...config });
      case 'multiline':
        return h(SkeletonText, {
          ...common(key, 'skeleton-text'),
          ...config,
          lines: model.alternate ? 4 : undefined,
          widths: model.alternate ? [0.8, 0.5] : undefined,
        });
      case 'typing':
        return h(TypingDots, {
          ...common(key, 'typing'),
          preset: model.presets ? presets.typing : undefined,
          count: model.alternate ? 5 : undefined,
        });
      case 'chart':
        return h(ChartLoader, {
          ...common(key, 'chart'),
          preset: model.presets ? presets.chart : undefined,
          variant: model.alternate ? 'scatter' : undefined,
          targetProvider: ({ width, height }) => {
            if (typeof document === 'undefined')
              throw new Error('Chart provider ran on server');
            providers.current.chart++;
            return {
              kind: 'line',
              points: [
                { x: 0, y: height * 0.8 },
                { x: width, y: height * 0.2 },
              ],
              baseline: height,
            };
          },
        });
      case 'table':
        return h(TableLoader, {
          ...common(key, 'table'),
          preset: model.presets ? presets.table : undefined,
          rows: model.alternate ? 3 : undefined,
          rowHeight: model.alternate ? 24 : undefined,
          columns: model.alternate
            ? [{ kind: 'badge', width: 2 }, { kind: 'number' }]
            : undefined,
          targetProvider: ({ width, height }) => {
            if (typeof document === 'undefined')
              throw new Error('Table provider ran on server');
            providers.current.table++;
            return {
              kind: 'table',
              cells: [
                {
                  bounds: { x: 0, y: 0, width, height: Math.min(height, 24) },
                  text: '42',
                  baseline: 16,
                  tone: 'base',
                  rowId: 'catalog-row',
                  rowIndex: 0,
                  columnIndex: 0,
                  kind: 'number',
                  glyphs: [],
                },
              ],
            };
          },
        });
      default:
        return h('span', { 'aria-hidden': true }, 'Application placeholder');
    }
  };
  return h(
    'main',
    null,
    h(
      'button',
      {
        id: 'catalog-pending',
        type: 'button',
        onClick: () =>
          setModel((v) => ({
            ...v,
            state: 'pending',
            cycle: `${v.cycle}-next`,
          })),
      },
      'Load catalog',
    ),
    h(
      'button',
      {
        id: 'catalog-ready',
        type: 'button',
        onClick: () => setModel((v) => ({ ...v, state: 'ready' })),
      },
      'Show catalog',
    ),
    h('p', { role: 'status', id: 'catalog-status' }, model.state),
    h(
      'div',
      { id: 'catalog' },
      model.show
        ? catalogKeys.map((key) =>
            key === 'text'
              ? h(
                  'section',
                  { key },
                  h(
                    TextLoader,
                    {
                      ...common(key, 'text'),
                      state: model.state,
                      cycle: model.cycle,
                      mask: '000',
                      timing: { duration: model.duration },
                      preset: model.presets ? presets.text : undefined,
                    },
                    model.alternate ? 'Updated 42' : 0,
                  ),
                )
              : h(
                  'section',
                  { key },
                  h(
                    LoadingRegion,
                    {
                      id: `owner-${key}`,
                      className: 'catalog-owner',
                      ref: ref(`owner-${key}`),
                      state: model.state,
                      cycle: model.cycle,
                      motion: model.motion,
                      timing: { duration: model.duration },
                      preset: model.presets ? presets.region : undefined,
                      stylePolicy: sheet('region'),
                      placeholder: placeholder(key),
                      ...observe(key),
                      revealTargets:
                        key === 'table' && row
                          ? [{ id: 'catalog-row', element: row }]
                          : [],
                    },
                    h('label', { htmlFor: `input-${key}` }, `${key} outcome`),
                    h('input', {
                      id: `input-${key}`,
                      defaultValue: `server ${key}`,
                    }),
                    key === 'table'
                      ? h(
                          'table',
                          null,
                          h(
                            'tbody',
                            null,
                            h('tr', { ref: retainRow }, h('td', null, '42')),
                          ),
                        )
                      : null,
                  ),
                ),
          )
        : null,
    ),
    h(
      Suspense,
      {
        fallback: h(
          'p',
          { id: 'stream-fallback' },
          'Waiting for streamed detail',
        ),
      },
      extra ?? h('p', { id: 'streamed-detail' }, 'Streamed detail'),
    ),
    h('a', { id: 'catalog-recovery', href: '/recovery' }, 'Server recovery'),
  );
}
