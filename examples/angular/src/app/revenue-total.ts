import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { TextLoader } from '@dotquilt/angular';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-revenue-total',
  imports: [TextLoader],
  template: `
    <p class="kpi">
      <!-- The mask is the shape of the answer: the placeholder shows it in marks. -->
      <dotquilt-text-loader
        aria-label="Revenue this month"
        mask="$00,000"
        [state]="total() === null ? 'pending' : 'ready'"
        >{{ text() }}</dotquilt-text-loader
      >
    </p>
  `,
})
export class RevenueTotal {
  protected readonly total = signal<number | null>(null);

  constructor() {
    const request = new AbortController();
    afterNextRender(() => {
      fetch('/api/revenue', { signal: request.signal })
        .then((response) => response.json() as Promise<{ total: number }>)
        .then((body) => this.total.set(body.total))
        .catch(() => {});
    });
    inject(DestroyRef).onDestroy(() => request.abort());
  }

  protected text() {
    const total = this.total();
    return total === null ? '' : money.format(total);
  }
}
