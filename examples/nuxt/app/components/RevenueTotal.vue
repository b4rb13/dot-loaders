<script setup lang="ts">
import { TextLoader } from '@dotquilt/vue';
import { onMounted, onUnmounted, ref } from 'vue';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const total = ref<number | null>(null);
const request = new AbortController();

onMounted(() => {
  $fetch<{ total: number }>('/api/revenue', { signal: request.signal })
    .then((body) => {
      total.value = body.total;
    })
    .catch(() => {});
});
onUnmounted(() => request.abort());
</script>

<template>
  <p class="kpi">
    <!-- The mask is the shape of the answer: the placeholder shows it in marks. -->
    <TextLoader
      aria-label="Revenue this month"
      mask="$00,000"
      :state="total === null ? 'pending' : 'ready'"
    >{{ total === null ? '' : money.format(total) }}</TextLoader>
  </p>
</template>
