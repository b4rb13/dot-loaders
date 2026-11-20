/**
 * The playground: every change restyles the live loaders, plays their idle
 * again and rewrites the CSS that gives the same look.
 */
import { refreshStyles } from 'dotquilt';
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import { arriveOnce, radioGroup } from './lib';

export function startPlayground() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-yours]');
  const preview = section?.querySelector<HTMLElement>('[data-preview]');
  const region = preview?.querySelector<LoadingRegion>('[data-owner]');
  const output = section?.querySelector<HTMLElement>('[data-css]');
  if (!section || !preview || !region || !output) return;

  const state = { mark: 'dot', color: '', glow: '', size: 4.4, speed: 1 };
  const size = section.querySelector<HTMLInputElement>('[data-size]');
  const speed = section.querySelector<HTMLInputElement>('[data-speed]');
  const loaders = () =>
    preview.querySelectorAll(
      'dotquilt-skeleton-circle, dotquilt-skeleton-line, dotquilt-skeleton-text, dotquilt-chart-loader, dotquilt-typing-dots',
    );
  let count = 0;
  let replay: number | undefined;

  /** A fresh loading period, so the idle plays again in the new look. */
  function again() {
    region?.update({ state: 'ready', timing: { duration: 0 } });
    requestAnimationFrame(() =>
      region?.update({ state: 'pending', cycle: `va-yours-${++count}` }),
    );
  }

  function apply(restart = true) {
    const style = preview?.style;
    if (!style || !output) return;
    if (state.color) style.setProperty('--dotquilt-color', state.color);
    else style.removeProperty('--dotquilt-color');
    if (state.glow) style.setProperty('--dotquilt-accent-color', state.glow);
    else style.removeProperty('--dotquilt-accent-color');
    style.setProperty('--dotquilt-dot-size', `${state.size}px`);
    // Squares and dashes have a fixed size; only dots follow the slider.
    if (size) size.disabled = state.mark !== 'dot';
    section
      ?.querySelector('[data-size-hint]')
      ?.toggleAttribute('hidden', state.mark === 'dot');
    for (const loader of loaders()) {
      if (state.mark === 'dot') loader.removeAttribute('mark');
      else loader.setAttribute('mark', state.mark);
      loader.setAttribute('speed', String(state.speed));
    }
    // The chart draws on a canvas: it reads the new colours on request.
    if (preview) refreshStyles(preview);
    const lines = [
      state.color && `  --dotquilt-color: ${state.color};`,
      state.glow && `  --dotquilt-accent-color: ${state.glow};`,
      state.mark === 'dot' &&
        state.size !== 4.4 &&
        `  --dotquilt-dot-size: ${state.size}px;`,
    ].filter(Boolean);
    const attributes = [
      state.mark !== 'dot' && `mark="${state.mark}"`,
      state.speed !== 1 && `speed="${state.speed}"`,
    ].filter(Boolean);
    output.textContent = [
      lines.length
        ? `.your-app {\n${lines.join('\n')}\n}`
        : '/* The defaults: nothing to add. */',
      attributes.length
        ? `\n<dotquilt-skeleton-text ${attributes.join(' ')}>`
        : '',
    ].join('\n');
    // Sliders restart the idle once they rest, not on every step.
    clearTimeout(replay);
    if (restart) replay = window.setTimeout(again, 160);
  }

  const markGroup = section.querySelector<HTMLElement>('[data-mark]');
  if (markGroup)
    radioGroup(markGroup, (value) => {
      state.mark = value || 'dot';
      apply();
    });
  const colourGroup = section.querySelector<HTMLElement>('[data-colour]');
  if (colourGroup)
    radioGroup(colourGroup, (_, button) => {
      state.color = button.dataset.markColor ?? '';
      state.glow = button.dataset.glowColor ?? '';
      apply();
    });
  size?.addEventListener('input', () => {
    state.size = Number(size.value);
    const out = section.querySelector('[data-size-out]');
    if (out) out.textContent = `${state.size} px`;
    apply();
  });
  speed?.addEventListener('input', () => {
    state.speed = Number(speed.value);
    const out = section.querySelector('[data-speed-out]');
    if (out) out.textContent = `${state.speed}×`;
    apply();
  });
  section.querySelector('[data-again]')?.addEventListener('click', again);
  section
    .querySelector('[data-copy]')
    ?.addEventListener('click', async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      try {
        await navigator.clipboard.writeText(output.textContent ?? '');
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Select and copy';
      }
      setTimeout(() => {
        button.textContent = 'Copy';
      }, 1600);
    });
  apply(false);

  // The preview's idle plays when it arrives, so the visitor sees it move.
  arriveOnce(section, again);
}
