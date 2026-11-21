<script setup lang="ts">
import { ChartLoader, LoadingRegion } from '@dotquilt/vue';
import type { TargetProvider } from 'dotquilt/chart';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { linePath, linePoints } from './data';

// Use it as <RevenueChart :year="2026" />; it loads again whenever year changes.
const props = defineProps<{ year: number }>();

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

const result = ref<Result>({ status: 'loading' });
let latest: AbortController | undefined;

function load(year: number) {
  latest?.abort();
  const request = new AbortController();
  latest = request;
  result.value = { status: 'loading' };
  fetchRevenue(year, request.signal)
    .then((series) => {
      if (!request.signal.aborted) result.value = { status: 'done', series };
    })
    .catch(() => {
      if (!request.signal.aborted) result.value = { status: 'failed' };
    });
}

onMounted(() => load(props.year));
watch(() => props.year, load);
onUnmounted(() => latest?.abort());

// Where the real line will be, in the loader's own size: the marks glide
// onto it before the chart draws in.
const target: TargetProvider = ({ width, height }) =>
  result.value.status === 'done'
    ? {
        kind: 'line',
        points: linePoints(result.value.series, width, height),
        baseline: height,
      }
    : null;
</script>

<template>
  <LoadingRegion
    :aria-label="`Revenue in ${year}`"
    :state="result.status === 'loading' ? 'pending' : 'ready'"
    :cycle="String(year)"
    :timing="result.status === 'failed' ? { duration: 0 } : undefined"
  >
    <template #placeholder>
      <ChartLoader
        variant="line"
        :target-provider="target"
        style="height: 160px"
      />
    </template>
    <svg
      v-if="result.status === 'done'"
      viewBox="0 0 320 160"
      preserveAspectRatio="none"
      style="display: block; width: 100%; height: 160px"
      role="img"
      :aria-label="`Revenue in ${year}, by month`"
    >
      <path
        :d="linePath(result.series, 320, 160)"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <p v-else-if="result.status === 'failed'" role="alert">
      We couldn't load revenue. Try again later.
    </p>
  </LoadingRegion>
</template>
