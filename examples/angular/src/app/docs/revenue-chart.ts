// Use it as <app-revenue-chart [year]="2026" />; it loads again whenever year
// changes.
import {
  afterRenderEffect,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import {
  ChartLoader,
  DotquiltPlaceholder,
  LoadingRegion,
} from '@dotquilt/angular';
import type { TargetProvider } from 'dotquilt/chart';
import { linePath, linePoints } from './data';

async function fetchRevenue(
  year: number,
  signal: AbortSignal,
): Promise<number[]> {
  const response = await fetch(`/api/revenue/${year}`, { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

type Result =
  | { status: 'loading' }
  | { status: 'done'; series: number[] }
  | { status: 'failed' };

@Component({
  selector: 'app-revenue-chart',
  imports: [ChartLoader, DotquiltPlaceholder, LoadingRegion],
  template: `
    @let current = result();
    <dotquilt-region
      aria-label="Revenue in {{ year() }}"
      [state]="current.status === 'loading' ? 'pending' : 'ready'"
      [cycle]="year().toString()"
      [timing]="current.status === 'failed' ? { duration: 0 } : undefined"
    >
      <div dotquiltPlaceholder>
        <dotquilt-chart-loader
          variant="line"
          [targetProvider]="target"
          style="height: 160px"
        />
      </div>
      @if (current.status === 'done') {
        <svg
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
          style="display: block; width: 100%; height: 160px"
          role="img"
          aria-label="Revenue in {{ year() }}, by month"
        >
          <path
            [attr.d]="path()"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      } @else if (current.status === 'failed') {
        <p role="alert">We couldn't load revenue. Try again later.</p>
      }
    </dotquilt-region>
  `,
})
export class RevenueChart {
  readonly year = input.required<number>();
  protected readonly result = signal<Result>({ status: 'loading' });
  protected readonly path = computed(() => {
    const result = this.result();
    return result.status === 'done' ? linePath(result.series, 320, 160) : '';
  });

  // Where the real line will be, in the loader's own size: the marks glide
  // onto it before the chart draws in.
  protected readonly target: TargetProvider = ({ width, height }) => {
    const result = this.result();
    return result.status === 'done'
      ? {
          kind: 'line',
          points: linePoints(result.series, width, height),
          baseline: height,
        }
      : null;
  };

  constructor() {
    afterRenderEffect((onCleanup) => {
      const request = new AbortController();
      this.result.set({ status: 'loading' });
      fetchRevenue(this.year(), request.signal)
        .then((series) => this.result.set({ status: 'done', series }))
        .catch(() => {
          if (!request.signal.aborted) this.result.set({ status: 'failed' });
        });
      onCleanup(() => request.abort());
    });
  }
}
