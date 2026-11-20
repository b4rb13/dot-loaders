/**
 * The details' live proofs: the idle that rests after four seconds, content
 * that is out of reach while it loads, and motion that can be paused.
 */
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import type { TextLoader } from 'dotquilt/text';
import { arriveOnce, reducedMotion } from './lib';

export function startDetails() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-details]');
  if (!section) return;
  const $ = <T extends Element>(selector: string) =>
    section.querySelector<T>(selector);

  // Calm: count the idle up to its four-second limit, then rest.
  const calm = $<LoadingRegion>('[data-calm-region]');
  const clock = $<HTMLElement>('[data-clock]');
  const wake = $<HTMLButtonElement>('[data-wake]');
  let wakes = 0;
  let frame = 0;
  function rouse() {
    if (!calm || !clock) return;
    cancelAnimationFrame(frame);
    calm.update({ state: 'pending', cycle: `va-calm-${++wakes}` });
    if (reducedMotion()) {
      clock.textContent = 'Still: reduced motion is on.';
      return;
    }
    const start = performance.now();
    clock.setAttribute('aria-live', 'off');
    const tick = () => {
      const seconds = (performance.now() - start) / 1000;
      if (seconds >= 4) {
        clock.setAttribute('aria-live', 'polite');
        clock.textContent = 'Resting after 4.0 s.';
        return;
      }
      clock.textContent = `Drifting: ${seconds.toFixed(1)} s`;
      frame = requestAnimationFrame(tick);
    };
    tick();
  }
  wake?.addEventListener('click', rouse);
  arriveOnce(section, rouse);

  // Out of reach: the button is inert while its region loads.
  const inert = $<LoadingRegion>('[data-inert-region]');
  const toggle = $<HTMLButtonElement>('[data-loading]');
  const inertStatus = $<HTMLElement>('[data-inert-status]');
  toggle?.addEventListener('click', () => {
    const loading = toggle.getAttribute('aria-checked') !== 'true';
    toggle.setAttribute('aria-checked', String(loading));
    inert?.update({ state: loading ? 'pending' : 'ready' });
    if (inertStatus)
      inertStatus.textContent = loading
        ? 'Loading: the button is inert, so Tab skips it.'
        : 'Ready: the button takes focus.';
  });
  $('[data-open]')?.addEventListener('click', () => {
    if (inertStatus) inertStatus.textContent = 'Opened INV-2091.';
  });

  // Motion: a paused loader holds still and swaps at once.
  const figure = $<TextLoader & HTMLElement>('[data-motion-figure]');
  const pause = $<HTMLButtonElement>('[data-pause]');
  const motionStatus = $<HTMLElement>('[data-motion-status]');
  const values = ['$48,210', '$51,904', '$46,385', '$49,770'];
  let loads = 0;
  pause?.addEventListener('click', () => {
    const paused = pause.getAttribute('aria-checked') !== 'true';
    pause.setAttribute('aria-checked', String(paused));
    figure?.update({ motion: paused ? 'paused' : 'system' });
  });
  $('[data-load]')?.addEventListener('click', () => {
    if (!figure) return;
    const cycle = `va-motion-${++loads}`;
    figure.update({ state: 'pending', cycle });
    if (motionStatus) motionStatus.textContent = 'Loading.';
    setTimeout(() => {
      if (figure.cycle !== cycle) return;
      figure.textContent = values[loads % values.length] ?? '';
      figure.update({ state: 'ready' });
      if (motionStatus)
        motionStatus.textContent = `Loaded: ${figure.textContent}.`;
    }, 1600);
  });
}
