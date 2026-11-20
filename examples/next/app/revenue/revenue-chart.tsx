'use client';
import { ChartLoader, LoadingRegion } from '@dotquilt/react';
import type { TargetProvider } from 'dotquilt/chart';
import { useEffect, useState } from 'react';

/** Where each value sits in a box of `width` × `height`. */
function linePoints(values: readonly number[], width: number, height: number) {
  const top = Math.max(...values) * 1.15;
  return values.map((value, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height - (value / top) * height,
  }));
}

export function RevenueChart() {
  const [series, setSeries] = useState<number[] | null>(null);

  useEffect(() => {
    const request = new AbortController();
    fetch('/api/revenue', { signal: request.signal })
      .then((response) => response.json() as Promise<{ series: number[] }>)
      .then((body) => setSeries(body.series))
      .catch(() => {});
    return () => request.abort();
  }, []);

  // Where the real line will be, in the loader's own size: the marks glide
  // onto it before the chart draws in.
  const target: TargetProvider = ({ width, height }) =>
    series
      ? {
          kind: 'line',
          points: linePoints(series, width, height),
          baseline: height,
        }
      : null;

  return (
    <LoadingRegion
      aria-label="Revenue by month"
      state={series ? 'ready' : 'pending'}
      placeholder={
        <ChartLoader
          variant="line"
          targetProvider={target}
          style={{ height: 160 }}
        />
      }
    >
      {series && (
        <svg
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: 160 }}
          role="img"
          aria-label="Revenue by month"
        >
          <path
            d={linePoints(series, 320, 160)
              .map(
                ({ x, y }, i) =>
                  `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`,
              )
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </LoadingRegion>
  );
}
