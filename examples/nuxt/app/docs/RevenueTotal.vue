<script setup lang="ts">
import { TextLoader } from '@dotquilt/vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

// Use it as <RevenueTotal month="2026-11" />; it loads again whenever month changes.
const props = defineProps<{ month: string }>();

async function fetchTotal(month: string, signal: AbortSignal): Promise<number> {
  const response = await fetch(`/api/revenue/${month}/total`, { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const { total } = await response.json();
  return total;
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type Result =
  | { status: 'loading' }
  | { status: 'done'; total: number }
  | { status: 'failed' };

const result = ref<Result>({ status: 'loading' });
let latest: AbortController | undefined;

function load(month: string) {
  latest?.abort();
  const request = new AbortController();
  latest = request;
  result.value = { status: 'loading' };
  fetchTotal(month, request.signal)
    .then((total) => {
      if (!request.signal.aborted) result.value = { status: 'done', total };
    })
    .catch(() => {
      if (!request.signal.aborted) result.value = { status: 'failed' };
    });
}

onMounted(() => load(props.month));
watch(() => props.month, load);
onUnmounted(() => latest?.abort());

// The loader takes its value as one piece of text.
const text = computed(() =>
  result.value.status === 'done'
    ? money.format(result.value.total)
    : result.value.status === 'failed'
      ? 'Unavailable'
      : '',
);
</script>

<template>
  <p class="kpi">
    <!-- The mask is the shape of the answer: the placeholder shows it in marks. -->
    <TextLoader
      aria-label="Revenue this month"
      mask="$00,000"
      :state="result.status === 'loading' ? 'pending' : 'ready'"
      :cycle="month"
      :timing="result.status === 'failed' ? { duration: 0 } : undefined"
    >{{ text }}</TextLoader>
  </p>
</template>
