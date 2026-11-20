/**
 * The activity feed. It loads from its placeholder on arrival. After that
 * the hold control refreshes it: the region's thread of marks rests above
 * the feed while it is held, and letting go brings the new items in at the
 * top while the older ones glide down. The feed scrolls inside its own
 * height, so the page never moves.
 */
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import { Connection } from './hold';
import { arriveOnce, jitter, reducedMotion } from './lib';
import { incoming } from './screens';

/** The feed keeps this many items; older ones drop off the end. */
const kept = 12;

export function startActivity() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-activity]');
  if (!section) return;
  const region = section.querySelector<LoadingRegion>('[data-feed-region]');
  const list = section.querySelector<HTMLElement>('[data-feed]');
  const scroller = section.querySelector<HTMLElement>('[data-feed-scroll]');
  const note = section.querySelector<HTMLElement>('[data-note]');
  const controls = section.querySelector<HTMLElement>('[data-controls]');
  if (!region || !list || !scroller || !note || !controls) return;

  let next = 0;
  let count = 0;
  /** Whether the load in flight is the first one, from the placeholder. */
  let first = false;

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

  /** New items settle in at the top; the older ones glide down. */
  function bringIn() {
    if (!list || !scroller) return 0;
    count++;
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
    while (list.children.length > kept) list.lastElementChild?.remove();
    // The newest items are at the top of the feed: show them there.
    scroller.scrollTo({
      top: 0,
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
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
    return fresh.length;
  }

  const connection = new Connection({
    name: 'activity',
    subject: 'The feed',
    root: controls,
    labels: ['Hold to refresh', 'Let go to deliver', 'Hold to refresh again'],
    words: { waiting: 'Refreshing', arrived: 'Updated after' },
    begin: (cycle) => {
      // The first load shows the placeholder; every later one refreshes in
      // place, under the thread of marks.
      first = region.state === 'pending';
      region.update({ state: first ? 'pending' : 'refreshing', cycle });
      note.textContent = first ? 'Loading…' : 'Refreshing…';
    },
    deliver: (handoff) => {
      if (first) {
        region.update({ state: 'ready', timing: handoff });
        note.textContent = 'Up to date.';
        return;
      }
      const added = bringIn();
      region.update({ state: 'ready' });
      note.textContent = `${added} new ${added === 1 ? 'item' : 'items'}.`;
    },
  });

  const arrives = arriveOnce(section, () => {
    if (arrives) connection.auto(jitter(1300));
  });
  if (arrives) region.update({ state: 'pending' });
}
