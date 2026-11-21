import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  ChartLoader,
  DotquiltPlaceholder,
  LoadingRegion,
} from '@dotquilt/angular';
import type { TargetProvider } from 'dotquilt/chart';

/** Where each value sits in a box of `width` × `height`. */
function linePoints(values: readonly number[], width: number, height: number) {
  const top = Math.max(...values) * 1.15;
  return values.map((value, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height - (value / top) * height,
  }));
}

@Component({
  selector: 'app-revenue-chart',
  imports: [ChartLoader, DotquiltPlaceholder, LoadingRegion],
  template: `
    <dotquilt-region
      aria-label="Revenue by month"
      [state]="series() ? 'ready' : 'pending'"
    >
      <div dotquiltPlaceholder>
        <dotquilt-chart-loader
          variant="line"
          [targetProvider]="target"
          style="height: 160px"
        />
      </div>
      @if (series()) {
        <svg
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
          style="display: block; width: 100%; height: 160px"
          role="img"
          aria-label="Revenue by month"
        >
          <path
            [attr.d]="path()"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      }
    </dotquilt-region>
  `,
})
export class RevenueChart {
  protected readonly series = signal<number[] | null>(null);
  // Where the real line will be, in the loader's own size: the marks glide
  // onto it before the chart draws in.
  protected readonly target: TargetProvider = ({ width, height }) => {
    const series = this.series();
    return series
      ? {
          kind: 'line',
          points: linePoints(series, width, height),
          baseline: height,
        }
      : null;
  };
  protected readonly path = computed(() => {
    const series = this.series();
    return series
      ? linePoints(series, 320, 160)
          .map(
            ({ x, y }, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`,
          )
          .join(' ')
      : '';
  });

  constructor() {
    const request = new AbortController();
    afterNextRender(() => {
      fetch('/api/revenue', { signal: request.signal })
        .then((response) => response.json() as Promise<{ series: number[] }>)
        .then((body) => this.series.set(body.series))
        .catch(() => {});
    });
    inject(DestroyRef).onDestroy(() => request.abort());
  }
}
