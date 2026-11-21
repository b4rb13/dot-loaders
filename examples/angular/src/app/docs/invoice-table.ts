// Use it as <app-invoice-table />; it loads once, in the browser.
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  DotquiltPlaceholder,
  LoadingRegion,
  TableLoader,
} from '@dotquilt/angular';
import { type Invoice, invoiceColumns } from './data';

async function fetchInvoices(signal: AbortSignal): Promise<Invoice[]> {
  const response = await fetch('/api/invoices', { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

@Component({
  selector: 'app-invoice-table',
  imports: [DotquiltPlaceholder, LoadingRegion, TableLoader],
  template: `
    <!-- The handoff reads the real table: each cell's marks become its text. -->
    <dotquilt-region
      aria-label="Invoices"
      [state]="failed() || invoices() !== null ? 'ready' : 'pending'"
      [timing]="failed() ? { duration: 0 } : undefined"
    >
      <div dotquiltPlaceholder>
        <dotquilt-table-loader
          [rows]="4"
          [rowHeight]="40"
          [columns]="columns"
        />
      </div>
      @if (failed()) {
        <p role="alert">We couldn't load invoices. Try again later.</p>
      } @else {
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
            @for (invoice of invoices(); track invoice.customer) {
              <tr>
                <td>{{ invoice.customer }}</td>
                <td>{{ invoice.amount }}</td>
                <td>{{ invoice.status }}</td>
                <td>{{ invoice.due }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </dotquilt-region>
  `,
})
export class InvoiceTable {
  protected readonly columns = invoiceColumns;
  protected readonly invoices = signal<Invoice[] | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    const request = new AbortController();
    // In the browser only: the server renders the placeholder.
    afterNextRender(() => {
      fetchInvoices(request.signal)
        .then((list) => this.invoices.set(list))
        .catch(() => {
          if (!request.signal.aborted) this.failed.set(true);
        });
    });
    inject(DestroyRef).onDestroy(() => request.abort());
  }
}
