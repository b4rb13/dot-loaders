import {
  type LoadingRegion,
  registerLoadingRegion,
} from '@dotquilt-internal/core/region';
import {
  registerTableLoader,
  type TableLoader,
} from '@dotquilt-internal/core/table';
import { type Invoice, invoiceColumns } from '../data';

registerLoadingRegion();
registerTableLoader();

const region = document.getElementById('invoices') as LoadingRegion | null;
const table = region?.querySelector('dotquilt-table-loader') as TableLoader;
const body = region?.querySelector('tbody');
// What each column holds, and its share of the width.
table.columns = invoiceColumns;

export async function showInvoices(): Promise<void> {
  if (!region || !body) return;
  region.update({ state: 'pending', cycle: 'invoices' });
  try {
    const response = await fetch('/api/invoices');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const invoices: Invoice[] = await response.json();
    body.replaceChildren(
      ...invoices.map((invoice) => {
        const row = document.createElement('tr');
        for (const value of [
          invoice.customer,
          invoice.amount,
          invoice.status,
          invoice.due,
        ])
          row.append(
            Object.assign(document.createElement('td'), { textContent: value }),
          );
        return row;
      }),
    );
    // Hand each real row to the region, so rows settle in one after another.
    region.update({
      revealTargets: [...body.rows].map((element, i) => ({
        id: `row-${i}`,
        element,
      })),
      state: 'ready',
    });
  } catch {
    const message = document.createElement('td');
    message.colSpan = 4;
    message.textContent = "We couldn't load invoices. Try again later.";
    body.replaceChildren(document.createElement('tr'));
    body.rows[0]?.append(message);
    region.update({ state: 'ready', timing: { duration: 0 } });
  }
}

void showInvoices();
