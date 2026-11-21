<script lang="ts">
import { TextLoader } from '@dotquilt/svelte';
import { onMount } from 'svelte';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
let total = $state<number | null>(null);

onMount(() => {
  const request = new AbortController();
  fetch('/api/revenue', { signal: request.signal })
    .then((response) => response.json() as Promise<{ total: number }>)
    .then((body) => {
      total = body.total;
    })
    .catch(() => {});
  return () => request.abort();
});
</script>

<p class="kpi">
  <!-- The mask is the shape of the answer: the placeholder shows it in marks. -->
  <TextLoader
    aria-label="Revenue this month"
    mask="$00,000"
    state={total === null ? 'pending' : 'ready'}
    >{total === null ? '' : money.format(total)}</TextLoader
  >
</p>
