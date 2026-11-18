import type { Candidate } from '../../packages/core/dist/internal/dense/painter';
import type {
  GlyphCell,
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
const painters = (await import(
  String('/pkg/dist/internal/dense/painter.js')
)) as typeof import('../../packages/core/dist/internal/dense/painter');
const drawing = (await import(
  String('/pkg/dist/internal/painter.js')
)) as typeof import('../../packages/core/dist/internal/painter');
const projections = (await import(
  String('/pkg/dist/internal/dense/projection.js')
)) as typeof import('../../packages/core/dist/internal/dense/projection');
const recipes = (await import(
  String('/pkg/dist/internal/dense/recipes.js')
)) as typeof import('../../packages/core/dist/internal/dense/recipes');
const query = new URL(location.href).searchParams;
const candidate = (query.get('candidate') ?? 'svg') as Candidate;
const family = query.get('family') ?? 'line';
const mode = query.get('mode') ?? 'inline';
const issues: string[] = [];
const violations: string[] = [];
document.addEventListener('securitypolicyviolation', (event) =>
  violations.push(event.violatedDirective),
);
native.registerLoadingRegion();
native.registerSkeletonBlock();
const region = document.createElement('dotquilt-region') as LoadingRegion;
region.id = 'proof-region';
region.className = 'm2-region';
region.state = 'pending';
region.setAttribute('aria-label', 'Dense proof outcome');
const block = document.createElement(
  'dotquilt-skeleton-block',
) as SkeletonBlock;
block.id = 'proof-surface';
block.slot = 'placeholder';
block.className = 'm2-block';
for (const [host, name] of [
  [region, 'region'],
  [block, 'skeleton'],
] as const)
  host.stylePolicy =
    mode === 'external'
      ? { mode: 'external', href: `/pkg/dist/${name}.css` }
      : {
          mode: 'inline',
          ...(mode === 'nonce' ? { nonce: 'fixture-nonce' } : {}),
        };
const article = document.createElement('article');
article.id = 'proof-content';
const action = document.createElement('button');
action.textContent = 'Current outcome';
article.append(action);
const cells: TableCell[] = [];
const glyphs = (text: string, x = 20, y = 45): GlyphCell[] =>
  [...text].map((character, index) => ({
    character,
    bounds: { x: x + index * 24, y, width: 20, height: 30 },
  }));
let projection: Projection;
if (family === 'text') {
  const value = document.createElement('p');
  value.textContent = '42.50';
  article.append(value);
  projection = {
    family: 'text',
    mask: glyphs('00.00'),
    value: glyphs('42.50'),
    precise: true,
  };
} else if (family === 'table') {
  const table = document.createElement('table');
  const body = document.createElement('tbody');
  table.append(body);
  for (let row = 0; row < 6; row++) {
    const tr = document.createElement('tr');
    tr.id = `row-${row}`;
    for (let column = 0; column < 3; column++) {
      const td = document.createElement('td');
      const text = String((row + column) % 10);
      td.textContent = text;
      tr.append(td);
      cells.push({
        bounds: {
          x: column * 100 + 10,
          y: row * 23 + 10,
          width: 90,
          height: 20,
        },
        text,
        baseline: row * 23 + 27,
        tone: 'base',
        rowId: tr.id,
        rowIndex: row,
        columnIndex: column,
        kind: column === 1 ? 'number' : 'text',
        glyphs: glyphs(text, column * 100 + 20, row * 23 + 10).map((g) => ({
          ...g,
          bounds: { ...g.bounds, width: 10, height: 16 },
        })),
      });
    }
    body.append(tr);
  }
  article.append(table);
  projection = { family: 'table', cells };
} else {
  const points = Array.from({ length: 8 }, (_, i) => ({
    x: 20 + i * 40,
    y: 30 + ((i * 37) % 90),
  }));
  const input =
    family === 'bar'
      ? {
          kind: 'bar' as const,
          bars: points.map((p) => ({
            x: p.x,
            y: p.y,
            width: 20,
            height: 145 - p.y,
          })),
          baseline: 145,
        }
      : family === 'scatter'
        ? {
            kind: 'scatter' as const,
            points: Array.from({ length: 10 }, (_, i) => ({
              x: 15 + i * 30,
              y: 25 + ((i * 43) % 110),
            })),
          }
        : { kind: 'line' as const, points, baseline: 145 };
  projection = { family: 'chart', input };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 320 160');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${family} outcome`);
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
    for (const bar of input.bars) {
      const rect = document.createElementNS(svg.namespaceURI, 'rect');
      for (const [k, v] of Object.entries(bar)) rect.setAttribute(k, String(v));
      svg.append(rect);
    }
  else
    for (const point of input.points) {
      const circle = document.createElementNS(svg.namespaceURI, 'circle');
      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
      circle.setAttribute('r', '3');
      svg.append(circle);
    }
  article.append(svg);
}
const acquired = projections.acquireProjection(() => projection);
if (!acquired.value) throw new Error('Invalid fixture');
const plan = recipes.prepareRecipe(acquired.value, 320, 160);
const factory = painters.candidatePainter(candidate);
// biome-ignore lint/correctness/useHookAtTopLevel: Native proof attachment is not a React hook; React dependency discovery misclassifies its name.
const release = drawing.usePainterForProof(block, factory);
const idle = authoring.defineAnimation({
  contractVersion: 1,
  id: 'example/m2/idle',
  family: 'skeleton',
  phase: 'idle',
  options: { parse: () => ({}) },
  frame({ frame, dot }) {
    plan.idle(frame.timeMs, dot);
  },
  still({ dot }) {
    plan.idle(0, dot, true);
  },
});
const handoff = authoring.defineAnimation({
  contractVersion: 1,
  id: 'example/m2/handoff',
  family: 'region',
  phase: 'handoff',
  options: { parse: () => ({}) },
  duration: () => (family === 'table' ? 615 : family === 'text' ? 461 : 900),
  prepare: () => ({ marker: 1 }),
  frame({ frame, dot, reveal, revealTarget, surface }) {
    plan.handoff(
      frame.progress,
      dot,
      reveal,
      revealTarget,
      surface.revealTargetIds,
    );
  },
});
block.animations = { idle: idle() };
region.animations = { handoff: handoff() };
region.revealTargets = [...article.querySelectorAll('tr')].map((element) => ({
  id: element.id,
  element,
}));
region.addEventListener('dotquilt-error', (e) => issues.push(e.detail.code));
const events: string[] = [];
for (const name of ['start', 'end', 'cancel'])
  region.addEventListener(`dotquilt-handoff-${name}`, () => events.push(name));
region.append(block, article);
document.getElementById('m2-stage')?.append(region);
let sample:
  | import('../../packages/core/dist/internal/painter').Painter
  | undefined;
let cohortDispose = () => {};
let cohortHosts: HTMLElement[] = [];
let cohortRoot: HTMLElement | undefined;
const api = {
  candidate,
  family,
  issues,
  violations,
  events,
  projection: acquired,
  async sample(progress: number) {
    block.motion = 'paused';
    block.animations = {};
    await Promise.resolve();
    sample ??= factory(block, (code) => issues.push(code));
    sample.draw((dot) =>
      plan.handoff(
        progress,
        dot,
        () => {},
        () => {},
        [],
      ),
    );
  },
  async reveal(duration?: number) {
    sample?.dispose();
    sample = undefined;
    block.motion = 'system';
    block.animations = { idle: idle() };
    await Promise.resolve();
    region.update({
      state: 'ready',
      ...(duration === undefined ? {} : { timing: { duration } }),
    });
  },
  pending(cycle = 'next') {
    region.update({ state: 'pending', cycle });
  },
  pause() {
    region.motion = 'paused';
  },
  cohort(profile: 'normal' | 'list' | 'stress') {
    api.dispose();
    const count = profile === 'normal' ? 24 : profile === 'list' ? 200 : 100;
    const width = profile === 'normal' ? 160 : profile === 'list' ? 180 : 120;
    const height = profile === 'list' ? 160 : profile === 'normal' ? 80 : 60;
    const container = document.createElement('div');
    container.className = `m2-cohort ${profile}`;
    cohortRoot = container;
    document.getElementById('m2-stage')?.append(container);
    const releases: (() => void)[] = [];
    const drawCohort = (
      timeMs: number,
      dot: (p: import('../../packages/core/dist/animations').Dot) => void,
      still = false,
    ) =>
      plan.idle(
        timeMs,
        (p) =>
          dot({
            ...p,
            x: (p.x * width) / 320,
            y: (p.y * height) / 160,
            size: (p.size * width) / 320,
          }),
        still,
      );
    const binding = authoring.defineAnimation({
      contractVersion: 1,
      id: 'example/m2/cohort',
      family: 'skeleton',
      phase: 'idle',
      options: { parse: () => ({}) },
      frame({ frame, dot }) {
        drawCohort(frame.timeMs, dot);
      },
      still({ dot }) {
        drawCohort(0, dot, true);
      },
    });
    for (let i = 0; i < count; i++) {
      const host = document.createElement('dotquilt-skeleton-block');
      host.className = 'm2-tile';
      host.motion = 'paused';
      host.stylePolicy = block.stylePolicy;
      // biome-ignore lint/correctness/useHookAtTopLevel: Native proof attachment is not a React hook; React dependency discovery misclassifies its name.
      releases.push(drawing.usePainterForProof(host, factory));
      host.animations = { idle: binding() };
      container.append(host);
      cohortHosts.push(host);
    }
    cohortDispose = () => {
      container.remove();
      for (const release of releases) release();
      cohortHosts = [];
      cohortRoot = undefined;
      cohortDispose = () => {};
    };
  },
  cohortMotion(motion: 'system' | 'paused') {
    for (const host of cohortHosts) (host as SkeletonBlock).motion = motion;
  },
  cohortState() {
    const clip = cohortRoot?.getBoundingClientRect();
    return {
      mounted: cohortHosts.length,
      visible: cohortHosts.filter((host) => {
        const b = host.getBoundingClientRect();
        return (
          clip &&
          b.bottom > clip.top &&
          b.top < clip.bottom &&
          b.right > clip.left &&
          b.left < clip.right &&
          b.top < innerHeight &&
          b.bottom > 0
        );
      }).length,
      ledger: Reflect.get(document, Symbol.for('dotquilt.v1.dot-ledger')),
    };
  },
  dispose() {
    cohortDispose();
    sample?.dispose();
    sample = undefined;
    region.remove();
    release();
  },
  identity: article,
};
Reflect.set(window, 'm2', api);
for (const [id, handler] of [
  ['reveal', () => api.reveal()],
  ['pending', () => api.pending()],
  ['pause', () => api.pause()],
] as const)
  document.getElementById(id)?.addEventListener('click', handler);
Reflect.set(window, 'm2Booted', true);

declare global {
  interface Window {
    m2: typeof api;
    m2Booted: boolean;
  }
}
