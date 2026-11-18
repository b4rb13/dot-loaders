'use client';
import type { LoadingState, Motion } from '@dotquilt-internal/core';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { TypingDots } from '@dotquilt-internal/react/typing';
import { useEffect, useState } from 'react';

// Paste this file into a React client component. The default inline style policy
// needs no CSS asset setup; strict-CSP applications should use the CSP guide.
export default function Example({ motion = 'system' }: { motion?: Motion }) {
  const [state, setState] = useState<LoadingState>('ready');
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const playback = paused || motion === 'paused' ? 'paused' : 'system';
  // These controls simulate application outcomes. Replace them with your current
  // request's lifecycle, rejecting stale responses before marking it ready.
  function start(next: 'pending' | 'refreshing') {
    setCycle((value) => value + 1);
    setState(next);
  }
  return (
    <section aria-label="Copyable loading example" style={{ margin: 0 }}>
      <LoadingRegion
        state={state}
        cycle={String(cycle)}
        motion={playback}
        style={{ display: 'grid', minHeight: 150, width: '100%' }}
        placeholder={
          <TypingDots
            count={3}
            style={{ display: 'block', width: 100, height: 50 }}
          />
        }
      >
        <article>
          <h3>Your content stays here.</h3>
          <p>
            This is real application content, kept mounted through loading and
            reveal. The data is illustrative.
          </p>
        </article>
      </LoadingRegion>
      <fieldset
        aria-label="Example loading controls"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          margin: '24px 0 0',
          padding: 0,
          border: 0,
          minWidth: 0,
        }}
      >
        <button
          type="button"
          style={{ minHeight: 44, padding: '8px 12px' }}
          disabled={!interactive}
          onClick={() => start('pending')}
        >
          Start loading
        </button>
        <button
          type="button"
          style={{ minHeight: 44, padding: '8px 12px' }}
          disabled={!interactive}
          onClick={() => start('refreshing')}
        >
          Refresh content
        </button>
        <button
          type="button"
          style={{ minHeight: 44, padding: '8px 12px' }}
          disabled={!interactive || state === 'ready'}
          onClick={() => setState('ready')}
        >
          Reveal content
        </button>
        <button
          type="button"
          style={{ minHeight: 44, padding: '8px 12px' }}
          disabled={!interactive}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? 'Resume example' : 'Pause example'}
        </button>
      </fieldset>
      <p role="status">
        {state === 'ready'
          ? 'Current content ready.'
          : 'Loading the current request.'}
      </p>
    </section>
  );
}
