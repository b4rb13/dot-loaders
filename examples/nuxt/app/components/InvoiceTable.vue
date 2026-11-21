<script setup lang="ts">
import { LoadingRegion, TableLoader } from '@dotquilt/vue';
import type { TableColumn } from 'dotquilt/table';
import { onMounted, onUnmounted, ref } from 'vue';

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
const invoices = ref<Invoice[] | null>(null);
const request = new AbortController();
onMounted(() => {
  $fetch<Invoice[]>('/api/invoices', { signal: request.signal })
    .then((list) => {
      invoices.value = list;
    })
    .catch(() => {});
});
onUnmounted(() => request.abort());
</script>

<template>
  <h2>Invoices</h2>
  <LoadingRegion aria-label="Invoices" :state="invoices ? 'ready' : 'pending'">
    <template #placeholder>
      <TableLoader :columns="columns" :rows="4" mark="dash" />
    </template>
    <table v-if="invoices" class="invoices">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in invoices" :key="invoice.customer">
          <td>{{ invoice.customer }}</td>
          <td>{{ invoice.amount }}</td>
          <td>{{ invoice.status }}</td>
        </tr>
      </tbody>
    </table>
  </LoadingRegion>
</template>
