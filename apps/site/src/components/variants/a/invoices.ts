/**
 * The invoices screen: a filter reloads the table from its placeholder; a
 * page turn refreshes it in place.
 */
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import { type Invoice, ledger } from './data';
import {
  arriveOnce,
  jitter,
  radioGroup,
  reducedMotion,
  shapeRows,
} from './lib';

const pageSize = 5;
const rowHeight = 44;

export function startInvoices() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-invoices]');
  if (!section) return;
  const region = section.querySelector<LoadingRegion>('[data-ledger-region]');
  const loaders = section.querySelector<HTMLElement>('[data-row-loaders]');
  const table = section.querySelector<HTMLTableElement>('[data-table]');
  const rows = section.querySelector<HTMLElement>('[data-rows]');
  const status = section.querySelector<HTMLElement>('[data-status]');
  const pageLabel = section.querySelector<HTMLElement>('[data-page]');
  const prev = section.querySelector<HTMLButtonElement>('[data-prev]');
  const next = section.querySelector<HTMLButtonElement>('[data-next]');
  const frame = section.querySelector<HTMLElement>('.va-ledger');
  const filterGroup = section.querySelector<HTMLElement>('[data-filter]');
  if (
    !region ||
    !loaders ||
    !table ||
    !rows ||
    !status ||
    !prev ||
    !next ||
    !frame
  )
    return;
  const shape = () => shapeRows(loaders, table, rowHeight);

  // The placeholder follows the frame's width while it shows.
  let resized = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(resized);
    resized = requestAnimationFrame(() => {
      if (region.state === 'pending') shape();
    });
  }).observe(frame);

  let filter = 'all';
  let page = 0;
  let count = 0;
  let timer: number | undefined;
  const matching = () =>
    ledger.filter(
      (invoice) => filter === 'all' || invoice.status.toLowerCase() === filter,
    );
  const pages = () => Math.max(1, Math.ceil(matching().length / pageSize));

  function render(invoices: readonly Invoice[], fresh: boolean) {
    rows?.replaceChildren(
      ...invoices.map((invoice, i) => {
        const row = document.createElement('tr');
        for (const [name, text] of [
          ['id', invoice.id],
          ['', invoice.customer],
          ['project', invoice.project],
          ['date', invoice.date],
          ['num', invoice.amount],
        ] as const) {
          const cell = document.createElement('td');
          if (name) cell.className = name;
          cell.textContent = text;
          row.append(cell);
        }
        const cell = document.createElement('td');
        const chip = document.createElement('span');
        chip.className = `va-chip ${invoice.status.toLowerCase()}`;
        chip.textContent = invoice.status;
        cell.append(chip);
        row.append(cell);
        if (fresh && !reducedMotion()) {
          row.setAttribute('data-fresh', '');
          row.style.setProperty('--i', String(i));
        }
        return row;
      }),
    );
  }

  function controls() {
    const total = pages();
    if (pageLabel) pageLabel.textContent = `Page ${page + 1} of ${total}`;
    prev?.setAttribute('aria-disabled', String(page === 0));
    next?.setAttribute('aria-disabled', String(page >= total - 1));
  }

  /** One request: "filter" starts over from the placeholder; "page" refreshes. */
  function load(kind: 'filter' | 'page') {
    clearTimeout(timer);
    const cycle = `va-ledger-${++count}`;
    const list = matching();
    const slice = list.slice(page * pageSize, page * pageSize + pageSize);
    const refresh =
      kind === 'page' &&
      region?.state === 'ready' &&
      region.presentation === 'ready';
    // A new set: its rows go in first (hidden while pending), and the
    // placeholder takes their shape before it shows.
    if (!refresh) {
      render(slice, false);
      shape();
    }
    region?.update({ state: refresh ? 'refreshing' : 'pending', cycle });
    controls();
    if (status)
      status.textContent = refresh
        ? `Loading page ${page + 1}…`
        : `Loading ${filter === 'all' ? 'all invoices' : `${filter} invoices`}…`;
    timer = window.setTimeout(
      () => {
        if (region?.cycle !== cycle) return;
        if (refresh) render(slice, true);
        region.update({ state: 'ready' });
        const from = page * pageSize + 1;
        if (status)
          status.textContent = `Showing ${from}–${from + slice.length - 1} of ${list.length}.`;
      },
      jitter(refresh ? 900 : 1100),
    );
  }

  if (filterGroup)
    radioGroup(filterGroup, (value) => {
      filter = value;
      page = 0;
      load('filter');
    });
  prev.addEventListener('click', () => {
    if (page === 0) return;
    page--;
    load('page');
  });
  next.addEventListener('click', () => {
    if (page >= pages() - 1) return;
    page++;
    load('page');
  });

  const arrives = arriveOnce(section, () => {
    if (!arrives) return;
    timer = window.setTimeout(() => {
      region.update({ state: 'ready' });
    }, jitter(1400));
  });
  if (arrives) {
    shape();
    document.fonts.ready.then(() => {
      if (region.state === 'pending') shape();
    });
    region.update({ state: 'pending' });
  }
}
