import type { AnimationSurface, Dot, RevealFrame } from '../animations.js';
import type { RowsOptions, TypeOnOptions } from '../table-animations.js';
import { mix, smooth } from './chart-math.js';
import { managedPainter } from './dense/managed-painter.js';
import { createDenseRunner as createRunner } from './dense/runner.js';
import { createHandoff } from './handoff.js';
import { clamp } from './math.js';
import { createRevealEffect } from './reveal-effect.js';
import { nativeSurface } from './surface.js';
import { tableBinding, tableFactory } from './table-factory.js';
import { tableField } from './table-field.js';
import { createTargets } from './targets.js';
import { glyph } from './text-glyphs.js';

export function tableIdle(shimmer = false) {
  return Object.freeze({
    id: `dotquilt/table/${shimmer ? 'shimmer' : 'type-on'}`,
    family: 'table' as const,
    phase: 'idle' as const,
    runner: createRunner,
    snapshot: nativeSurface,
    draw: (
      surface: AnimationSurface<'table'>,
      options: TypeOnOptions,
      time: number,
      still: boolean,
      dot: (d: Dot) => void,
    ) => tableField(surface, options, time, still, dot, shimmer),
  });
}
const typeOnDefinition = /* @__PURE__ */ tableIdle();
export const typeOnFactory = /* @__PURE__ */ tableFactory<
  'idle',
  TypeOnOptions
>(typeOnDefinition, { cadenceMs: [600, 250, 1200] }, true);
export const defaultTypeOn = /* @__PURE__ */ tableBinding(typeOnDefinition, {
  cadenceMs: 600,
  cellStyle: 'auto' as const,
});
const precise = (s: AnimationSurface<'table'>) =>
  s.revealTargetIds.length > 0 &&
  s.input.cells.length > 0 &&
  s.input.cells.every(
    (c) => s.revealTargetIds.includes(c.rowId) && c.glyphs.length > 0,
  );
interface CellPlan {
  readonly from: readonly Dot[];
  readonly to: readonly Dot[];
  readonly row: number;
  readonly tone: 'base' | 'accent';
}
const rowsDefinition = /* @__PURE__ */ Object.freeze({
  id: 'dotquilt/table/rows',
  family: 'table' as const,
  phase: 'handoff' as const,
  handoff: createHandoff,
  painter: managedPainter,
  snapshot: nativeSurface,
  reveal: createRevealEffect,
  targets: createTargets,
  duration: (s: AnimationSurface<'table'>, o: RowsOptions) =>
    precise(s) ? 7 * o.staggerMs + 370 : 150,
  prepare(s: AnimationSurface<'table'>) {
    const used = new Set<Dot>();
    let count = 0,
      commands = 0;
    const cells = !precise(s)
      ? []
      : s.input.cells.map((cell) => {
          const b = cell.bounds,
            from = s.source.filter(
              (d) =>
                !used.has(d) &&
                d.x >= b.x &&
                d.x < b.x + b.width &&
                d.y >= b.y &&
                d.y < b.y + b.height,
            ),
            to: Dot[] = [];
          for (const d of from) used.add(d);
          for (const g of cell.glyphs)
            glyph(g, g.character, (d) => {
              if (++count > 4096) throw new TypeError('table-dot-limit');
              to.push(Object.freeze(d));
            });
          commands += Math.max(from.length, to.length);
          if (commands > 4096) throw new TypeError('table-dot-limit');
          return Object.freeze({
            from: Object.freeze(from),
            to: Object.freeze(to),
            row: cell.rowIndex,
            tone: cell.tone,
          });
        });
    const rest = s.source.filter((d) => !used.has(d));
    if (cells.length && commands + rest.length > 4096)
      throw new TypeError('table-dot-limit');
    return Object.freeze({
      cells: Object.freeze(cells),
      rest: Object.freeze(rest),
    });
  },
  draw(
    s: AnimationSurface<'table'>,
    o: RowsOptions,
    prepared: Readonly<{ cells: readonly CellPlan[]; rest: readonly Dot[] }>,
    _linear: number,
    p: number,
    _duration: number,
    _delta: number,
    dot: (d: Dot) => void,
    reveal: (f: RevealFrame) => void,
    target: (id: string, f: RevealFrame) => void,
  ): undefined {
    const plans = prepared.cells;
    if (!plans.length) {
      const q = 1 - (1 - clamp(p)) ** 3;
      for (const d of s.source) dot({ ...d, opacity: d.opacity * (1 - q) });
      reveal({ opacity: q });
      return;
    }
    for (const d of prepared.rest)
      dot({ ...d, opacity: d.opacity * (1 - clamp(p)) ** 3 });
    const ms = p * (7 * o.staggerMs + 370);
    reveal({ opacity: 1 });
    for (const id of s.revealTargetIds) {
      const cell = s.input.cells.find((c) => c.rowId === id);
      if (!cell) continue;
      const q = clamp(
          (ms - Math.min(cell?.rowIndex ?? 0, 7) * o.staggerMs) / 360,
        ),
        show = 1 - (1 - clamp((q - 0.35) / 0.45)) ** 3;
      target(id, { opacity: show, translateY: (1 - show) * o.settlePx });
    }
    for (const plan of plans) {
      const q = clamp((ms - Math.min(plan.row, 7) * o.staggerMs) / 360),
        morph = smooth(q / 0.65),
        alpha = (1 - clamp((q - 0.45) / 0.55)) ** 3;
      for (let k = 0; k < Math.max(plan.from.length, plan.to.length); k++) {
        const a = plan.from[k % Math.max(1, plan.from.length)] ?? plan.to[k],
          b = plan.to[k % Math.max(1, plan.to.length)] ?? a;
        if (!a || !b) continue;
        dot({
          x: mix(a.x, b.x, morph),
          y: mix(a.y, b.y, morph),
          size: mix(a.size, b.size, morph),
          opacity: mix(a.opacity, b.opacity, morph) * alpha,
          tone: morph > 0.3 ? plan.tone : a.tone,
        });
      }
    }
  },
});
export const rowsFactory = /* @__PURE__ */ tableFactory<'handoff', RowsOptions>(
  rowsDefinition,
  { staggerMs: [35, 0, 50], settlePx: [4, 0, 8] },
);
export const defaultRows = /* @__PURE__ */ tableBinding(rowsDefinition, {
  staggerMs: 35,
  settlePx: 4,
});
