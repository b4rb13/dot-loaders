/**
 * Shared timing for variant B's sections. Each section has one orchestrated
 * arrival: when it scrolls into view, its content arrives from marks. With
 * reduced motion there is no arrival; the content is already in place.
 */
import { refreshStyles } from 'dotquilt';
import { registerAll } from 'dotquilt/register-all';
import { onTheme } from './theme';

registerAll();
onTheme(() => {
  const page = document.querySelector('[data-vb-page]');
  if (page) refreshStyles(page);
});

export const still = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Whether the page armed its arrivals before it painted (motion allowed). */
export const arriving = (): boolean =>
  document.querySelector('[data-vb-page]')?.hasAttribute('data-arrive') ??
  false;

/** Calls `arrive` once, when `element` is well into view. */
export function whenSeen(
  element: Element,
  arrive: () => void,
  threshold = 0.35,
): void {
  const section = element.closest('section');
  if (section && !primed.has(section)) {
    primed.add(section);
    primeNear(section);
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      arrive();
    },
    { threshold },
  );
  observer.observe(element);
}

/** A region or a TextLoader: anything with a state and a cycle. */
export interface Owner extends HTMLElement {
  readonly state: string;
  readonly presentation: string;
  readonly cycle: string | undefined;
  update(patch: {
    state?: 'pending' | 'refreshing' | 'ready';
    cycle?: string;
    timing?: { duration?: number };
  }): void;
}

let count = 0;
const primed = new WeakSet<Element>();
/**
 * One load, as an app would run it: pending now, ready after `ms`.
 * `land` runs just before the data is shown, to put it in place.
 */
export function load(
  owner: Owner,
  ms: number,
  land?: () => void,
  options: { refresh?: boolean; duration?: number } = {},
): void {
  const cycle = `vb-${++count}`;
  owner.update({ state: options.refresh ? 'refreshing' : 'pending', cycle });
  setTimeout(() => {
    if (owner.cycle !== cycle) return;
    land?.();
    // Timing persists on the element, so every load says its own.
    owner.update({
      state: 'ready',
      timing:
        options.duration === undefined ? {} : { duration: options.duration },
    });
  }, ms);
}

/**
 * Restarts the waiting placeholders inside `section` just before it scrolls
 * into view, so their idle (which rests after four seconds) is fresh when
 * the visitor gets there. It only happens off screen, where the instant
 * swap can't be seen.
 */
export function primeNear(section: Element): void {
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries.find((e) => e.isIntersecting);
      if (!entry) return;
      observer.disconnect();
      if (entry.boundingClientRect.top < innerHeight) return;
      for (const owner of section.querySelectorAll<Owner>('[data-arrival]'))
        if (owner.state === 'pending') restart(owner);
    },
    { rootMargin: '0px 0px 60% 0px' },
  );
  observer.observe(section);
}

/**
 * A fresh loading period: an instant swap to ready, then pending again once
 * that has settled, so the idle's four-second window starts over.
 */
export function restart(owner: Owner, then?: () => void): void {
  let done = false;
  const again = () => {
    if (done) return;
    done = true;
    owner.update({ state: 'pending', cycle: `vb-${++count}`, timing: {} });
    then?.();
  };
  owner.addEventListener('dotquilt-handoff-end', again, { once: true });
  owner.update({ state: 'ready', timing: { duration: 0 } });
  // An owner that was already ready ends no handoff.
  setTimeout(again, 120);
}

/** Whether a load has finished, so a replay never cuts a handoff short. */
export const settled = (owner: Owner): boolean =>
  owner.state === 'ready' && owner.presentation === 'ready';
