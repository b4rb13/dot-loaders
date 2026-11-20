/**
 * The invoices screen: a filter reloads the table from its placeholder; a
 * page turn refreshes it in place. The hold control on the left is the
 * network: holding keeps the rows loading, letting go delivers them, and a
 * filter or page answered by itself can be held the same way.
 */
import { type LoadingRegion, registerLoadingRegion } from 'dotquilt/region';
import { registerTableLoader } from 'dotquilt/table';
import { Connection, whenNear } from './hold';
import {
  arriveOnce,
  jitter,
  radioGroup,
  reducedMotion,
  shapeRows,
} from './lib';
import { type Invoice, ledger } from './screens';

const pageSize = 5;
const rowHeight = 44;

export function startInvoices() {
  const section = document.querySelector<HTMLElement>('[data-va-invoices]');
  if (section) whenNear(section, () => setUp(section));
}

function setUp(section: HTMLElement) {
  registerTableLoader();
  registerLoadingRegion();
  const region = section.querySelector<LoadingRegion>('[data-ledger-region]');
  const loaders = section.querySelector<HTMLElement>('[data-row-loaders]');
  const table = section.querySelector<HTMLTableElement>('[data-table]');
  const rows = section.querySelector<HTMLElement>('[data-rows]');
  const note = section.querySelector<HTMLElement>('[data-note]');
  const pageLabel = section.querySelector<HTMLElement>('[data-page]');
  const prev = section.querySelector<HTMLButtonElement>('[data-prev]');
  const next = section.querySelector<HTMLButtonElement>('[data-next]');
  const frame = section.querySelector<HTMLElement>('.va-ledger');
  const filterGroup = section.querySelector<HTMLElement>('[data-filter]');
  const controls = section.querySelector<HTMLElement>('[data-controls]');
  if (
    !region ||
    !loaders ||
    !table ||
    !rows ||
    !note ||
    !prev ||
    !next ||
    !frame ||
    !controls
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
  /** How the next load shows: from the placeholder, or refreshing in place. */
  let mode: 'reload' | 'refresh' = 'reload';
  /** The load in flight: its mode and the rows it brings. */
  let flight: { mode: 'reload' | 'refresh'; slice: Invoice[] } | undefined;
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

  function pager() {
    const total = pages();
    if (pageLabel) pageLabel.textContent = `Page ${page + 1} of ${total}`;
    prev?.setAttribute('aria-disabled', String(page === 0));
    next?.setAttribute('aria-disabled', String(page >= total - 1));
  }

  /** A load starts: from the placeholder, or under the refresh thread. */
  function begin(cycle: string) {
    if (!region || !note) return;
    const list = matching();
    const slice = list.slice(page * pageSize, page * pageSize + pageSize);
    const refresh =
      mode === 'refresh' &&
      region.state === 'ready' &&
      region.presentation === 'ready';
    flight = { mode: refresh ? 'refresh' : 'reload', slice };
    mode = 'reload';
    // A new set: its rows go in first (hidden while pending), and the
    // placeholder takes their shape before it shows.
    if (!refresh) {
      render(slice, false);
      shape();
    }
    region.update({ state: refresh ? 'refreshing' : 'pending', cycle });
    pager();
    note.textContent = refresh
      ? `Loading page ${page + 1}…`
      : `Loading ${filter === 'all' ? 'all invoices' : `${filter} invoices`}…`;
  }

  /** The rows arrive. */
  function deliver(duration: number) {
    if (!region || !note || !flight) return;
    const { mode: shown, slice } = flight;
    flight = undefined;
    if (shown === 'refresh') render(slice, true);
    region.update({ state: 'ready', timing: { duration } });
    const from = page * pageSize + 1;
    note.textContent = `Showing ${from}–${from + slice.length - 1} of ${matching().length}.`;
  }

  const connection = new Connection({
    name: 'invoices',
    subject: 'The invoices',
    root: controls,
    begin,
    deliver: (handoff) => deliver(handoff.duration),
  });

  /** A load the screen answers by itself, unless someone holds it. */
  function request(kind: 'reload' | 'refresh', ms: number) {
    connection.abandon();
    mode = kind;
    connection.auto(jitter(ms));
  }

  if (filterGroup)
    radioGroup(filterGroup, (value) => {
      filter = value;
      page = 0;
      request('reload', 1100);
    });
  prev.addEventListener('click', () => {
    if (page === 0) return;
    page--;
    request('refresh', 900);
  });
  next.addEventListener('click', () => {
    if (page >= pages() - 1) return;
    page++;
    request('refresh', 900);
  });

  const arrives = arriveOnce(section, () => {
    if (arrives) request('reload', 1400);
  });
  if (arrives) {
    shape();
    document.fonts.ready.then(() => {
      if (region.state === 'pending') shape();
    });
    region.update({ state: 'pending' });
  }
}
