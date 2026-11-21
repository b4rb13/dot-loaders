import { Component } from '@angular/core';
import { InvoiceTable } from './invoice-table';
import { RevenueChart } from './revenue-chart';

@Component({
  selector: 'app-revenue-page',
  imports: [InvoiceTable, RevenueChart],
  template: `
    <h1>Revenue</h1>
    <app-revenue-chart />
    <app-invoice-table />
  `,
})
export class RevenuePage {}
