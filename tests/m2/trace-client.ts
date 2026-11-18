import type { Candidate } from '../../packages/core/dist/internal/dense/painter';
import type {
  Projection,
  TableCell,
} from '../../packages/core/dist/internal/dense/projection';
import type { LoadingRegion } from '../../packages/core/dist/region';
import type { SkeletonBlock } from '../../packages/core/dist/skeleton';

const native = (await import(
  String('/pkg/dist/index.js')
)) as typeof import('../../packages/core/dist/index');
const authoring = (await import(
  String('/pkg/dist/animations.js')
)) as typeof import('../../packages/core/dist/animations');
const { candidatePainter } = (await import(
  String('/pkg/dist/internal/dense/painter.js')
)) as typeof import('../../packages/core/dist/internal/dense/painter');
const { usePainterForProof } = (await import(
  String('/pkg/dist/internal/painter.js')
)) as typeof import('../../packages/core/dist/internal/painter');
const { acquireProjection } = (await import(
  String('/pkg/dist/internal/dense/projection.js')
)) as typeof import('../../packages/core/dist/internal/dense/projection');
const { prepareRecipe } = (await import(
  String('/pkg/dist/internal/dense/recipes.js')
)) as typeof import('../../packages/core/dist/internal/dense/recipes');
const query = new URL(location.href).searchParams;
const candidate = query.get('candidate') as Candidate;
const family = query.get('family') ?? 'line';
const profile = query.get('profile') ?? 'normal';
const phase = query.get('phase') ?? 'idle';
const settings =
  profile === 'individual'
    ? [1, 320, 160]
    : profile === 'normal'
      ? [24, 160, 80]
      : profile === 'list'
        ? [200, 180, 160]
        : [100, 120, 60];
const [count = 1, width = 320, height = 160] = settings;
const duration = family === 'text' ? 461 : family === 'table' ? 615 : 900;
const hosts: SkeletonBlock[] = [],
  regions: LoadingRegion[] = [],
  releases: (() => void)[] = [];
const committed: Record<string, number[]> = {},
  signatures = new Map<HTMLElement, number>();
const dynamic = new Set<HTMLElement>();
const errors: { code: string; at: number }[] = [];
const shifts: { value: number; startTime: number; hadRecentInput: boolean }[] =
  [];
const violations: string[] = [];
let measuring = false,
  frameRequest = 0;
const opportunities: number[] = [];
const container = document.getElementById('bench') as HTMLElement;
const rects = () =>
  Object.fromEntries(
    ['before', 'bench', 'after'].map((id) => {
      const r = document.getElementById(id)?.getBoundingClientRect();
      return [
        id,
        r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
      ];
    }),
  );
const initialRects = rects();
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const shift = entry as PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
    };
    shifts.push({
      value: shift.value,
      startTime: shift.startTime,
      hadRecentInput: shift.hadRecentInput,
    });
  }
});
try {
  observer.observe({ type: 'layout-shift', buffered: true });
} catch {
  /* Explicit unsupported flag below. */
}
document.addEventListener('securitypolicyviolation', (e) =>
  violations.push(e.violatedDirective),
);
native.registerSkeletonBlock();
native.registerLoadingRegion();
const mark = (name: string) => performance.mark(`dq:${name}`);
const frames = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
function projection(): Projection {
  const points = Array.from({ length: 8 }, (_, i) => ({
    x: 20 + i * 40,
    y: 30 + ((i * 37) % 90),
  }));
  const glyph = (
    character: string,
    x: number,
    y: number,
    width = 20,
    height = 30,
  ) => ({ character, bounds: { x, y, width, height } });
  if (family === 'text')
    return {
      family: 'text',
      precise: true,
      mask: [...'00.00'].map((c, i) => glyph(c, 20 + i * 24, 45)),
      value: [...'42.50'].map((c, i) => glyph(c, 20 + i * 24, 45)),
    };
  if (family === 'table')
    return {
      family: 'table',
      cells: Array.from({ length: 18 }, (_, i): TableCell => {
        const row = Math.floor(i / 3),
          column = i % 3,
          text = String((row + column) % 10);
        return {
          bounds: {
            x: column * 100 + 10,
            y: row * 23 + 10,
            width: 90,
            height: 20,
          },
          text,
          baseline: row * 23 + 27,
          tone: 'base',
          rowId: `row-${row}`,
          rowIndex: row,
          columnIndex: column,
          kind: column === 1 ? 'number' : 'text',
          glyphs: [glyph(text, column * 100 + 20, row * 23 + 10, 10, 16)],
        };
      }),
    };
  return {
    family: 'chart',
    input:
      family === 'bar'
        ? {
            kind: 'bar',
            bars: points.map((p) => ({ ...p, width: 20, height: 145 - p.y })),
            baseline: 145,
          }
        : family === 'scatter'
          ? {
              kind: 'scatter',
              points: Array.from({ length: 10 }, (_, i) => ({
                x: 15 + i * 30,
                y: 25 + ((i * 43) % 110),
              })),
            }
          : { kind: 'line', points, baseline: 145 },
  };
}
function content(value: Projection) {
  const article = document.createElement('article');
  article.className = 'trace-content';
  if (value.family === 'text') {
    article.textContent = '42.50';
    return article;
  }
  if (value.family === 'table') {
    const table = document.createElement('table');
    for (let row = 0; row < 6; row++) {
      const tr = table.insertRow();
      tr.id = `row-${row}`;
      for (const cell of value.cells.filter((c) => c.rowIndex === row))
        tr.insertCell().textContent = cell.text;
    }
    article.append(table);
    return article;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 320 160');
  svg.setAttribute('aria-label', `${family} outcome`);
  svg.setAttribute('role', 'img');
  const input = value.input;
  if (input.kind === 'line') {
    const line = document.createElementNS(svg.namespaceURI, 'polyline');
    line.setAttribute(
      'points',
      input.points.map((p) => `${p.x},${p.y}`).join(' '),
    );
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    svg.append(line);
  } else if (input.kind === 'bar')
    for (const b of input.bars) {
      const r = document.createElementNS(svg.namespaceURI, 'rect');
      for (const [k, v] of Object.entries(b)) r.setAttribute(k, String(v));
      svg.append(r);
    }
  else
    for (const p of input.points) {
      const c = document.createElementNS(svg.namespaceURI, 'circle');
      c.setAttribute('cx', String(p.x));
      c.setAttribute('cy', String(p.y));
      c.setAttribute('r', '3');
      svg.append(c);
    }
  article.append(svg);
  return article;
}
const api = {
  async prepare() {
    await document.fonts.ready;
    mark('init:start');
    const result = acquireProjection(projection);
    if (!result.value) throw new Error('Invalid fixed projection');
    const value = result.value,
      plan = prepareRecipe(value, 320, 160),
      factory = candidatePainter(candidate);
    for (let i = 0; i < count; i++) {
      const host = document.createElement('dotquilt-skeleton-block');
      host.id = `surface-${i}`;
      host.className = 'm2-tile';
      host.motion = 'paused';
      committed[host.id] = [];
      releases.push(
        // biome-ignore lint/correctness/useHookAtTopLevel: Native proof attachment is not a React hook; React dependency discovery misclassifies its name.
        usePainterForProof(host, (element, report) => {
          const painter = factory(element, report);
          return {
            dispose: () => painter.dispose(),
            draw(produce) {
              let signature = 0,
                dots = 0;
              painter.draw((dot) =>
                produce((v) => {
                  dots++;
                  signature = Math.imul(
                    signature ^
                      Math.round(v.x * 16 + v.y * 32 + v.opacity * 1024),
                    16777619,
                  );
                  dot(v);
                }),
              );
              if (
                measuring &&
                dynamic.has(host) &&
                dots &&
                signatures.get(host) !== signature
              )
                committed[host.id]?.push(performance.now());
              signatures.set(host, signature);
            },
          };
        }),
      );
      const scale = (v: import('../../packages/core/dist/animations').Dot) => ({
        ...v,
        x: (v.x * width) / 320,
        y: (v.y * height) / 160,
        size: (v.size * width) / 320,
      });
      const idle = authoring.defineAnimation({
        contractVersion: 1,
        id: 'example/trace/idle',
        family: 'skeleton',
        phase: 'idle',
        options: { parse: () => ({}) },
        frame({ frame, dot }) {
          dynamic.add(host);
          plan.idle(frame.timeMs, (v) => dot(scale(v)));
        },
        still({ dot }) {
          dynamic.delete(host);
          plan.idle(0, (v) => dot(scale(v)), true);
        },
      });
      host.animations = { idle: idle() };
      host.addEventListener('dotquilt-error', (e) =>
        errors.push({ code: e.detail.code, at: performance.now() }),
      );
      hosts.push(host);
      if (phase === 'handoff') {
        const region = document.createElement('dotquilt-region');
        region.className = 'm2-tile trace-region';
        region.state = 'pending';
        region.motion = 'paused';
        region.setAttribute('aria-label', `Outcome ${i + 1}`);
        region.addEventListener('dotquilt-error', (e) => {
          if (e.target === region)
            errors.push({ code: e.detail.code, at: performance.now() });
        });
        host.slot = 'placeholder';
        const article = content(value);
        for (const row of article.querySelectorAll('tr'))
          row.id = `${host.id}-${row.id}`;
        region.revealTargets = [...article.querySelectorAll('tr')].map(
          (element) => ({ id: element.id, element }),
        );
        const handoff = authoring.defineAnimation({
          contractVersion: 1,
          id: 'example/trace/handoff',
          family: 'region',
          phase: 'handoff',
          options: { parse: () => ({}) },
          duration: () => duration,
          prepare: () => ({}),
          frame({ frame, dot, reveal, revealTarget, surface }) {
            dynamic.add(host);
            plan.handoff(
              frame.progress,
              (v) => dot(scale(v)),
              reveal,
              revealTarget,
              surface.revealTargetIds,
            );
          },
        });
        region.animations = { handoff: handoff() };
        region.append(host, article);
        container.append(region);
        regions.push(region);
      } else container.append(host);
    }
    await frames();
    mark('init:end');
    return api.snapshot();
  },
  snapshot() {
    const clip = container.getBoundingClientRect();
    const visible = hosts.filter((host) => {
      const r = host.getBoundingClientRect();
      return (
        r.bottom > clip.top &&
        r.top < clip.bottom &&
        r.right > clip.left &&
        r.left < clip.right &&
        r.top < innerHeight &&
        r.bottom > 0
      );
    });
    return {
      viewport: [innerWidth, innerHeight],
      surfaces: visible.map((host) => {
        const r = host.getBoundingClientRect();
        return {
          id: host.id,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        };
      }),
      internalNodes:
        hosts.reduce(
          (n, host) => n + (host.shadowRoot?.querySelectorAll('*').length ?? 0),
          0,
        ) +
        regions.reduce(
          (n, host) => n + (host.shadowRoot?.querySelectorAll('*').length ?? 0),
          0,
        ),
      canvases: hosts.flatMap((host) =>
        [...(host.shadowRoot?.querySelectorAll('canvas') ?? [])].map(
          (canvas) => ({ width: canvas.width, height: canvas.height }),
        ),
      ),
      mounted: hosts.length,
      visible: visible.length,
      visibleIds: visible.map((h) => h.id),
      publicHosts: hosts.length + regions.length,
      painterCount: hosts.filter((h) =>
        h.shadowRoot?.querySelector('[data-dotquilt-painter]'),
      ).length,
      ledger:
        Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')) ?? null,
      rects: rects(),
      dpr: devicePixelRatio,
      zoom: visualViewport?.scale,
      documentHidden: document.hidden,
      ready: regions.filter((r) => r.presentation === 'ready').length,
      violations: [...violations],
    };
  },
  async run(animated: boolean) {
    const windowMs = phase === 'idle' ? 4000 : duration;
    measuring = true;
    mark('active:start');
    mark('setup:start');
    const start = performance.now();
    if (phase === 'idle')
      for (const host of hosts) host.motion = animated ? 'system' : 'paused';
    else {
      for (const region of regions) {
        region.motion = animated ? 'system' : 'paused';
        region.update({
          state: 'ready',
          ...(animated ? {} : { timing: { duration: 0 } }),
        });
      }
      for (const host of hosts) host.motion = animated ? 'system' : 'paused';
    }
    await Promise.resolve();
    mark('setup:end');
    const tick = (time: number) => {
      if (!measuring) return;
      opportunities.push(time);
      frameRequest = requestAnimationFrame(tick);
    };
    frameRequest = requestAnimationFrame(tick);
    await new Promise<void>((resolve) => {
      const finish = () => {
        const left = start + windowMs - performance.now();
        if (left > 0) setTimeout(finish, left);
        else resolve();
      };
      setTimeout(finish, windowMs);
    });
    mark('active:end');
    measuring = false;
    cancelAnimationFrame(frameRequest);
    if (phase === 'handoff') await frames();
    for (const entry of observer.takeRecords()) {
      const shift = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      };
      shifts.push({
        value: shift.value,
        startTime: shift.startTime,
        hadRecentInput: shift.hadRecentInput,
      });
    }
    return {
      windowMs,
      start,
      committed,
      opportunities,
      initialRects,
      final: api.snapshot(),
      errors,
      shifts,
      clsSupported:
        PerformanceObserver.supportedEntryTypes.includes('layout-shift'),
    };
  },
  async teardown() {
    mark('teardown:start');
    container.replaceChildren();
    for (const release of releases) release();
    hosts.length = 0;
    regions.length = 0;
    dynamic.clear();
    signatures.clear();
    observer.disconnect();
    await Promise.resolve();
    mark('teardown:end');
    return {
      drawing: Reflect.has(document, Symbol.for('dotquilt.v1.dot-ledger')),
      frames: Reflect.has(document, Symbol.for('dotquilt.frames.v1')),
      views: Reflect.has(document, Symbol.for('dotquilt.view.v1')),
    };
  },
};
Reflect.set(window, 'traceFixture', api);
declare global {
  interface Window {
    traceFixture: typeof api;
  }
}
