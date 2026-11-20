import {
  LoadingRegion,
  type LoadingState,
  type Motion,
  SkeletonBlock,
  type StylePolicy,
} from '@dotquilt/react';
import { defineAnimation, type LoadingRegion as NativeRegion } from 'dotquilt';
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

export interface FixtureOptions {
  catalog?: boolean;
  state: LoadingState;
  mode: string;
  nonce: string;
  skeletonOnly?: boolean;
  extra?: ReactNode;
  empty?: boolean;
}
interface Model {
  state: LoadingState;
  cycle: string | undefined;
  duration: number | undefined;
  motion: Motion;
  show: boolean;
  targets: boolean;
}
interface Observed {
  type: string;
  cycle: string | undefined;
  id: number;
  version: number;
  target: string;
}
export interface FixtureAPI {
  update(patch: Partial<Model>): void;
  rerender(): void;
  pendingRender(): void;
  resumeRender(): void;
  unmount(): void;
  state(): Model;
}
declare global {
  interface Window {
    fixture: FixtureAPI;
    fixtureEvents: Observed[];
    fixtureErrors: string[];
    fixtureFlags: { reentrant?: boolean };
    beforeInput: HTMLInputElement | null;
    beforeRects: Record<
      string,
      { x: number; y: number; width: number; height: number }
    >;
    fixtureRefs: { hasUpdate: boolean; node: Element | null }[];
    hydrateFixture(): void;
    destroyFixture(): void;
    fixtureHydrated: boolean;
    fixtureViolations: string[];
    fixtureShifts: {
      value: number;
      startTime: number;
      hadRecentInput: boolean;
    }[];
  }
}
const suspended = new Promise<never>(() => {});
const handoff = defineAnimation({
  contractVersion: 1,
  id: 'example/react/handoff',
  family: 'region',
  phase: 'handoff',
  options: { parse: () => ({}) },
  duration: () => 500,
  prepare: () => ({}),
  frame({ frame, dot, reveal, revealTarget, surface }) {
    dot({
      x: 10 + frame.progress * 30,
      y: 10,
      size: 2,
      opacity: 1 - frame.progress,
      tone: 'base',
    });
    reveal({ opacity: frame.progress });
    for (const id of surface.revealTargetIds)
      revealTarget(id, { opacity: frame.progress });
  },
});
function StatefulContent() {
  const [count, setCount] = useState(0);
  return h(
    'section',
    { id: 'stateful-content' },
    h('label', { htmlFor: 'preserved-input' }, 'Account note'),
    h('input', { id: 'preserved-input', defaultValue: 'server value' }),
    h(
      'button',
      { id: 'counter', type: 'button', onClick: () => setCount((v) => v + 1) },
      `Count ${count}`,
    ),
  );
}
function EmptyContent() {
  return null;
}
export function Fixture(options: FixtureOptions) {
  const [model, setModel] = useState<Model>(() => ({
    state: options.state,
    cycle: 'initial',
    duration: undefined,
    motion: 'system',
    show: true,
    targets: false,
  }));
  const [version, setVersion] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const region = useRef<NativeRegion | null>(null);
  const ref = useCallback((node: NativeRegion | null) => {
    region.current = node;
    window.fixtureRefs.push({
      hasUpdate: !!node && typeof node.update === 'function',
      node,
    });
  }, []);
  const policy = (family: string): StylePolicy =>
    options.mode === 'external'
      ? { mode: 'external', href: `/pkg/react/dist/${family}.css` }
      : options.mode === 'nonce'
        ? { mode: 'inline', nonce: options.nonce }
        : { mode: 'inline' };
  useLayoutEffect(() => {
    window.fixture = {
      update: (patch) => flushSync(() => setModel((v) => ({ ...v, ...patch }))),
      rerender: () => flushSync(() => setVersion((v) => v + 1)),
      pendingRender: () =>
        startTransition(() => {
          setWaiting(true);
          setVersion((v) => v + 1);
        }),
      resumeRender: () => flushSync(() => setWaiting(false)),
      unmount: () => flushSync(() => setModel((v) => ({ ...v, show: false }))),
      state: () => model,
    };
    window.fixtureHydrated = true;
  });
  if (waiting) throw suspended;
  if (options.skeletonOnly)
    return h(SkeletonBlock, {
      id: 'only-skeleton',
      className: 'fixture-skeleton',
      stylePolicy: policy('skeleton'),
      motion: model.motion,
    });
  if (options.empty)
    return h(
      LoadingRegion,
      {
        id: 'react-region',
        className: 'fixture-region',
        state: model.state,
        stylePolicy: policy('region'),
        onLoaderError: (event) => window.fixtureErrors.push(event.detail.code),
      },
      h(EmptyContent),
    );
  const observe = (
    type: string,
    event: CustomEvent<{ cycle: string | undefined; handoffId: number }>,
  ) => {
    window.fixtureEvents.push({
      type,
      cycle: event.detail.cycle,
      id: event.detail.handoffId,
      version,
      target: (event.target as Element).id,
    });
    if (type === 'start' && window.fixtureFlags.reentrant)
      flushSync(() =>
        setModel((v) => ({ ...v, state: 'pending', cycle: 'reentrant' })),
      );
  };
  return h(
    'main',
    null,
    h('p', { id: 'before' }, 'Before the loading region'),
    h(
      'p',
      { role: 'status', 'aria-live': 'polite', id: 'application-status' },
      model.state === 'ready' ? 'Account available' : 'Updating account',
    ),
    model.show
      ? h(
          LoadingRegion,
          {
            id: 'react-region',
            ref,
            className: 'fixture-region',
            'aria-label': 'Account',
            state: model.state,
            cycle: model.cycle,
            motion: model.motion,
            timing:
              model.duration === undefined
                ? undefined
                : { duration: model.duration },
            animations: { handoff: handoff() },
            revealTargets:
              model.targets && target ? [{ id: 'row', element: target }] : [],
            stylePolicy: policy('region'),
            placeholder: h(SkeletonBlock, {
              id: 'react-skeleton',
              className: 'fixture-skeleton',
              stylePolicy: policy('skeleton'),
            }),
            refreshIndicator: h(
              'span',
              { id: 'refresh-indicator' },
              'Refreshing',
            ),
            onHandoffStart: (event) => observe('start', event),
            onHandoffEnd: (event) => observe('end', event),
            onHandoffCancel: (event) => observe('cancel', event),
            onLoaderError: (event) =>
              window.fixtureErrors.push(event.detail.code),
          },
          h(StatefulContent),
          h('div', { id: 'reveal-row', ref: setTarget }, 'Explicit row'),
          h(
            Suspense,
            {
              fallback: h(
                'p',
                { id: 'stream-fallback' },
                'Waiting for streamed detail',
              ),
            },
            options.extra ??
              h('p', { id: 'streamed-detail' }, 'Streamed detail'),
          ),
          h(
            LoadingRegion,
            {
              id: 'nested-region',
              state: 'ready',
              stylePolicy: policy('region'),
            },
            'Nested ready outcome',
          ),
        )
      : null,
    h('p', { id: 'after' }, 'After the loading region'),
    h(
      'a',
      { id: 'recovery', href: '/recovery' },
      'Open the server-rendered account',
    ),
  );
}
