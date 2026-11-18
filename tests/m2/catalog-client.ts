import type {
  ChartLoader,
  LoadingRegion,
  TableLoader,
  TextLoader,
} from '../../packages/core/dist/index';
import type { Painter } from '../../packages/core/dist/internal/painter';
import {
  type CatalogFamily,
  catalogCounts,
  dashboardFamilies,
  dashboardGroups,
} from './catalog-model';

const native = (await import(
  String('/pkg/dist/index.js')
)) as typeof import('../../packages/core/dist/index');
const { candidatePainter } = (await import(
  String('/pkg/dist/internal/dense/painter.js')
)) as typeof import('../../packages/core/dist/internal/dense/painter');
const { usePainterForProof } = (await import(
  String('/pkg/dist/internal/painter.js')
)) as typeof import('../../packages/core/dist/internal/painter');
const query = new URL(location.href).searchParams;
const profile = query.get('profile') ?? 'normal';
const phase = query.get('phase') ?? 'idle';
const candidate = query.get('candidate') ?? 'native';
const family = (query.get('family') ?? 'chart-line') as CatalogFamily;
const container = document.getElementById('bench') as HTMLElement;
const hosts: HTMLElement[] = [],
  regions: LoadingRegion[] = [],
  texts: TextLoader[] = [];
const families: CatalogFamily[] = [],
  releases: (() => void)[] = [];
const identities = new Map<HTMLElement, Node>();
let discarded: { kind: 'host' | 'content'; ref: WeakRef<Node> }[] = [];
const committed: Record<string, number[]> = {},
  signatures = new Map<HTMLElement, number>();
const errors: { code: string; at: number }[] = [],
  violations: string[] = [];
const shifts: { value: number; startTime: number; hadRecentInput: boolean }[] =
  [];
const scrolls: {
  at: number;
  top: number;
  visible: number;
  ids: string[];
  ledger: unknown;
}[] = [];
const observations: { at: number; host: string; signature: string }[] = [];
const terminal: { id: string; type: string; reason?: string }[] = [];
let measuring = false,
  request = 0,
  prepared = false;
const opportunities: number[] = [];
const mark = (name: string) => performance.mark(`dq:${name}`);
const frames = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
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
let initialRects = rects();
const observer = new PerformanceObserver((list) =>
  collectShifts(list.getEntries()),
);
function collectShifts(entries: PerformanceEntry[]) {
  for (const entry of entries) {
    const s = entry as PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
    };
    shifts.push({
      value: s.value,
      startTime: s.startTime,
      hadRecentInput: s.hadRecentInput,
    });
  }
}
try {
  observer.observe({ type: 'layout-shift', buffered: true });
} catch {
  /* Capability reported in every result. */
}
document.addEventListener('securitypolicyviolation', (e) =>
  violations.push(e.violatedDirective),
);
document.addEventListener('dotquilt-error', (e) =>
  errors.push({
    code: (e as CustomEvent<{ code: string }>).detail.code,
    at: performance.now(),
  }),
);
for (const type of [
  'dotquilt-handoff-start',
  'dotquilt-handoff-end',
  'dotquilt-handoff-cancel',
])
  document.addEventListener(type, (e) =>
    terminal.push({
      id: (e.target as HTMLElement).id,
      type,
      ...(e as CustomEvent).detail,
    }),
  );
for (const register of [
  native.registerSkeletonBlock,
  native.registerSkeletonLine,
  native.registerSkeletonCircle,
  native.registerSkeletonText,
  native.registerTextLoader,
  native.registerChartLoader,
  native.registerTableLoader,
  native.registerTypingDots,
  native.registerLoadingRegion,
])
  register();

function probe(host: HTMLElement) {
  if (candidate === 'native') return;
  const factory = candidatePainter(candidate as 'canvas' | 'svg' | 'dom');
  // Native proof attachment is private and never a consumer renderer option.
  releases.push(
    // biome-ignore lint/correctness/useHookAtTopLevel: This native proof API is not a React hook.
    usePainterForProof(host, (element, report): Painter => {
      const painter = factory(element, report);
      return {
        dispose: () => painter.dispose(),
        draw(produce) {
          let signature = 0,
            dots = 0;
          painter.draw((emit) =>
            produce((v) => {
              dots++;
              signature = Math.imul(
                signature ^ Math.round(v.x * 16 + v.y * 32 + v.opacity * 1024),
                16777619,
              );
              emit(v);
            }),
          );
          if (measuring && dots && signatures.get(host) !== signature) {
            committed[host.id] ??= [];
            committed[host.id]?.push(performance.now());
          }
          signatures.set(host, signature);
        },
      };
    }),
  );
}
function outcome(kind: CatalogFamily, id: string) {
  const article = document.createElement('article');
  article.className = 'catalog-outcome';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `Outcome ${id}`;
  article.append(button);
  if (kind === 'table') {
    const table = document.createElement('table');
    for (let i = 0; i < 3; i++) {
      const row = table.insertRow();
      row.id = `${id}-row-${i}`;
      row.insertCell().textContent = String(i + 1);
      row.insertCell().textContent = String(40 + i);
    }
    article.append(table);
  } else if (kind.startsWith('chart-')) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 160 80');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${kind} outcome`);
    const points = [
      [10, 60],
      [40, 30],
      [80, 45],
      [120, 20],
      [150, 35],
    ];
    if (kind === 'chart-line') {
      const line = document.createElementNS(svg.namespaceURI, 'polyline');
      line.setAttribute('points', points.map((p) => p.join(',')).join(' '));
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', 'currentColor');
      svg.append(line);
    } else
      for (const [x = 0, y = 0] of points) {
        const mark = document.createElementNS(
          svg.namespaceURI,
          kind === 'chart-bar' ? 'rect' : 'circle',
        );
        const attrs =
          kind === 'chart-bar'
            ? { x, y, width: 10, height: 70 - y }
            : { cx: x, cy: y, r: 3 };
        for (const [key, value] of Object.entries(attrs))
          mark.setAttribute(key, String(value));
        svg.append(mark);
      }
    article.append(svg);
  }
  return article;
}
function create(kind: CatalogFamily): HTMLElement {
  const tag =
    (
      {
        block: 'skeleton-block',
        line: 'skeleton-line',
        circle: 'skeleton-circle',
        multiline: 'skeleton-text',
        text: 'text-loader',
        typing: 'typing-dots',
        table: 'table-loader',
        region: 'region',
      } as Partial<Record<CatalogFamily, string>>
    )[kind] ?? 'chart-loader';
  const host = document.createElement(`dotquilt-${tag}`);
  host.className = 'catalog-surface';
  host.id = `surface-${hosts.length}`;
  host.dataset.family = kind;
  Reflect.set(host, 'motion', 'paused');
  if (kind === 'multiline') Reflect.set(host, 'lines', 3);
  if (kind === 'text') {
    const text = host as TextLoader;
    text.state = 'pending';
    text.mask = '00.00';
    text.setAttribute('aria-label', `Value ${hosts.length}`);
    const value = document.createTextNode('42.50');
    text.append(value);
    texts.push(text);
    identities.set(text, value);
  }
  if (kind.startsWith('chart-')) {
    const chart = host as ChartLoader;
    chart.variant = kind.slice(6) as 'line' | 'bar' | 'scatter';
    chart.targetProvider = ({ width, height }) => {
      const points = [
        [10, 60],
        [40, 30],
        [80, 45],
        [120, 20],
        [150, 35],
      ].map(([x = 0, y = 0]) => ({
        x: (x * width) / 160,
        y: (y * height) / 80,
      }));
      return chart.variant === 'bar'
        ? {
            kind: 'bar',
            bars: points.map((p) => ({
              ...p,
              width: width / 16,
              height: height * 0.875 - p.y,
            })),
            baseline: height * 0.875,
          }
        : chart.variant === 'line'
          ? { kind: 'line', points, baseline: height * 0.875 }
          : { kind: 'scatter', points };
    };
  }
  if (kind === 'table') {
    const table = host as TableLoader;
    table.rows = 3;
    table.rowHeight = 24;
    table.columns = [{ kind: 'number' }, { kind: 'number' }];
    table.targetProvider = ({ width, height }) => ({
      kind: 'table',
      cells: Array.from({ length: 6 }, (_, i) => {
        const row = Math.floor(i / 2),
          column = i % 2;
        const text = column ? String(40 + row) : String(row + 1);
        const x = (column * width) / 2 + 4,
          y = (row * height) / 3;
        return {
          bounds: { x, y, width: width / 2 - 8, height: height / 3 },
          baseline: y + height / 4,
          text,
          rowId: `${host.id}-row-${row}`,
          rowIndex: row,
          columnIndex: column,
          tone: 'base',
          kind: 'number',
          glyphs: [...text].map((character, j) => ({
            character,
            bounds: { x: x + j * 7, y: y + 4, width: 7, height: 14 },
          })),
        };
      }),
    });
  }
  hosts.push(host);
  families.push(kind);
  committed[host.id] = [];
  probe(host);
  return host;
}
function group(kinds: readonly CatalogFamily[], parent: HTMLElement) {
  const region = document.createElement('dotquilt-region');
  region.className = 'catalog-region';
  region.id = `region-${regions.length}`;
  region.motion = 'paused';
  region.state = 'pending';
  region.setAttribute('aria-label', `Group ${regions.length + 1}`);
  const placeholder = document.createElement('div'),
    content = document.createElement('div');
  placeholder.slot = 'placeholder';
  placeholder.className = content.className = 'catalog-group';
  const targets = [];
  for (const kind of kinds) {
    const host = create(kind),
      real = outcome(kind, host.id);
    placeholder.append(host);
    content.append(real);
    identities.set(host, real);
    targets.push(
      ...[...real.querySelectorAll('tr')].map((element) => ({
        id: element.id,
        element,
      })),
    );
  }
  region.revealTargets = targets;
  region.append(placeholder, content);
  parent.append(region);
  regions.push(region);
  probe(region);
}
function visibleHosts() {
  const clip = container.getBoundingClientRect();
  return hosts.filter((host) => {
    const r = host.getBoundingClientRect();
    return (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > Math.max(clip.top, 0) &&
      r.top < Math.min(clip.bottom, innerHeight) &&
      r.right > Math.max(clip.left, 0) &&
      r.left < Math.min(clip.right, innerWidth)
    );
  });
}
function ledger() {
  const value = Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')) as
    | { dots: number; users: number; pixels?: number; bytes?: number }
    | undefined;
  return value ? { ...value } : null;
}
function observePresentation() {
  for (const host of visibleHosts()) {
    const root = host.shadowRoot;
    const circle = root?.querySelector('circle');
    const signature = JSON.stringify({
      circle: circle
        ? ['cx', 'cy', 'r', 'opacity'].map((a) => circle.getAttribute(a))
        : (Reflect.get(host, Symbol.for('dotquilt.painter.v1'))
            ?.capture?.(1)
            .map(
              (dot: { x: number; y: number; size: number; opacity: number }) =>
                [dot.x, dot.y, dot.size, dot.opacity].map(String),
            )[0] ?? null),
      effects: root
        ?.getAnimations()
        .map((a) => ({ time: a.currentTime, state: a.playState })),
    });
    observations.push({ at: performance.now(), host: host.id, signature });
  }
}
const api = {
  async prepare() {
    if (prepared)
      throw Error('Use fresh instances or teardown before preparing');
    prepared = true;
    await document.fonts.ready;
    mark('init:start');
    if (profile === 'normal') {
      for (const kinds of dashboardGroups) group(kinds, container);
      const band = document.createElement('div');
      band.className = 'catalog-text-band';
      for (let i = 0; i < 4; i++) band.append(create('text'));
      container.append(band);
    } else {
      const kinds =
        profile === 'individual'
          ? [family]
          : Array.from(
              { length: profile === 'list' ? 200 : 100 },
              (_, i) =>
                dashboardFamilies[
                  i % dashboardFamilies.length
                ] as CatalogFamily,
            );
      for (const kind of kinds) {
        if (kind === 'text') container.append(create(kind));
        else if (kind === 'region') {
          const region = create(kind) as LoadingRegion;
          region.state = 'pending';
          region.setAttribute('aria-label', 'Independent loading region');
          const placeholder = document.createElement('div');
          placeholder.slot = 'placeholder';
          placeholder.textContent = 'Loading';
          const content = outcome(kind, region.id);
          identities.set(region, content);
          region.append(placeholder, content);
          regions.push(region);
          container.append(region);
        } else group([kind], container);
      }
    }
    await frames();
    initialRects = rects();
    mark('init:end');
    return api.snapshot();
  },
  snapshot() {
    const visible = visibleHosts();
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
      internalNodes: [...new Set([...hosts, ...regions])].reduce(
        (sum, host) =>
          sum + (host.shadowRoot?.querySelectorAll('*').length ?? 0),
        0,
      ),
      canvases: hosts.flatMap((host) =>
        [...(host.shadowRoot?.querySelectorAll('canvas') ?? [])].map((c) => ({
          width: c.width,
          height: c.height,
        })),
      ),
      mounted: hosts.length,
      visible: visible.length,
      visibleIds: visible.map((host) => host.id),
      publicHosts: new Set([...hosts, ...regions]).size,
      painterCount: hosts.filter((host) =>
        host.shadowRoot?.querySelector('[data-dotquilt-painter]'),
      ).length,
      ledger: ledger(),
      rects: rects(),
      dpr: devicePixelRatio,
      zoom: visualViewport?.scale,
      documentHidden: document.hidden,
      ready: [...new Set([...regions, ...texts])].filter(
        (host) => host.presentation === 'ready',
      ).length,
      violations: [...violations],
      catalog: {
        families: catalogCounts(families),
        regions: regions.length,
        controllers: new Set([...regions, ...texts]).size,
        identitiesRetained: [...identities.values()].every(
          (node) => node.isConnected,
        ),
        scrollTop: container.scrollTop,
      },
    };
  },
  async run(animated: boolean) {
    const windowMs = phase === 'idle' ? 4000 : 900;
    measuring = true;
    mark('active:start');
    mark('setup:start');
    const start = performance.now();
    for (const host of new Set([...hosts, ...regions]))
      Reflect.set(host, 'motion', animated ? 'system' : 'paused');
    if (phase === 'handoff')
      for (const host of new Set([...regions, ...texts]))
        host.update({
          state: 'ready',
          timing: { duration: animated ? 900 : 0 },
        });
    await Promise.resolve();
    mark('setup:end');
    let step = 0,
      nextObservation = 0;
    const tick = (time: number) => {
      if (!measuring) return;
      opportunities.push(time);
      if (time - start >= nextObservation) {
        observePresentation();
        nextObservation += 750;
      }
      if (
        profile === 'list' &&
        phase === 'idle' &&
        step < 3 &&
        time - start >= (step + 1) * 1000
      ) {
        step++;
        container.scrollTop = [0, 960, 2400, 4320][step] as number;
        const visible = visibleHosts();
        scrolls.push({
          at: time,
          top: container.scrollTop,
          visible: visible.length,
          ids: visible.map((h) => h.id),
          ledger: ledger(),
        });
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
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
    cancelAnimationFrame(request);
    if (phase === 'handoff') await frames();
    collectShifts(observer.takeRecords());
    return {
      windowMs,
      start,
      committed,
      opportunities,
      initialRects,
      final: api.snapshot(),
      errors: [...errors],
      shifts: [...shifts],
      clsSupported:
        PerformanceObserver.supportedEntryTypes.includes('layout-shift'),
      catalog: {
        scrolls: [...scrolls],
        observations: [...observations],
        terminal: [...terminal],
        cadenceScope:
          candidate === 'native'
            ? 'Sampled native decoration/effect states; not optical presentation or per-surface frame proof'
            : 'Bounded-command commit probes plus sampled native effects; not optical presentation',
      },
    };
  },
  interrupt() {
    for (const host of new Set([...regions, ...texts]))
      host.update({ state: 'pending', cycle: 'superseding-cycle' });
  },
  updateAppearance() {
    for (const host of hosts)
      if ('speed' in host) Reflect.set(host, 'speed', 1.05);
  },
  trackDiscarded() {
    for (const host of new Set([...hosts, ...regions]))
      discarded.push({ kind: 'host', ref: new WeakRef(host) });
    for (const content of new Set(identities.values()))
      discarded.push({ kind: 'content', ref: new WeakRef(content) });
  },
  retained() {
    discarded = discarded.filter((value) => value.ref.deref() !== undefined);
    return {
      hosts: discarded.filter((value) => value.kind === 'host').length,
      content: discarded.filter((value) => value.kind === 'content').length,
      method:
        'Laboratory GC and weak references; local diagnostic, not physical retained-memory qualification',
    };
  },
  async teardown() {
    mark('teardown:start');
    measuring = false;
    cancelAnimationFrame(request);
    container.replaceChildren();
    for (const release of releases) release();
    hosts.length =
      regions.length =
      texts.length =
      releases.length =
      families.length =
        0;
    identities.clear();
    signatures.clear();
    container.scrollTop = 0;
    for (const key of Object.keys(committed)) delete committed[key];
    shifts.length =
      errors.length =
      violations.length =
      opportunities.length =
      observations.length =
      scrolls.length =
      terminal.length =
        0;
    await Promise.resolve();
    mark('teardown:end');
    prepared = false;
    return {
      drawing: Reflect.has(document, Symbol.for('dotquilt.v1.dot-ledger')),
      frames: Reflect.has(document, Symbol.for('dotquilt.frames.v1')),
      views: Reflect.has(document, Symbol.for('dotquilt.view.v1')),
    };
  },
};
Reflect.set(window, 'catalogFixture', api);
export type CatalogFixture = typeof api;
declare global {
  interface Window {
    catalogFixture: CatalogFixture;
  }
}
