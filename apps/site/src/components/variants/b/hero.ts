/**
 * Variant B's first screen, live. The field is a real ChartLoader in a real
 * loading region; this file only plays the app's part. It says when the data
 * is pending and when it is ready, and where the line will be.
 */
import { refreshStyles } from 'dotquilt';
import type { ChartLoader } from 'dotquilt/chart';
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import { heroLine } from './line-store';
import {
  describe,
  glidePath,
  normalized,
  pathOf,
  type Series,
  series,
  trailOf,
  valueAt,
} from './series';
import { onTheme } from './theme';
import { cutTrail } from './trail-cut';

registerAll();

const hero = document.querySelector<HTMLElement>('[data-vb-hero]');
const region = hero?.querySelector<LoadingRegion>('[data-region]');
const field = hero?.querySelector<ChartLoader>('[data-field]');
const line = hero?.querySelector<SVGPathElement>('[data-line]');
const chart = hero?.querySelector<SVGSVGElement>('[data-chart]');
const stage = hero?.querySelector<HTMLElement>('[data-stage]');
const group = hero?.querySelector<HTMLElement>('[data-handles]');
const status = hero?.querySelector<HTMLElement>('[data-status]');
const reset = hero?.querySelector<HTMLButtonElement>('[data-reset]');
const ground = hero?.querySelector<HTMLElement>('.ground');

if (hero && region && field && line && chart && stage && group && status) {
  // How far the art runs past the content edge to the window's edge,
  // measured without the scrollbar so the page never scrolls sideways.
  const measure = () => {
    const room =
      document.documentElement.clientWidth - hero.getBoundingClientRect().right;
    hero.style.setProperty('--vb-bleed', `${Math.max(0, Math.floor(room))}px`);
  };
  measure();
  new ResizeObserver(measure).observe(document.documentElement);
  onTheme(() => refreshStyles(hero));

  /** The visitor's own values for each series, edited in place. */
  const edits = new Map<Series['id'], number[]>(
    series.map((item) => [item.id, [...item.values]]),
  );
  let current = series[0] as Series;
  const values = (): number[] => edits.get(current.id) ?? [...current.values];
  const edited = () => values().some((value, i) => value !== current.values[i]);
  const handles = [...group.querySelectorAll<HTMLElement>('[data-handle]')];

  /** Draws the line and moves the handles to the current values. */
  const draw = () => {
    const list = values();
    const points = normalized(list, current);
    line.setAttribute('d', pathOf(points));
    const trail = points[0] ? trailOf(points[0]) : [];
    if (ground) cutTrail(ground, points[0]);
    hero.querySelectorAll<HTMLElement>('[data-trail] li').forEach((mark, i) => {
      const at = trail[i];
      if (!at) return;
      mark.style.setProperty('--x', String(at.x));
      mark.style.setProperty('--y', String(at.y));
    });
    chart.setAttribute('aria-label', describe(current, list));
    points.forEach((point, i) => {
      const handle = handles[i];
      if (!handle) return;
      const value = list[i] ?? 0;
      handle.style.setProperty('--x', String(point.x));
      handle.style.setProperty('--y', String(point.y));
      handle.setAttribute('aria-valuemin', String(current.min));
      handle.setAttribute('aria-valuemax', String(current.max));
      handle.setAttribute('aria-valuenow', String(Math.round(value)));
      handle.setAttribute('aria-valuetext', current.unit(value));
      const tip = handle.querySelector('.tip b');
      if (tip) tip.textContent = current.unit(value);
    });
    if (reset) reset.hidden = !edited();
    heroLine.series = current;
    heroLine.values = [...list];
    heroLine.edited = edited();
  };

  // The field at rest is cleared along the trail at its current size.
  if (ground) {
    const recut = () => cutTrail(ground, normalized(values(), current)[0]);
    recut();
    new ResizeObserver(recut).observe(ground);
  }

  // Where the real line will be, in the field's own size, trail included and
  // sampled evenly across: the marks glide onto it along the whole width
  // before the line draws in.
  field.targetProvider = ({ width, height }) => ({
    kind: 'line',
    points: glidePath(normalized(values(), current)).map(({ x, y }) => ({
      x: x * width,
      y: y * height,
    })),
    baseline: height,
  });

  let count = 0;
  let timer: number | undefined;
  /** One load: the field shows, then the data arrives after `ms`. */
  const load = (ms: number) => {
    clearTimeout(timer);
    const cycle = `hero-${++count}`;
    region.update({ state: 'pending', cycle });
    hero.dataset.pending = '';
    delete hero.dataset.landing;
    status.textContent = `Loading ${current.name.toLowerCase()}…`;
    timer = window.setTimeout(() => {
      if (region.cycle !== cycle) return;
      draw();
      region.update({ state: 'ready' });
      region.setAttribute('aria-label', `${current.name} by month`);
      status.textContent = edited()
        ? `${current.name}, reshaped by you.`
        : `${current.name} by month.`;
    }, ms);
  };

  region.addEventListener('dotquilt-handoff-start', () => {
    hero.dataset.landing = '';
  });
  region.addEventListener('dotquilt-handoff-end', () => {
    // The field at rest comes back once the line has fully arrived.
    delete hero.dataset.pending;
    delete hero.dataset.landing;
    hero.dataset.arrived = '';
  });

  // The first arrival: the data lands about 0.6 s after the page shows.
  if ('arrive' in hero.dataset)
    customElements.whenDefined('dotquilt-region').then(() => load(600));

  // The series switch: a radio group; arrow keys move between options.
  const options = [
    ...hero.querySelectorAll<HTMLButtonElement>('[data-series]'),
  ];
  const choose = (option: HTMLButtonElement) => {
    const next = series.find((item) => item.id === option.dataset.series);
    if (!next) return;
    for (const other of options) {
      other.setAttribute('aria-checked', String(other === option));
      other.tabIndex = other === option ? 0 : -1;
    }
    if (next === current) return;
    current = next;
    // The handles glide to the new points while the field waits for them.
    group.dataset.glide = '';
    draw();
    setTimeout(() => delete group.dataset.glide, 1000);
    load(900);
  };
  options.forEach((option, i) => {
    option.addEventListener('click', () => choose(option));
    option.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
        event.key
      ];
      if (!step) return;
      event.preventDefault();
      const next = options[(i + step + options.length) % options.length];
      next?.focus();
      if (next) choose(next);
    });
  });

  // A longer wait here, so there is time to see the field breathe and to
  // light it with the pointer.
  hero
    .querySelector('[data-again]')
    ?.addEventListener('click', () => load(1600));
  reset?.addEventListener('click', () => {
    edits.set(current.id, [...current.values]);
    group.dataset.glide = '';
    draw();
    setTimeout(() => delete group.dataset.glide, 1000);
    load(700);
    hero.querySelector<HTMLElement>('[data-again]')?.focus();
  });

  // The handles: drag a point, or pick one with the left and right arrow
  // keys and move it with up and down. The line follows at once; on
  // release the region loads again, and the marks reflow onto the
  // visitor's own line.
  const setValue = (i: number, value: number) => {
    const list = values();
    const clamped = Math.min(current.max, Math.max(current.min, value));
    list[i] = Math.round(clamped / current.step) * current.step;
    edits.set(current.id, list);
    draw();
  };
  const focusHandle = (i: number) => {
    handles.forEach((handle, j) => {
      handle.tabIndex = j === i ? 0 : -1;
    });
    handles[i]?.focus();
  };
  handles.forEach((handle, i) => {
    let dragging = false;
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      dragging = true;
      handle.setPointerCapture(event.pointerId);
      handle.dataset.dragging = '';
      focusHandle(i);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const box = stage.getBoundingClientRect();
      setValue(i, valueAt((event.clientY - box.top) / box.height, current));
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      delete handle.dataset.dragging;
      load(650);
    };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
    handle.addEventListener('lostpointercapture', release);

    let settle: number | undefined;
    handle.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const next = i + (event.key === 'ArrowRight' ? 1 : -1);
        if (next >= 0 && next < handles.length) focusHandle(next);
        return;
      }
      const now = values()[i] ?? 0;
      const step = current.step;
      const next = {
        ArrowUp: now + step,
        ArrowDown: now - step,
        PageUp: now + step * 5,
        PageDown: now - step * 5,
        Home: current.min,
        End: current.max,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      setValue(i, next);
      // A pause after the last key counts as letting go.
      clearTimeout(settle);
      settle = window.setTimeout(() => load(650), 650);
    });
  });
}
