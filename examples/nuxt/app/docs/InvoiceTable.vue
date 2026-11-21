<script setup lang="ts">
import { LoadingRegion, TableLoader } from '@dotquilt/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { type Invoice, invoiceColumns } from './data';

// Use it as <InvoiceTable />; it loads once, when it mounts.
async function fetchInvoices(signal: AbortSignal): Promise<Invoice[]> {
  const response = await fetch('/api/invoices', { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

const invoices = ref<Invoice[] | null>(null);
const failed = ref(false);
const request = new AbortController();

// Fetch in the browser only, so the server HTML holds the placeholder.
onMounted(() => {
  fetchInvoices(request.signal)
    .then((list) => {
      invoices.value = list;
    })
    .catch(() => {
      if (!request.signal.aborted) failed.value = true;
    });
});
onUnmounted(() => request.abort());

// The handoff reads the real table: each cell's marks become its text.
const ready = computed(() => failed.value || invoices.value !== null);
</script>

<template>
  <LoadingRegion
    aria-label="Invoices"
    :state="ready ? 'ready' : 'pending'"
    :timing="failed ? { duration: 0 } : undefined"
  >
    <template #placeholder>
      <TableLoader :rows="4" :row-height="40" :columns="invoiceColumns" />
    </template>
    <p v-if="failed" role="alert">We couldn't load invoices. Try again later.</p>
    <table v-else class="invoices">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in invoices" :key="invoice.customer">
          <td>{{ invoice.customer }}</td>
          <td>{{ invoice.amount }}</td>
          <td>{{ invoice.status }}</td>
          <td>{{ invoice.due }}</td>
        </tr>
      </tbody>
    </table>
  </LoadingRegion>
</template>
