// Use it as <app-revenue-total month="2026-11" />; it loads again whenever
// month changes.
import {
  afterRenderEffect,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { TextLoader } from '@dotquilt/angular';

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

@Component({
  selector: 'app-revenue-total',
  imports: [TextLoader],
  template: `
    @let current = result();
    <p class="kpi">
      <!-- The mask is the shape of the answer: the placeholder shows it in marks. -->
      <dotquilt-text-loader
        aria-label="Revenue this month"
        mask="$00,000"
        [state]="current.status === 'loading' ? 'pending' : 'ready'"
        [cycle]="month()"
        [timing]="current.status === 'failed' ? { duration: 0 } : undefined"
        >{{ text() }}</dotquilt-text-loader
      >
    </p>
  `,
})
export class RevenueTotal {
  readonly month = input.required<string>();
  protected readonly result = signal<Result>({ status: 'loading' });
  protected readonly text = computed(() => {
    const result = this.result();
    return result.status === 'done'
      ? money.format(result.total)
      : result.status === 'failed'
        ? 'Unavailable'
        : '';
  });

  constructor() {
    afterRenderEffect((onCleanup) => {
      const request = new AbortController();
      this.result.set({ status: 'loading' });
      fetchTotal(this.month(), request.signal)
        .then((total) => this.result.set({ status: 'done', total }))
        .catch(() => {
          if (!request.signal.aborted) this.result.set({ status: 'failed' });
        });
      onCleanup(() => request.abort());
    });
  }
}
