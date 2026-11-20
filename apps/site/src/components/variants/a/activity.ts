/**
 * The activity feed: Refresh shows the region's thread of marks while the
 * update loads; the new items then settle in at the top, and the older ones
 * glide down to make room.
 */
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import { incoming } from './data';
import { arriveOnce, jitter, reducedMotion } from './lib';

export function startActivity() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-activity]');
  if (!section) return;
  const region = section.querySelector<LoadingRegion>('[data-feed-region]');
  const list = section.querySelector<HTMLElement>('[data-feed]');
  const button = section.querySelector<HTMLButtonElement>('[data-refresh]');
  const status = section.querySelector<HTMLElement>('[data-status]');
  if (!region || !list || !button || !status) return;

  let next = 0;
  let count = 0;
  let busy = false;

  const arrives = arriveOnce(section, () => {
    if (!arrives) return;
    setTimeout(() => region.update({ state: 'ready' }), jitter(1300));
  });
  if (arrives) region.update({ state: 'pending' });

  function item(initials: string, text: string, time: string) {
    const li = document.createElement('li');
    li.className = 'va-feed-item';
    const avatar = document.createElement('span');
    avatar.className = 'va-avatar';
    avatar.textContent = initials;
    const body = document.createElement('span');
    body.className = 'text';
    const link = document.createElement('span');
    link.className = 'what';
    link.textContent = text;
    const stamp = document.createElement('time');
    stamp.textContent = time;
    body.append(link, stamp);
    li.append(avatar, body);
    return li;
  }

  button.addEventListener('click', () => {
    if (busy || region.state !== 'ready') return;
    busy = true;
    button.setAttribute('aria-disabled', 'true');
    const cycle = `va-feed-${++count}`;
    region.update({ state: 'refreshing', cycle });
    status.textContent = 'Refreshing…';
    setTimeout(() => {
      if (region.cycle !== cycle) return;
      // One or two new items each time.
      const fresh = Array.from({ length: 1 + (count % 2) }, () => {
        const entry = incoming[next++ % incoming.length];
        return item(entry?.initials ?? '', entry?.text ?? '', 'just now');
      });
      // Older items: where they were, so they can glide down.
      const before = new Map(
        [...list.children].map((child) => [
          child,
          child.getBoundingClientRect().top,
        ]),
      );
      for (const old of list.querySelectorAll('time'))
        if (old.textContent === 'just now') old.textContent = '1 min ago';
      list.prepend(...fresh);
      // Keep the feed to eight items.
      while (list.children.length > 8) list.lastElementChild?.remove();
      if (!reducedMotion()) {
        fresh.forEach((li, i) => {
          li.setAttribute('data-new', '');
          li.style.setProperty('--i', String(i));
        });
        for (const [child, top] of before) {
          if (!child.isConnected) continue;
          const element = child as HTMLElement;
          const shift = top - element.getBoundingClientRect().top;
          element.style.setProperty('--shift', `${shift}px`);
          element.removeAttribute('data-shift');
          void element.offsetWidth;
          element.setAttribute('data-shift', '');
        }
      }
      region.update({ state: 'ready' });
      status.textContent = `${fresh.length} new ${fresh.length === 1 ? 'item' : 'items'}.`;
      busy = false;
      button.removeAttribute('aria-disabled');
    }, jitter(1500));
  });
}
