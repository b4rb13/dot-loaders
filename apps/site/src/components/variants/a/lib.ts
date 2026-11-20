/**
 * Small helpers shared by variant A's screens: motion checks, a keyboard-
 * friendly radio group, the "arrive once in view" observer and chart maths.
 */
import type { Point } from 'dotquilt/chart';
import type { TableCellKind, TableColumn, TableLoader } from 'dotquilt/table';

export const reducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A promise that resolves after `ms`. */
export const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** `ms`, nudged by up to ±`spread` (0.08 = 8 %), so loads feel real. */
export const jitter = (ms: number, spread = 0.08) =>
  Math.round(ms * (1 + (Math.random() * 2 - 1) * spread));

/** "$48,210" → "$00,000": the placeholder's shape for a value. */
export const maskOf = (value: string) => value.replace(/\d/g, '0');

/**
 * A row of role="radio" buttons with one tab stop: arrow keys, Home and End
 * move the choice, as a radio group should. `onChange` runs on every change.
 */
export function radioGroup(
  group: HTMLElement,
  onChange: (value: string, button: HTMLButtonElement) => void,
) {
  const buttons = [
    ...group.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  ];
  const indicator = group.querySelector<HTMLElement>('[data-indicator]');

  /** Slides the selection pill under the checked button. */
  function place(button: HTMLButtonElement) {
    if (!indicator) return;
    indicator.style.setProperty('--x', `${button.offsetLeft}px`);
    indicator.style.setProperty('--w', `${button.offsetWidth}px`);
    indicator.style.setProperty('--h', `${button.offsetHeight}px`);
    indicator.style.setProperty('--y', `${button.offsetTop}px`);
  }

  function select(button: HTMLButtonElement, focus: boolean, notify = true) {
    for (const other of buttons) {
      const on = other === button;
      other.setAttribute('aria-checked', String(on));
      other.tabIndex = on ? 0 : -1;
    }
    place(button);
    if (focus) button.focus();
    if (notify) onChange(button.dataset.value ?? '', button);
  }

  const checked = () =>
    buttons.find((b) => b.getAttribute('aria-checked') === 'true') ??
    buttons[0];
  for (const button of buttons) button.tabIndex = button === checked() ? 0 : -1;
  const first = checked();
  if (first) place(first);
  // The pill only glides once it has a place, so it never slides in at load.
  requestAnimationFrame(() => indicator?.setAttribute('data-ready', ''));
  new ResizeObserver(() => {
    const current = checked();
    if (current) place(current);
  }).observe(group);

  group.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      '[role="radio"]',
    );
    if (!button || button.getAttribute('aria-checked') === 'true') return;
    select(button, false);
  });
  group.addEventListener('keydown', (event) => {
    const current = buttons.indexOf(document.activeElement as never);
    if (current < 0) return;
    const last = buttons.length - 1;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? current === last
          ? 0
          : current + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? current === 0
            ? last
            : current - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    const button = buttons[next];
    if (next < 0 || !button) return;
    event.preventDefault();
    select(button, true);
  });

  return {
    get value() {
      return checked()?.dataset.value ?? '';
    },
    /** Checks the option with this value without calling `onChange`. */
    set(value: string) {
      const button = buttons.find((b) => b.dataset.value === value);
      if (button) select(button, false, false);
    },
  };
}

/**
 * Calls `arrive` once, when the top of `element` has come a fifth of the way
 * up the window (or any of it shows, for elements near the page's end).
 * Returns whether it was already in view when this ran, so a section that
 * is already on screen isn't hidden for its entrance.
 */
export function onArrive(element: Element, arrive: () => void): boolean {
  const rect = element.getBoundingClientRect();
  const visible = rect.top < innerHeight && rect.bottom > 0;
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      arrive();
    },
    { rootMargin: '0px 0px -20% 0px' },
  ).observe(element);
  return visible;
}

/**
 * A section's arrival is its own loaders handing over: `onIn` runs once,
 * as it scrolls into view. Returns true when the section should wait for
 * that, pending: motion is allowed and it isn't on screen yet. Otherwise
 * it shows finished (reduced motion, or already in view) and `onIn` still
 * runs on arrival for anything that isn't a load.
 */
export function arriveOnce(section: HTMLElement, onIn: () => void): boolean {
  const visible = onArrive(section, onIn);
  return !visible && !reducedMotion();
}

/** Insets that keep a 2.4 px round-capped line inside its box. */
const inset = { top: 14, right: 8, bottom: 10, left: 4 };

/**
 * Each value's place in a `width` × `height` chart, with headroom on top.
 * The ChartLoader's target and the real SVG line share it, so the marks
 * glide exactly onto the line that draws in.
 */
export function chartPoints(
  values: readonly number[],
  width: number,
  height: number,
): Point[] {
  const top = Math.max(...values) * 1.12;
  const bottom = Math.min(...values) * 0.72;
  const w = Math.max(1, width - inset.left - inset.right);
  const h = Math.max(1, height - inset.top - inset.bottom);
  return values.map((value, i) => ({
    x: inset.left + (i / Math.max(1, values.length - 1)) * w,
    y: inset.top + (1 - (value - bottom) / (top - bottom)) * h,
  }));
}

/** An SVG path through points. */
export const pathOf = (points: readonly Point[]) =>
  points
    .map(({ x, y }, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

const shown = (element: Element) =>
  getComputedStyle(element).display !== 'none';

/** How wide a cell's text (or chip) is, laid out even while hidden. */
function extent(cell: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(cell);
  return range.getBoundingClientRect().width;
}

/**
 * Gives a table's placeholder one TableLoader per row of the table that is
 * about to show, so its marks hold that table's shape: each column as wide
 * as the real one, and in each text cell the longer or shorter bar
 * (TableLoader's `text` or `badge` length) closest to the text that will
 * land there. Number columns end-align, as the runtime draws them. Each
 * header cell names its column's kind in `data-kind`.
 */
export function shapeRows(
  host: HTMLElement,
  table: HTMLTableElement,
  rowHeight: number,
) {
  const heads = [...(table.tHead?.rows[0]?.cells ?? [])].filter(shown);
  const widths = heads.map((head) => head.getBoundingClientRect().width);
  if (!widths.some(Boolean)) return;
  const kinds = heads.map(
    (head) => (head.dataset.kind ?? 'text') as TableCellKind,
  );
  const rows = [...(table.tBodies[0]?.rows ?? [])];
  const loaders = [
    ...host.querySelectorAll<TableLoader>('dotquilt-table-loader'),
  ];
  const mark = loaders[0]?.getAttribute('mark') ?? host.dataset.mark;
  while (loaders.length < Math.max(1, rows.length)) {
    const loader = document.createElement('dotquilt-table-loader');
    if (mark) loader.setAttribute('mark', mark);
    host.append(loader);
    loaders.push(loader);
  }
  while (loaders.length > Math.max(1, rows.length)) loaders.pop()?.remove();
  // Each body row's visible cells, and how wide each one's content is.
  const grid = rows.map((row) => [...row.cells].filter(shown).map(extent));
  // Per column: the longer or shorter bar for each row. The runtime draws a
  // `text` bar at 72% of the cell and a `badge` bar at 45%.
  const picks = widths.map((width, c) => {
    const kind = kinds[c] ?? 'text';
    const texts = grid.map((cells) => cells[c] ?? 0);
    if (kind !== 'text' && kind !== 'badge') return texts.map(() => kind);
    const room = Math.max(0, width - 12);
    const nearest = texts.map((text) =>
      Math.abs(text - room * 0.45) <= Math.abs(text - room * 0.72)
        ? 'badge'
        : 'text',
    );
    // Lengths that genuinely differ but all round to one bar still split:
    // the longer half of the column gets the longer bar.
    const min = Math.min(...texts);
    const max = Math.max(...texts);
    if (new Set(nearest).size > 1 || max - min <= max * 0.12) return nearest;
    const middle = (min + max) / 2;
    return texts.map((text) => (text >= middle ? 'text' : 'badge'));
  });
  rows.forEach((_, r) => {
    const columns: TableColumn[] = widths.map((width, c) => ({
      kind: picks[c]?.[r] ?? kinds[c] ?? 'text',
      width: Math.max(1, width),
    }));
    const loader = loaders[r];
    if (!loader) return;
    loader.setAttribute('rows', '1');
    loader.setAttribute('row-height', String(rowHeight));
    loader.columns = columns;
  });
}
