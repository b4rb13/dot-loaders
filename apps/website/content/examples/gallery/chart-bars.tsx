'use client';
import type { LoadingState, Motion } from '@dotquilt-internal/core';
import { bars, morphWipe } from '@dotquilt-internal/core/animations/chart';
import type { ChartInput } from '@dotquilt-internal/core/chart';
import { ChartLoader } from '@dotquilt-internal/react/chart';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { useEffect, useState } from 'react';

const animations = { idle: bars(), handoff: morphWipe() };
const values = [0.16, 0.35, 0.28, 0.52, 0.48, 0.8, 0.77, 0.96];
function project({
  width,
  height,
}: {
  width: number;
  height: number;
}): ChartInput {
  const points = values.map((value, i) => ({
    x: (width * (10 + i * 40)) / 320,
    y: (height * (170 - value * 150)) / 180,
  }));
  return {
    kind: 'bar',
    baseline: (height * 170) / 180,
    bars: points.map((p) => ({
      x: p.x - (width * 8) / 320,
      y: p.y,
      width: (width * 16) / 320,
      height: (height * 170) / 180 - p.y,
    })),
  };
}
const geometry = project({ width: 320, height: 180 });

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
        style={{ display: 'grid', width: '100%', minHeight: 180 }}
        placeholder={
          <ChartLoader
            variant="bar"
            targetProvider={project}
            animations={animations}
            style={{ display: 'block', width: '100%', height: 180 }}
          />
        }
      >
        <svg
          viewBox="0 0 320 180"
          preserveAspectRatio="none"
          role="img"
          aria-label="Illustrative bar chart"
          style={{ display: 'block', width: '100%', height: 180 }}
        >
          {geometry.kind === 'bar' ? (
            geometry.bars.map((bar, i) => (
              <rect key={values[i]} {...bar} fill="currentColor" />
            ))
          ) : geometry.kind === 'line' ? (
            <path
              d={geometry.points
                .map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`)
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          ) : (
            geometry.points.map((p, i) => (
              <circle
                key={values[i]}
                cx={p.x}
                cy={p.y}
                r={4}
                fill="currentColor"
              />
            ))
          )}
        </svg>
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
