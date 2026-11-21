<script lang="ts">
// Use it as <RevenueChart year={2026} />; it loads again whenever year
// changes.
import { ChartLoader, LoadingRegion } from '@dotquilt/svelte';
import type { TargetProvider } from 'dotquilt/chart';
import { linePath, linePoints } from './data';

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

let { year }: { year: number } = $props();
let result = $state<Result>({ status: 'loading' });

$effect(() => {
  const request = new AbortController();
  result = { status: 'loading' };
  fetchRevenue(year, request.signal)
    .then((series) => {
      result = { status: 'done', series };
    })
    .catch(() => {
      if (!request.signal.aborted) result = { status: 'failed' };
    });
  return () => request.abort();
});

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
</script>

<LoadingRegion
  aria-label="Revenue in {year}"
  state={result.status === 'loading' ? 'pending' : 'ready'}
  cycle={String(year)}
  timing={result.status === 'failed' ? { duration: 0 } : undefined}
>
  {#snippet placeholder()}
    <ChartLoader variant="line" targetProvider={target} style="height: 160px" />
  {/snippet}
  {#if result.status === 'done'}
    <svg
      viewBox="0 0 320 160"
      preserveAspectRatio="none"
      style="display: block; width: 100%; height: 160px"
      role="img"
      aria-label="Revenue in {year}, by month"
    >
      <path
        d={linePath(result.series, 320, 160)}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  {:else if result.status === 'failed'}
    <p role="alert">We couldn't load revenue. Try again later.</p>
  {/if}
</LoadingRegion>
