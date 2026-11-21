<script lang="ts">
import { LoadingRegion, TableLoader } from '@dotquilt/svelte';
import type { TableColumn } from 'dotquilt/table';
import { onMount } from 'svelte';

interface Invoice {
  customer: string;
  amount: string;
  status: string;
}

// The columns' kinds and widths shape the placeholder rows.
const columns: TableColumn[] = [
  { kind: 'text', width: 0.5 },
  { kind: 'number', width: 0.25 },
  { kind: 'badge', width: 0.25 },
];
let invoices = $state<Invoice[] | null>(null);
onMount(() => {
  const request = new AbortController();
  fetch('/api/invoices', { signal: request.signal })
    .then((response) => response.json() as Promise<Invoice[]>)
    .then((list) => {
      invoices = list;
    })
    .catch(() => {});
  return () => request.abort();
});
</script>

<h2>Invoices</h2>
<LoadingRegion aria-label="Invoices" state={invoices ? 'ready' : 'pending'}>
  {#snippet placeholder()}
    <TableLoader {columns} rows={4} mark="dash" />
  {/snippet}
  {#if invoices}
    <table class="invoices">
      <thead>
        <tr><th>Customer</th><th>Amount</th><th>Status</th></tr>
      </thead>
      <tbody>
        {#each invoices as invoice (invoice.customer)}
          <tr>
            <td>{invoice.customer}</td>
            <td>{invoice.amount}</td>
            <td>{invoice.status}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</LoadingRegion>
