'use client';
import type { LoadingRegion as NativeRegion } from '@dotquilt-internal/core';
import {
  LoadingRegion,
  type LoadingState,
  SkeletonBlock,
} from '@dotquilt-internal/react';
import { type ReactNode, useEffect, useRef, useState, version } from 'react';
import { useDocumentPolicy } from './policy';
export function Panel({
  initialState,
  children,
  name,
}: {
  initialState: LoadingState;
  children: ReactNode;
  name: string;
}) {
  const policy = useDocumentPolicy();
  const skeletonPolicy =
    policy.mode === 'external'
      ? { mode: 'external' as const, href: '/dotquilt/skeleton.css' }
      : policy;
  const [state, setState] = useState(initialState),
    [cycle, setCycle] = useState(0),
    [count, setCount] = useState(0);
  const region = useRef<NativeRegion | null>(null);
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'yes';
    document.documentElement.dataset.nativeRef = String(
      typeof region.current?.update === 'function',
    );
    document.documentElement.dataset.reactVersion = version;
  }, []);
  const next = (value: LoadingState) => {
    setState(value);
    if (value === 'pending') setCycle((v) => v + 1);
  };
  return (
    <main>
      <h1>{name}</h1>
      <div id="actions">
        <button type="button" id="pending" onClick={() => next('pending')}>
          Load replacement
        </button>
        <button type="button" id="refresh" onClick={() => next('refreshing')}>
          Refresh
        </button>
        <button type="button" id="ready" onClick={() => next('ready')}>
          Show outcome
        </button>
      </div>
      <p id="status" role="status" aria-live="polite">
        {state === 'ready' ? 'Account available' : 'Loading account'}
      </p>
      <LoadingRegion
        id="next-region"
        ref={region}
        className="region"
        state={state}
        cycle={String(cycle)}
        stylePolicy={policy}
        timing={{ duration: 150 }}
        aria-label="Account"
        placeholder={
          <SkeletonBlock className="skeleton" stylePolicy={skeletonPolicy} />
        }
        refreshIndicator={<span>Refreshing</span>}
      >
        <label htmlFor="next-input">Account note</label>
        <input id="next-input" defaultValue="Server account" />
        <button
          type="button"
          id="content-counter"
          onClick={() => setCount(count + 1)}
        >
          Count {count}
        </button>
        {children}
      </LoadingRegion>
      <a id="recovery" href="/other">
        Open server account
      </a>
    </main>
  );
}
