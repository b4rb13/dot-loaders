<script lang="ts">
// Use it as <RevenueTotal month="2026-11" />; it loads again whenever month
// changes.
import { TextLoader } from '@dotquilt/svelte';

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

let { month }: { month: string } = $props();
let result = $state<Result>({ status: 'loading' });

$effect(() => {
  const request = new AbortController();
  result = { status: 'loading' };
  fetchTotal(month, request.signal)
    .then((total) => {
      result = { status: 'done', total };
    })
    .catch(() => {
      if (!request.signal.aborted) result = { status: 'failed' };
    });
  return () => request.abort();
});
</script>

<p class="kpi">
  <!-- The mask is the shape of the answer: the placeholder shows it in marks. -->
  <TextLoader
    aria-label="Revenue this month"
    mask="$00,000"
    state={result.status === 'loading' ? 'pending' : 'ready'}
    cycle={month}
    timing={result.status === 'failed' ? { duration: 0 } : undefined}
    >{result.status === 'done'
      ? money.format(result.total)
      : result.status === 'failed'
        ? 'Unavailable'
        : ''}</TextLoader
  >
</p>
