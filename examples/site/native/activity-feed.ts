import { type LoadingRegion, registerLoadingRegion } from 'dotquilt/region';
import { registerSkeletonText } from 'dotquilt/skeleton';

registerLoadingRegion();
registerSkeletonText();

const region = document.getElementById('activity') as LoadingRegion | null;
const list = region?.querySelector('[data-items]');
const button = document.getElementById('refresh') as HTMLButtonElement | null;
let requests = 0;

async function load(): Promise<void> {
  if (!region || !list) return;
  const cycle = `activity-${++requests}`;
  // The first load hides the feed; later ones keep it visible and usable.
  region.update({
    state: list.children.length ? 'refreshing' : 'pending',
    cycle,
  });
  try {
    const response = await fetch('/api/activity');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const items: string[] = await response.json();
    if (region.cycle !== cycle) return;
    list.replaceChildren(
      ...items.map((item) =>
        Object.assign(document.createElement('li'), { textContent: item }),
      ),
    );
    region.update({ state: 'ready' });
  } catch {
    if (region.cycle !== cycle) return;
    // A failed refresh keeps the feed you already have.
    if (!list.children.length)
      list.append(
        Object.assign(document.createElement('li'), {
          textContent: "We couldn't load activity. Try again later.",
        }),
      );
    region.update({ state: 'ready', timing: { duration: 0 } });
  }
}

button?.addEventListener('click', () => void load());
void load();
