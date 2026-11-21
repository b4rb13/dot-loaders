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
import type { TableColumn } from 'dotquilt/table';

interface Invoice {
  customer: string;
  amount: string;
  status: string;
}

@Component({
  selector: 'app-invoice-table',
  imports: [DotquiltPlaceholder, LoadingRegion, TableLoader],
  template: `
    <h2>Invoices</h2>
    <dotquilt-region
      aria-label="Invoices"
      [state]="invoices() ? 'ready' : 'pending'"
    >
      <div dotquiltPlaceholder>
        <dotquilt-table-loader [columns]="columns" [rows]="4" mark="dash" />
      </div>
      @if (invoices(); as list) {
        <table class="invoices">
          <thead>
            <tr><th>Customer</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            @for (invoice of list; track invoice.customer) {
              <tr>
                <td>{{ invoice.customer }}</td>
                <td>{{ invoice.amount }}</td>
                <td>{{ invoice.status }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </dotquilt-region>
  `,
})
export class InvoiceTable {
  // The columns' kinds and widths shape the placeholder rows.
  protected readonly columns: TableColumn[] = [
    { kind: 'text', width: 0.5 },
    { kind: 'number', width: 0.25 },
    { kind: 'badge', width: 0.25 },
  ];
  protected readonly invoices = signal<Invoice[] | null>(null);

  constructor() {
    const request = new AbortController();
    afterNextRender(() => {
      fetch('/api/invoices', { signal: request.signal })
        .then((response) => response.json() as Promise<Invoice[]>)
        .then((list) => this.invoices.set(list))
        .catch(() => {});
    });
    inject(DestroyRef).onDestroy(() => request.abort());
  }
}
