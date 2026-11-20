import { defineAnimation } from 'dotquilt/animations';
import { rows, tableShimmer, typeOn } from 'dotquilt/animations/table';
import type { LoadingRegion } from 'dotquilt/region';
import type { TableInput, TableLoader } from 'dotquilt/table';
export function install(table: TableLoader, region: LoadingRegion) {
  const errors: string[] = [],
    events: { type: string; reason?: string; animation?: string }[] = [],
    violations: string[] = [];
  const abort = new AbortController();
  region.addEventListener('dotquilt-error', (e) => errors.push(e.detail.code), {
    signal: abort.signal,
  });
  for (const type of [
    'dotquilt-handoff-start',
    'dotquilt-handoff-end',
    'dotquilt-handoff-cancel',
  ])
    region.addEventListener(
      type,
      (e) => events.push({ type, ...(e as CustomEvent).detail }),
      { signal: abort.signal },
    );
  document.addEventListener(
    'securitypolicyviolation',
    (e) => violations.push(e.violatedDirective),
    { signal: abort.signal },
  );
  let calls = 0,
    mode = 'valid',
    customFrames = 0,
    retained: (() => void) | undefined;
  const content = document.getElementById('table-content') as HTMLElement;
  const nodes = Array.from(content.querySelectorAll('tr'));
  const targets = nodes.map((element, i) => ({ id: `row-${i}`, element }));
  function sample(): TableInput {
    const origin = table.getBoundingClientRect(),
      range = document.createRange();
    return {
      kind: 'table',
      cells: Array.from(content.querySelectorAll('td'), (td, i) => {
        const box = td.getBoundingClientRect(),
          text = td.textContent ?? '',
          node = td.firstChild;
        const glyphs = [];
        if (node?.nodeType === 3)
          for (let j = 0; j < text.length; j++) {
            range.setStart(node, j);
            range.setEnd(node, j + 1);
            const b = range.getBoundingClientRect();
            glyphs.push({
              character: text[j] ?? '',
              bounds: {
                x: b.x - origin.x,
                y: b.y - origin.y + b.height * 0.13,
                width: b.width,
                height: b.height * 0.74,
              },
            });
          }
        return {
          bounds: {
            x: box.x - origin.x,
            y: box.y - origin.y,
            width: box.width,
            height: box.height,
          },
          baseline: box.y - origin.y + box.height * 0.7,
          text,
          glyphs,
          rowId: `row-${Math.floor(i / 4)}`,
          rowIndex: Math.floor(i / 4),
          columnIndex: i % 4,
          kind: (['text', 'number', 'badge', 'date'] as const)[i % 4] ?? 'text',
          tone: 'accent' as const,
        };
      }),
    };
  }
  table.columns = [
    { kind: 'text' },
    { kind: 'number' },
    { kind: 'badge' },
    { kind: 'date' },
  ];
  table.targetProvider = () => {
    calls++;
    if (mode === 'throw') throw new Error('fixture');
    if (mode === 'null' || (mode === 'retry' && calls % 2 === 1)) return null;
    if (mode === 'invalid')
      return {
        kind: 'table',
        cells: [{ ...sample().cells[0], baseline: NaN }],
      } as TableInput;
    return sample();
  };
  region.revealTargets = targets;
  const customIdle = defineAnimation({
    contractVersion: 1,
    id: 'fixture/table-idle',
    family: 'table',
    phase: 'idle',
    options: {
      parse: (o: Readonly<{ gain?: number }>) => ({ gain: o.gain ?? 0.5 }),
    },
    frame(ctx, o) {
      customFrames++;
      ctx.dot({
        x: 20 + ctx.frame.timeMs / 100,
        y: 20,
        size: 2,
        opacity: o.gain,
        tone: 'accent',
      });
    },
    still(ctx) {
      ctx.dot({ x: 20, y: 20, size: 2, opacity: 0.2, tone: 'base' });
    },
  });
  const customHandoff = defineAnimation({
    contractVersion: 1,
    id: 'fixture/table-handoff',
    family: 'table',
    phase: 'handoff',
    options: { parse: () => ({}) },
    duration: () => 400,
    prepare(surface) {
      return { width: surface.width };
    },
    frame(ctx) {
      ctx.dot({
        x: ctx.prepared.width / 2,
        y: 20,
        size: 2,
        opacity: 1 - ctx.frame.progress,
        tone: 'accent',
      });
      ctx.reveal({ opacity: ctx.frame.progress });
      retained = () => ctx.reveal({ opacity: 0 });
    },
  });
  const dense = defineAnimation({
    contractVersion: 1,
    id: 'fixture/table-dense',
    family: 'table',
    phase: 'idle',
    options: { parse: () => ({}) },
    frame(ctx) {
      for (let i = 0; i < 4096; i++)
        ctx.dot({
          x: (((i % 64) + 0.5) * 400) / 64,
          y: ((Math.floor(i / 64) + 0.5) * 160) / 64,
          size: 0.5,
          opacity: 0.25,
          tone: 'base',
        });
    },
    still(ctx) {
      ctx.dot({ x: 20, y: 20, size: 1, opacity: 0.2, tone: 'base' });
    },
  });
  const regionSurfaces: { family: string; width: number; height: number }[] =
    [];
  const regionHandoff = defineAnimation({
    contractVersion: 1,
    id: 'fixture/table-region-override',
    family: 'region',
    phase: 'handoff',
    options: { parse: () => ({}) },
    duration: () => 400,
    prepare: () => ({}),
    frame(ctx) {
      const { family, width, height } = ctx.surface;
      regionSurfaces.push({ family, width, height });
      ctx.dot({
        x: width / 2,
        y: height / 2,
        size: 2,
        opacity: 1 - ctx.frame.progress,
        tone: 'base',
      });
      ctx.reveal({ opacity: ctx.frame.progress });
    },
  });
  const api = {
    regionSurfaces,
    override: () => {
      region.animations = { handoff: regionHandoff() };
    },
    dense: () => (table.animations = { idle: dense() }),
    errors,
    events,
    violations,
    sample,
    calls: () => calls,
    provider: (value: string) => {
      mode = value;
      calls = 0;
    },
    ready: (duration?: number, easing?: string) =>
      region.update({
        state: 'ready',
        timing: {
          ...(duration === undefined ? {} : { duration }),
          ...(easing ? { easing } : {}),
        },
      }),
    pending: (cycle = 'next') => region.update({ state: 'pending', cycle }),
    update: (patch: Parameters<TableLoader['update']>[0]) =>
      table.update(patch),
    recipe: (name: 'typeOn' | 'tableShimmer' | 'rows', options?: object) => {
      const factory = { typeOn, tableShimmer, rows }[name];
      const b = Reflect.apply(factory, undefined, [options]);
      table.animations = { ...table.animations, [b.phase]: b };
    },
    targets: (value = 'valid') => {
      region.revealTargets =
        value === 'missing'
          ? []
          : value === 'reverse'
            ? [...targets].reverse()
            : value === 'outside'
              ? [{ id: 'row-0', element: document.body }]
              : targets;
    },
    custom: () =>
      (table.animations = { idle: customIdle(), handoff: customHandoff() }),
    customFrames: () => customFrames,
    stale: () => retained?.(),
    identity: () =>
      document.getElementById('table-content') === content &&
      nodes.every((n, i) => content.querySelectorAll('tr')[i] === n),
    detach: () => region.remove(),
  };
  let demoTimer: ReturnType<typeof setTimeout> | undefined;
  let demoCycle = 0;
  const controls = document.getElementById('table-controls');
  for (const control of controls?.querySelectorAll<
    HTMLButtonElement | HTMLSelectElement
  >('button,select') ?? [])
    control.disabled = false;
  const selectIdle = () => {
    const idle =
      (document.getElementById('table-idle') as HTMLSelectElement | null)
        ?.value === 'tableShimmer'
        ? 'tableShimmer'
        : 'typeOn';
    const cellStyle =
      (document.getElementById('table-style') as HTMLSelectElement | null)
        ?.value || 'auto';
    api.recipe(idle, { cellStyle });
  };
  controls?.addEventListener('change', selectIdle, { signal: abort.signal });
  document.getElementById('table-replay')?.addEventListener(
    'click',
    () => {
      clearTimeout(demoTimer);
      api.ready(0);
      demoTimer = setTimeout(() => {
        api.pending(`manual-${++demoCycle}`);
        selectIdle();
        demoTimer = setTimeout(() => api.ready(), 700);
      }, 0);
    },
    { signal: abort.signal },
  );
  document.getElementById('table-pause')?.addEventListener(
    'click',
    (event) => {
      const paused = region.motion !== 'paused';
      region.motion = paused ? 'paused' : 'system';
      region.dispatchEvent(new Event('table-fixture-motion'));
      (event.currentTarget as HTMLElement).setAttribute(
        'aria-pressed',
        String(paused),
      );
    },
    { signal: abort.signal },
  );
  abort.signal.addEventListener('abort', () => clearTimeout(demoTimer), {
    once: true,
  });
  Reflect.set(window, 'tableTest', api);
  return () => abort.abort();
}
export type TableTest = ReturnType<typeof readAPI>;
function readAPI() {
  return {} as {
    regionSurfaces: { family: string; width: number; height: number }[];
    override: () => void;
    dense: () => void;
    errors: string[];
    events: { type: string; reason?: string; animation?: string }[];
    violations: string[];
    calls: () => number;
    provider: (value: string) => void;
    ready: (duration?: number, easing?: string) => void;
    pending: (cycle?: string) => void;
    update: (patch: Parameters<TableLoader['update']>[0]) => void;
    recipe: (
      name: 'typeOn' | 'tableShimmer' | 'rows',
      options?: object,
    ) => void;
    targets: (value?: string) => void;
    custom: () => void;
    customFrames: () => number;
    stale: () => void;
    identity: () => boolean;
    detach: () => void;
  };
}
declare global {
  interface Window {
    tableTest: TableTest;
  }
}
