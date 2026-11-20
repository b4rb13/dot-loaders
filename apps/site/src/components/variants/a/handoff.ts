/**
 * The slowed handoff: the region loads, then hands over at the chosen
 * speed; each phase on the timeline fills as the real handoff passes it.
 */
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import { arriveOnce, radioGroup, reducedMotion } from './lib';

const base = 1100;

export function startHandoff() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-handoff]');
  const region = section?.querySelector<LoadingRegion>('[data-handoff]');
  const timeline = section?.querySelector<HTMLElement>('.va-timeline');
  const status = section?.querySelector<HTMLElement>('[data-status]');
  if (!section || !region || !timeline || !status) return;

  let scale = 1;
  let duration = base;
  let count = 0;
  let timer: number | undefined;
  const label = (selector: string, ms: number) => {
    const tick = section.querySelector(selector);
    if (tick) tick.textContent = `${Number((ms / 1000).toFixed(2))} s`;
  };

  function clear() {
    for (const element of timeline?.querySelectorAll<HTMLElement>(
      '.track-done, .track-head',
    ) ?? [])
      for (const animation of element.getAnimations()) animation.cancel();
  }

  /** Load the card, wait a moment, then hand over at the chosen speed. */
  function play() {
    clearTimeout(timer);
    clear();
    timeline?.removeAttribute('data-done');
    duration = base * scale;
    label('[data-mid]', duration / 2);
    label('[data-end]', duration);
    const cycle = `va-handoff-${++count}`;
    region?.update({ state: 'pending', cycle });
    if (status) status.textContent = 'Loading…';
    timer = window.setTimeout(() => {
      if (region?.cycle !== cycle) return;
      // timing.duration stretches every phase of the handoff together.
      region.update({ state: 'ready', timing: { duration } });
    }, 1200);
  }

  region.addEventListener('dotquilt-handoff-start', () => {
    if (status)
      status.textContent = `Handing over in ${Number((duration / 1000).toFixed(2))} s.`;
    clear();
    if (reducedMotion()) return;
    for (const done of timeline.querySelectorAll<HTMLElement>('.track-done')) {
      const from = Number(done.dataset.from) * scale;
      const to = Number(done.dataset.to) * scale;
      done.animate([{ scale: '0 1' }, { scale: '1 1' }], {
        delay: from,
        duration: to - from,
        easing: 'linear',
        fill: 'both',
      });
    }
    for (const head of timeline.querySelectorAll<HTMLElement>('.track-head'))
      head.animate(
        [
          { left: '0%', opacity: 1 },
          { left: '100%', opacity: 1, offset: 0.97 },
          { left: '100%', opacity: 0 },
        ],
        { duration, easing: 'linear', fill: 'forwards' },
      );
  });
  region.addEventListener('dotquilt-handoff-end', (event) => {
    timeline.setAttribute('data-done', '');
    const reason = event.detail.reason;
    status.textContent =
      reason && reason !== 'complete'
        ? 'Swapped at once: motion is reduced or paused.'
        : 'Handed over. Play it again at either speed.';
  });

  const speed = section.querySelector<HTMLElement>('[data-speed]');
  if (speed)
    radioGroup(speed, (value) => {
      scale = Number(value) || 1;
      play();
    });
  section.querySelector('[data-play]')?.addEventListener('click', play);

  const arrives = arriveOnce(section, () => {
    if (arrives) play();
  });
  if (arrives) region.update({ state: 'pending' });
}
