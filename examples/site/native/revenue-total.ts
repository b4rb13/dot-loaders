import { registerTextLoader, type TextLoader } from 'dotquilt/text';

registerTextLoader();

const total = document.getElementById('total') as TextLoader | null;
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export async function showTotal(month: string): Promise<void> {
  if (!total) return;
  // Each load starts with the default handoff; an error below swaps at once.
  total.update({ state: 'pending', cycle: month, timing: undefined });
  try {
    const response = await fetch(`/api/revenue/${month}/total`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const body: { total: number } = await response.json();
    // A newer request took over while this one was in flight.
    if (total.cycle !== month) return;
    // The loader's own text is the value; the characters lock into it.
    total.textContent = money.format(body.total);
    total.update({ state: 'ready' });
  } catch {
    if (total.cycle !== month) return;
    total.textContent = 'Unavailable';
    total.update({ state: 'ready', timing: { duration: 0 } });
  }
}

void showTotal('2026-11');
