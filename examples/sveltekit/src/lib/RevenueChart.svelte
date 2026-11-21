<script lang="ts">
import { ChartLoader, LoadingRegion } from '@dotquilt/svelte';
import type { TargetProvider } from 'dotquilt/chart';
import { onMount } from 'svelte';

/** Where each value sits in a box of `width` × `height`. */
function linePoints(values: readonly number[], width: number, height: number) {
  const top = Math.max(...values) * 1.15;
  return values.map((value, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height - (value / top) * height,
  }));
}

let series = $state<number[] | null>(null);
onMount(() => {
  const request = new AbortController();
  fetch('/api/revenue', { signal: request.signal })
    .then((response) => response.json() as Promise<{ series: number[] }>)
    .then((body) => {
      series = body.series;
    })
    .catch(() => {});
  return () => request.abort();
});

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

const path = $derived(
  series
    ? linePoints(series, 320, 160)
        .map(({ x, y }, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(' ')
    : '',
);
</script>

<LoadingRegion aria-label="Revenue by month" state={series ? 'ready' : 'pending'}>
  {#snippet placeholder()}
    <ChartLoader variant="line" targetProvider={target} style="height: 160px" />
  {/snippet}
  {#if series}
    <svg
      viewBox="0 0 320 160"
      preserveAspectRatio="none"
      style="display: block; width: 100%; height: 160px"
      role="img"
      aria-label="Revenue by month"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  {/if}
</LoadingRegion>
