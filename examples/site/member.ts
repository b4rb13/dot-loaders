import {
  type LoadingRegion,
  registerLoadingRegion,
} from '@dotquilt-internal/core/region';
import {
  registerSkeletonCircle,
  registerSkeletonLine,
} from '@dotquilt-internal/core/skeleton';

registerLoadingRegion();
registerSkeletonCircle();
registerSkeletonLine();

const region = document.getElementById('member') as LoadingRegion | null;

export async function showMember(id: string): Promise<void> {
  if (!region) return;
  // Each request is a new cycle; the placeholder shows until it settles.
  region.update({ state: 'pending', cycle: id });
  try {
    const response = await fetch(`/api/members/${id}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const member: Record<string, string> = await response.json();
    // A newer request took over while this one was in flight.
    if (region.cycle !== id) return;
    for (const field of region.querySelectorAll<HTMLElement>('[data-field]'))
      field.textContent = member[field.dataset.field ?? ''] ?? '';
    region.update({ state: 'ready' });
  } catch {
    if (region.cycle !== id) return;
    const card = region.querySelector('article');
    if (card)
      card.textContent = "We couldn't load this member. Try again later.";
    // An error replaces the placeholder at once, without the handoff.
    region.update({ state: 'ready', timing: { duration: 0 } });
  }
}

void showMember('ada');
