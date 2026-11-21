<script setup lang="ts">
import { ChartLoader, LoadingRegion } from '@dotquilt/vue';
import type { TargetProvider } from 'dotquilt/chart';
import { computed, onMounted, onUnmounted, ref } from 'vue';

/** Where each value sits in a box of `width` × `height`. */
function linePoints(values: readonly number[], width: number, height: number) {
  const top = Math.max(...values) * 1.15;
  return values.map((value, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height - (value / top) * height,
  }));
}

const series = ref<number[] | null>(null);
const request = new AbortController();
onMounted(() => {
  $fetch<{ series: number[] }>('/api/revenue', { signal: request.signal })
    .then((body) => {
      series.value = body.series;
    })
    .catch(() => {});
});
onUnmounted(() => request.abort());

// Where the real line will be, in the loader's own size: the marks glide
// onto it before the chart draws in.
const target: TargetProvider = ({ width, height }) =>
  series.value
    ? {
        kind: 'line',
        points: linePoints(series.value, width, height),
        baseline: height,
      }
    : null;

const path = computed(() =>
  series.value
    ? linePoints(series.value, 320, 160)
        .map(({ x, y }, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(' ')
    : '',
);
</script>

<template>
  <LoadingRegion
    aria-label="Revenue by month"
    :state="series ? 'ready' : 'pending'"
  >
    <template #placeholder>
      <ChartLoader variant="line" :target-provider="target" style="height: 160px" />
    </template>
    <svg
      v-if="series"
      viewBox="0 0 320 160"
      preserveAspectRatio="none"
      style="display: block; width: 100%; height: 160px"
      role="img"
      aria-label="Revenue by month"
    >
      <path
        :d="path"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </LoadingRegion>
</template>
