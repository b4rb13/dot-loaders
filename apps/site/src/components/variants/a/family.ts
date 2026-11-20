/**
 * The family tiles: each loads as the section arrives, a beat apart; a mark
 * switch reloads them all in that mark; each tile can load again.
 */
import type { ChartLoader } from 'dotquilt/chart';
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import type { TextLoader } from 'dotquilt/text';
import { arriveOnce, chartPoints, jitter, radioGroup, shapeRows } from './lib';

type Owner = (LoadingRegion | TextLoader) & HTMLElement;
const loaders =
  'dotquilt-skeleton-circle, dotquilt-skeleton-line, dotquilt-skeleton-text, dotquilt-text-loader, dotquilt-chart-loader, dotquilt-table-loader, dotquilt-typing-dots';
const weekly = [24, 28, 27, 31, 34, 33, 37, 40, 39, 43, 46, 49];

export function startFamily() {
  registerAll();
  const section = document.querySelector<HTMLElement>('[data-va-family]');
  if (!section) return;
  const tiles = [...section.querySelectorAll<HTMLElement>('[data-tile]')];
  const status = section.querySelector<HTMLElement>('[data-status]');

  for (const chart of section.querySelectorAll<ChartLoader>('[data-spark]'))
    chart.targetProvider = ({ width, height }) => ({
      kind: 'line',
      points: chartPoints(weekly, width, height),
      baseline: height,
    });

  // The table tile's placeholder takes its rows' shape.
  const rowLoaders = section.querySelector<HTMLElement>('[data-row-loaders]');
  const table = section.querySelector<HTMLTableElement>('[data-table]');
  const shape = () => {
    if (rowLoaders && table) shapeRows(rowLoaders, table, 32);
  };
  shape();
  document.fonts.ready.then(shape);

  let count = 0;
  const owner = (tile: HTMLElement) =>
    tile.querySelector<Owner>('[data-owner]');

  /** One load of a tile: its placeholder, then its content after `ms`. */
  function load(tile: HTMLElement, ms: number, again = false) {
    const region = owner(tile);
    if (!region) return;
    const cycle = `va-tile-${++count}`;
    // Loading the LoadingRegion tile again refreshes it: its content stays.
    const refresh =
      again && region.hasAttribute('data-refresh') && region.state === 'ready';
    region.update({ state: refresh ? 'refreshing' : 'pending', cycle });
    setTimeout(() => {
      if (region.cycle !== cycle) return;
      if (region.dataset.value) region.textContent = region.dataset.value;
      region.update({ state: 'ready' });
    }, ms);
  }

  // The section's arrival is its tiles handing over, a beat apart.
  const arrives = arriveOnce(section, () => {
    if (!arrives) return;
    tiles.forEach((tile, i) => {
      setTimeout(
        () => {
          const region = owner(tile);
          if (region?.cycle === undefined) region?.update({ state: 'ready' });
        },
        900 + i * 240,
      );
    });
  });
  if (arrives)
    for (const tile of tiles) owner(tile)?.update({ state: 'pending' });

  for (const tile of tiles)
    tile
      .querySelector('[data-again]')
      ?.addEventListener('click', () => load(tile, jitter(1600), true));

  const marks = section.querySelector<HTMLElement>('[data-marks]');
  if (marks)
    radioGroup(marks, (mark) => {
      for (const loader of section.querySelectorAll(loaders)) {
        if (mark === 'dot') loader.removeAttribute('mark');
        else loader.setAttribute('mark', mark);
      }
      // Load every tile again, a beat apart, in the new mark.
      tiles.forEach((tile, i) => {
        load(tile, 1500 + i * 220);
      });
      const name = { dot: 'dots', dash: 'dashes', square: 'squares' }[mark];
      if (status)
        status.textContent = `Example data. Loading every tile in ${name}.`;
    });
}
