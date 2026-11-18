// Browser fixture: one component per page, driven by query parameters.
//   ?component=<kind>   which component to render (see `kinds`)
//   &theme=light|dark   page colours
//   &hostDisplay=block  simulate app CSS that sets `display:block` on the hosts
//   &motion=paused      pause motion on the page so screenshots are stable
import { bars, ridge } from '@dotquilt-internal/core/animations/chart';
import { tableShimmer, typeOn } from '@dotquilt-internal/core/animations/table';
import { registerAll } from '@dotquilt-internal/core/register-all';
import { type Fixture, type Kind, kinds, type Owner } from './kinds';

const params = new URLSearchParams(location.search);
const kind = (params.get('component') ?? 'region') as Kind;
if (!kinds.includes(kind)) throw new Error(`Unknown component ${kind}`);
document.documentElement.dataset.theme = params.get('theme') ?? 'light';
const stage = document.getElementById('stage') as HTMLElement;
if (params.get('motion') === 'paused') stage.setAttribute('motion', 'paused');
if (params.get('hostDisplay') === 'block')
  document.head.insertAdjacentHTML(
    'beforeend',
    '<style>dotquilt-region, [slot=placeholder], dotquilt-text-loader { display: block; }</style>',
  );

const events: Fixture['events'] = [];
for (const type of [
  'dotquilt-handoff-start',
  'dotquilt-handoff-end',
  'dotquilt-handoff-cancel',
  'dotquilt-error',
])
  document.addEventListener(
    type,
    (event) =>
      events.push({ type, detail: (event as CustomEvent).detail ?? null }),
    true,
  );

registerAll();

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs))
    node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function article(): HTMLElement {
  const content = el('article', { class: 'card' });
  content.append(
    el('h2', {}, 'Quarterly revenue'),
    el('p', {}, 'Revenue grew 12% compared with the previous quarter.'),
    el('button', { type: 'button' }, 'Open report'),
  );
  return content;
}

function chartContent(): HTMLElement {
  const wrapper = el('figure', { class: 'chart' });
  wrapper.innerHTML =
    '<svg viewBox="0 0 320 160" role="img" aria-label="Revenue increased"><path d="M0 120 L80 100 L160 110 L240 60 L320 40" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  return wrapper;
}

function tableContent(): HTMLElement {
  const table = el('table', { class: 'table' });
  const rows = [
    ['Canvas', '4', 'Ready'],
    ['Grid', '8', 'Ready'],
    ['Chart', '12', 'Pending'],
    ['Table', '16', 'Ready'],
  ];
  table.innerHTML = `<thead><tr><th>Project</th><th>Items</th><th>Status</th></tr></thead><tbody>${rows
    .map(
      (cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`,
    )
    .join('')}</tbody>`;
  return table;
}

function inRegion(decoration: HTMLElement, content: HTMLElement): Fixture {
  const region = el('dotquilt-region', {
    'aria-label': 'Example content',
  }) as unknown as Owner;
  region.className = 'owner';
  decoration.slot = 'placeholder';
  region.append(decoration, content);
  stage.append(region);
  region.state = 'pending';
  return { kind, owner: region, decoration, content, events };
}

function build(): Fixture {
  switch (kind) {
    case 'skeleton-block':
    case 'skeleton-line':
    case 'skeleton-circle':
    case 'skeleton-text':
    case 'typing-dots':
      return inRegion(el(`dotquilt-${kind}`), article());
    case 'region':
      return inRegion(el('dotquilt-skeleton-text'), article());
    case 'chart-loader': {
      const loader = el('dotquilt-chart-loader');
      Object.assign(loader, {
        variant: 'line',
        targetProvider: ({
          width,
          height,
        }: {
          width: number;
          height: number;
        }) => ({
          kind: 'line',
          baseline: height,
          points: [
            { x: 0, y: height * 0.75 },
            { x: width * 0.25, y: height * 0.62 },
            { x: width * 0.5, y: height * 0.69 },
            { x: width * 0.75, y: height * 0.38 },
            { x: width, y: height * 0.25 },
          ],
        }),
      });
      return inRegion(loader, chartContent());
    }
    case 'table-loader': {
      const loader = el('dotquilt-table-loader');
      Object.assign(loader, {
        rows: 4,
        rowHeight: 32,
        columns: [
          { kind: 'text', width: 2 },
          { kind: 'number' },
          { kind: 'badge' },
        ],
      });
      return inRegion(loader, tableContent());
    }
    case 'text-loader': {
      const loader = el('dotquilt-text-loader') as unknown as Owner;
      loader.textContent = 'Revenue up 12%';
      stage.append(loader);
      loader.update({ state: 'pending', cycle: 'fixture' });
      return {
        kind,
        owner: loader,
        decoration: loader,
        content: loader,
        events,
      };
    }
  }
}

window.e2e = build();
// Animation factories some specs switch between.
Object.assign(window, {
  e2eAnimations: { chart: { ridge, bars }, table: { typeOn, tableShimmer } },
});
document.body.dataset.ready = 'true';
