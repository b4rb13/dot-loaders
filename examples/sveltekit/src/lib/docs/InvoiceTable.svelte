<script lang="ts">
// Use it as <InvoiceTable />; it loads once, when it mounts.
import { LoadingRegion, TableLoader } from '@dotquilt/svelte';
import { type Invoice, invoiceColumns } from './data';

async function fetchInvoices(signal: AbortSignal): Promise<Invoice[]> {
  const response = await fetch('/api/invoices', { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

let invoices = $state<Invoice[] | null>(null);
let failed = $state(false);

$effect(() => {
  const request = new AbortController();
  fetchInvoices(request.signal)
    .then((list) => {
      invoices = list;
    })
    .catch(() => {
      if (!request.signal.aborted) failed = true;
    });
  return () => request.abort();
});

// The handoff reads the real table: each cell's marks become its text.
const ready = $derived(failed || invoices !== null);
</script>

<LoadingRegion
  aria-label="Invoices"
  state={ready ? 'ready' : 'pending'}
  timing={failed ? { duration: 0 } : undefined}
>
  {#snippet placeholder()}
    <TableLoader rows={4} rowHeight={40} columns={invoiceColumns} />
  {/snippet}
  {#if failed}
    <p role="alert">We couldn't load invoices. Try again later.</p>
  {:else}
    <table class="invoices">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {#each invoices ?? [] as invoice (invoice.customer)}
          <tr>
            <td>{invoice.customer}</td>
            <td>{invoice.amount}</td>
            <td>{invoice.status}</td>
            <td>{invoice.due}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</LoadingRegion>
