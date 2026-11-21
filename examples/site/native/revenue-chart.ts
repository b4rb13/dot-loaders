import { type ChartLoader, registerChartLoader } from 'dotquilt/chart';
import { type LoadingRegion, registerLoadingRegion } from 'dotquilt/region';
import { linePath, linePoints } from '../data';

registerLoadingRegion();
registerChartLoader();

const region = document.getElementById('revenue') as LoadingRegion | null;
const chart = region?.querySelector('dotquilt-chart-loader') as ChartLoader;
const line = region?.querySelector('path');

export async function showRevenue(year: number): Promise<void> {
  if (!region || !line) return;
  const cycle = String(year);
  // Each load starts with the default handoff; an error below swaps at once.
  region.update({ state: 'pending', cycle, timing: undefined });
  try {
    const response = await fetch(`/api/revenue/${year}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const series: number[] = await response.json();
    if (region.cycle !== cycle) return;
    line.setAttribute('d', linePath(series, 320, 160));
    // Where the real line will be, in the loader's own size: the marks glide
    // onto it before the chart draws in.
    chart.targetProvider = ({ width, height }) => ({
      kind: 'line',
      points: linePoints(series, width, height),
      baseline: height,
    });
    region.update({ state: 'ready' });
  } catch {
    if (region.cycle !== cycle) return;
    region.querySelector('.chart-error')?.removeAttribute('hidden');
    region.update({ state: 'ready', timing: { duration: 0 } });
  }
}

void showRevenue(2026);
