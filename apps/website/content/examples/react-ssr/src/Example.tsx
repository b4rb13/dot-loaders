import {
  LoadingRegion,
  type LoadingState,
} from '@dotquilt-internal/react/region';
import {
  SkeletonBlock,
  type StylePolicy,
} from '@dotquilt-internal/react/skeleton';
import { useEffect, useState } from 'react';

export function Example({
  initialState,
  policy,
  children,
}: {
  initialState: LoadingState;
  policy: StylePolicy;
  children?: React.ReactNode;
}) {
  const [state, setState] = useState(initialState);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => setActive(true), []);
  const placeholderPolicy =
    policy.mode === 'external'
      ? { mode: 'external' as const, href: '/dotquilt/skeleton.css' }
      : policy;
  function begin(next: 'pending' | 'refreshing') {
    setCycle((value) => value + 1);
    setState(next);
  }
  return (
    <>
      <div className="actions">
        <button
          type="button"
          disabled={!active}
          onClick={() => begin('pending')}
        >
          Load replacement
        </button>
        <button
          type="button"
          disabled={!active}
          onClick={() => begin('refreshing')}
        >
          Refresh content
        </button>
        <button
          type="button"
          disabled={!active}
          onClick={() => setState('ready')}
        >
          Show outcome
        </button>
        <button
          type="button"
          disabled={!active}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          Pause motion
        </button>
      </div>
      <p role="status">
        {state === 'ready' ? 'Account available' : 'Loading account'}
      </p>
      <LoadingRegion
        id="account"
        className="region"
        state={state}
        cycle={String(cycle)}
        stylePolicy={policy}
        motion={paused ? 'paused' : 'system'}
        placeholder={
          <SkeletonBlock className="skeleton" stylePolicy={placeholderPolicy} />
        }
        refreshIndicator={<span>Refreshing account</span>}
      >
        <label htmlFor="note">Account note</label>
        <input id="note" defaultValue="Server account" />
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          Count {count}
        </button>
        {children}
      </LoadingRegion>
    </>
  );
}
