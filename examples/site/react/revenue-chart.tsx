'use client';
import { ChartLoader, LoadingRegion } from '@dotquilt/react';
import type { TargetProvider } from 'dotquilt/chart';
import { useEffect, useState } from 'react';
import { linePath, linePoints } from '../data';

async function fetchRevenue(
  year: number,
  signal: AbortSignal,
): Promise<number[]> {
  const response = await fetch(`/api/revenue/${year}`, { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

type Result =
  | { status: 'loading' }
  | { status: 'done'; series: number[] }
  | { status: 'failed' };

export function RevenueChart({ year }: { year: number }) {
  const [result, setResult] = useState<Result>({ status: 'loading' });

  useEffect(() => {
    const request = new AbortController();
    setResult({ status: 'loading' });
    fetchRevenue(year, request.signal)
      .then((series) => setResult({ status: 'done', series }))
      .catch(() => {
        if (!request.signal.aborted) setResult({ status: 'failed' });
      });
    return () => request.abort();
  }, [year]);

  // Where the real line will be, in the loader's own size: the marks glide
  // onto it before the chart draws in.
  const target: TargetProvider = ({ width, height }) =>
    result.status === 'done'
      ? {
          kind: 'line',
          points: linePoints(result.series, width, height),
          baseline: height,
        }
      : null;

  return (
    <LoadingRegion
      aria-label={`Revenue in ${year}`}
      state={result.status === 'loading' ? 'pending' : 'ready'}
      cycle={String(year)}
      timing={result.status === 'failed' ? { duration: 0 } : undefined}
      placeholder={
        <ChartLoader
          variant="line"
          targetProvider={target}
          style={{ height: 160 }}
        />
      }
    >
      {result.status === 'done' && (
        <svg
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: 160 }}
          role="img"
          aria-label={`Revenue in ${year}, by month`}
        >
          <path
            d={linePath(result.series, 320, 160)}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {result.status === 'failed' && (
        <p role="alert">We couldn't load revenue. Try again later.</p>
      )}
    </LoadingRegion>
  );
}

export function Report() {
  return <RevenueChart year={2026} />;
}
