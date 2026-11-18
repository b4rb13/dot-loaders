import type { ChartVariant } from '@dotquilt-internal/core/chart';
import {
  type ChartLoader,
  registerChartLoader,
} from '@dotquilt-internal/core/chart';
import {
  type LoadingRegion,
  registerLoadingRegion,
} from '@dotquilt-internal/core/region';
import {
  registerSkeletonBlock,
  type SkeletonBlock,
} from '@dotquilt-internal/core/skeleton';
import {
  registerTableLoader,
  type TableLoader,
} from '@dotquilt-internal/core/table';
import {
  registerTextLoader,
  type TextLoader,
} from '@dotquilt-internal/core/text';
import {
  registerTypingDots,
  type TypingDots,
} from '@dotquilt-internal/core/typing';
import { required } from './dom';
import { chartMarkup, rowsMarkup } from './markup';
import { modes, type ProviderMode } from './projections';
import {
  chartAnimations,
  tableAnimations,
  textAnimations,
  wrapperReveal,
} from './recipes';
import {
  createSession,
  initial,
  policy,
  stylesReady,
  targets,
} from './session';

const root = required<HTMLElement>(document, '#app');
const model = initial();
const session = createSession(root, () => model);
const owner = required<LoadingRegion>(root, '#report-owner');
const chart = required<ChartLoader>(root, '#chart-source');
const table = required<TableLoader>(root, '#table-source');
const detail = required<TextLoader>(root, '#detail-owner');
owner.stylePolicy = policy('region');
chart.stylePolicy = policy('chart');
table.stylePolicy = policy('table');
detail.stylePolicy = policy('text');
required<SkeletonBlock>(root, '#heading-source').stylePolicy =
  policy('skeleton');
required<TypingDots>(root, '#refresh-source').stylePolicy = policy('typing');
chart.animations = chartAnimations;
chart.targetProvider = session.projection.chart;
table.animations = tableAnimations;
table.targetProvider = session.projection.table;
table.columns = [
  { kind: 'text', width: 1.5 },
  { kind: 'badge' },
  { kind: 'number' },
];
detail.animations = textAnimations;
owner.revealTargets = targets(root, false);
registerLoadingRegion();
registerChartLoader();
registerTableLoader();
registerSkeletonBlock();
registerTextLoader();
registerTypingDots();
function apply() {
  owner.update({
    state: model.state,
    cycle: String(model.cycle),
    motion: model.paused ? 'paused' : 'system',
    animations: model.override ? { handoff: wrapperReveal } : undefined,
  });
  detail.update({
    state: model.detail,
    cycle: String(model.detailCycle),
    motion: model.paused ? 'paused' : 'system',
  });
  chart.variant = model.variant;
  required<HTMLElement>(document, '#pause').setAttribute(
    'aria-pressed',
    String(model.paused),
  );
  session.publish();
}
const actions: Record<string, () => void> = {
  load() {
    session.reset();
    model.cycle++;
    model.state = 'pending';
  },
  refresh() {
    session.reset();
    model.cycle++;
    model.state = 'refreshing';
  },
  reveal() {
    model.state = 'ready';
  },
  'detail-load'() {
    model.detailCycle++;
    model.detail = 'pending';
  },
  'detail-ready'() {
    model.detail = 'ready';
  },
  measure() {
    owner.refresh();
    detail.refresh();
  },
  recycle() {
    required<Element>(root, 'tbody').innerHTML = rowsMarkup(
      model.mode === 'international',
    );
    owner.revealTargets = targets(root, model.mode === 'missing-row');
  },
  pause() {
    model.paused = !model.paused;
  },
};
for (const [id, action] of Object.entries(actions))
  required<HTMLElement>(document, `#${id}`).addEventListener('click', () => {
    action();
    apply();
    required<HTMLElement>(document, '#request-status').textContent =
      `Report ${model.state}; detail ${model.detail}. Outcomes are application-owned.`;
  });
required<HTMLElement>(document, '#variant').addEventListener(
  'change',
  (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'line' || value === 'bar' || value === 'scatter')
      model.variant = value as ChartVariant;
    required<Element>(root, '#report-chart').innerHTML = chartMarkup(
      model.variant,
    );
    apply();
    owner.refresh();
  },
);
required<HTMLElement>(document, '#mode').addEventListener('change', (event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!modes.includes(value as ProviderMode)) return;
  model.mode = value as ProviderMode;
  required<Element>(root, 'tbody').innerHTML = rowsMarkup(
    model.mode === 'international',
  );
  owner.revealTargets = targets(root, model.mode === 'missing-row');
  apply();
  owner.refresh();
});
required<HTMLElement>(document, '#override').addEventListener(
  'change',
  (event) => {
    model.override = (event.target as HTMLInputElement).checked;
    apply();
  },
);
if (await stylesReady()) {
  root
    .querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>(
      'fieldset button,fieldset input,fieldset select',
    )
    .forEach((el) => {
      el.disabled = false;
    });
  required<HTMLElement>(document, '#request-status').textContent =
    'Native example ready.';
} else
  required<HTMLElement>(document, '#request-status').textContent =
    'Required CSS unavailable. Content remains ready; reload to retry.';
apply();
window.addEventListener('pagehide', () => session.dispose(), { once: true });
