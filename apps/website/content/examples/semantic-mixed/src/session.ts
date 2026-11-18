import type { LoadingState } from '@dotquilt-internal/core';
import type { RevealTarget } from '@dotquilt-internal/core/animations';
import type { ChartVariant } from '@dotquilt-internal/core/chart';
import { type ProviderMode, providers } from './projections';
export const policy = (family: string) => ({
  mode: 'external' as const,
  href: `/dotquilt/${family}.css`,
});
export type Model = {
  state: LoadingState;
  cycle: number;
  detail: LoadingState;
  detailCycle: number;
  mode: ProviderMode;
  variant: ChartVariant;
  override: boolean;
  paused: boolean;
  revision: number;
};
export function initial(): Model {
  return {
    state: 'ready',
    cycle: 0,
    detail: 'ready',
    detailCycle: 0,
    mode: 'valid',
    variant: 'line',
    override: false,
    paused: false,
    revision: 0,
  };
}
export function targets(root: ParentNode, missing: boolean): RevealTarget[] {
  return Array.from(
    root.querySelectorAll<HTMLTableRowElement>('#report-table tbody tr'),
  ).flatMap((element, index) =>
    missing && index === 2
      ? []
      : [{ id: element.dataset.rowId ?? '', element }],
  );
}
export function createSession(root: HTMLElement, model: () => Model) {
  const projection = providers(root, model);
  const events: {
    owner: string;
    type: string;
    handoffId?: string;
    animation?: string;
    reason?: string;
  }[] = [];
  const errors: string[] = [];
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const id = (event.target as HTMLElement).id;
    if (event.type === 'dotquilt-error') errors.push(`${id}:${detail.code}`);
    else if (id === 'report-owner' || id === 'detail-owner')
      events.push({ owner: id, type: event.type, ...detail });
    events.splice(0, Math.max(0, events.length - 30));
    errors.splice(0, Math.max(0, errors.length - 20));
    queueMicrotask(publish);
  };
  const eventNames = [
    'dotquilt-handoff-start',
    'dotquilt-handoff-end',
    'dotquilt-handoff-cancel',
    'dotquilt-error',
  ];
  for (const name of eventNames) root.addEventListener(name, listener);
  function publish() {
    const output = document.getElementById('observations');
    if (output)
      output.textContent = JSON.stringify(
        { calls: projection.calls, events, errors },
        null,
        2,
      );
  }
  return {
    projection,
    publish,
    reset() {
      projection.reset();
      publish();
    },
    dispose() {
      for (const name of eventNames) root.removeEventListener(name, listener);
    },
  };
}
export async function stylesReady() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await Promise.all(
      ['region', 'chart', 'table', 'skeleton', 'text', 'typing'].map(
        async (family) => {
          const response = await fetch(`/dotquilt/${family}.css`, {
            signal: controller.signal,
          });
          if (
            !response.ok ||
            !response.headers
              .get('content-type')
              ?.toLowerCase()
              .startsWith('text/css') ||
            !(await response.text()).trim()
          )
            throw new Error('Required stylesheet unavailable');
        },
      ),
    );
    await document.fonts.ready;
    return true;
  } catch {
    controller.abort();
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
