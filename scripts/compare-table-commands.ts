import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type {
  AnimationSurface,
  Dot,
  RevealFrame,
} from '@dotquilt-internal/core/animations';
import type { TableInput } from '@dotquilt-internal/core/table';

const root = resolve(import.meta.dir, '..');
const prior = await Bun.file(
  resolve(root, 'docs/implementation/m4/table-evidence.json'),
).json();
const current = await Bun.file(
  resolve(root, '.artifacts/m4/packed-report.json'),
).json();
const hash = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
const load = async (base: string, file: string, reference: boolean) => {
  const path = `packages/core/dist/${file}.js`;
  if (
    reference &&
    hash(await readFile(resolve(base, path))) !== prior.sourceArchive[path]
  )
    throw new Error(`Reference changed: ${path}`);
  return import(resolve(base, path));
};
const engines = [];
for (const reference of [true, false]) {
  const base = reference ? resolve(root, prior.archive) : root;
  engines.push({
    model: await load(base, 'internal/table-model', reference),
    recipes: await load(base, 'table-animations', reference),
    binding: await load(base, 'internal/binding', reference),
    appearance: await load(base, 'internal/table-field', reference),
    server: await load(base, 'server', reference),
  });
}
const rows: {
  phase: string;
  key: string;
  sha256: string;
  commands?: number;
}[] = [];
const equal = (
  phase: string,
  key: string,
  values: unknown[],
  commands?: number,
) => {
  const [before, after] = values.map((value) => JSON.stringify(value));
  if (before !== after || before === undefined)
    throw new Error(`Changed ${phase}: ${key}`);
  rows.push({
    phase,
    key,
    sha256: hash(before),
    ...(commands === undefined ? {} : { commands }),
  });
};
const columns = [
  { kind: 'text', width: 2 },
  { kind: 'number', width: 1 },
  { kind: 'badge', width: 1 },
  { kind: 'date', width: 1 },
];
const styles = [
  'auto',
  'text',
  'number',
  'badge',
  'date',
  'badge-text',
  'text-badge',
];
for (const widths of [
  [1, 1, 1],
  [0.1, 0.2, 0.3],
  [1e308, 1e308],
]) {
  const values = engines.map((e) => {
    const c = e.model.tableColumns(
      widths.map((width) => ({ kind: 'text', width })),
    );
    return [
      e.model.tableCells(400, 5, 32, c),
      e.model.tableStaticParts(5, 32, c),
    ];
  });
  equal('geometry', String(widths), values);
}
for (const idle of ['typeOn', 'tableShimmer'])
  for (const cellStyle of styles)
    for (const cadenceMs of [250, 600, 1200])
      for (const time of [0, 750, 1500])
        for (const still of [false, true]) {
          const values = engines.map((e) => {
            const surface = Object.freeze({
              family: 'table',
              width: 400,
              height: 160,
              input: e.model.tableCells(
                400,
                5,
                32,
                e.model.tableColumns(columns),
              ),
              source: [],
              revealTargetIds: [],
            });
            const binding = e.recipes[idle]({ cellStyle, cadenceMs });
            const dots: Dot[] = [];
            e.binding
              .definitionOf(binding)
              .draw(surface, binding.options, time, still, (dot: Dot) =>
                dots.push(dot),
              );
            return dots;
          });
          equal(
            'idle',
            `${idle}/${cellStyle}/${cadenceMs}/${time}/${still}`,
            values,
            values[0]?.length,
          );
        }
for (const precise of [false, true])
  for (const staggerMs of [0, 35, 50])
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const values = engines.map((e) => {
        const input = e.model.tableCells(
          400,
          5,
          32,
          e.model.tableColumns(columns),
        ) as TableInput;
        const semantic: TableInput = {
          kind: 'table',
          cells: input.cells.map((cell, i) => ({
            ...cell,
            text: 'A',
            glyphs: [
              {
                character: 'A',
                bounds: {
                  x: cell.bounds.x + 8,
                  y: cell.bounds.y + 6,
                  width: 12,
                  height: 18,
                },
              },
            ],
            tone: i % 2 ? 'base' : 'accent',
          })),
        };
        const source: Dot[] = [];
        const binding = e.recipes.typeOn();
        e.binding.definitionOf(binding).draw(
          {
            family: 'table',
            width: 400,
            height: 160,
            input,
            source: [],
            revealTargetIds: [],
          },
          binding.options,
          400,
          false,
          (dot: Dot) => source.push(dot),
        );
        source.push({ x: 399, y: 159, size: 1, opacity: 0.5, tone: 'base' });
        const surface: AnimationSurface<'table'> = {
          family: 'table',
          width: 400,
          height: 160,
          input: semantic,
          source,
          revealTargetIds: precise
            ? Array.from({ length: 5 }, (_, i) => `row-${i}`)
            : [],
        };
        const rows = e.recipes.rows({ staggerMs, settlePx: 8 }),
          definition = e.binding.definitionOf(rows);
        const dots: Dot[] = [],
          reveal: RevealFrame[] = [],
          targets: unknown[] = [];
        const duration = definition.duration(surface, rows.options);
        definition.draw(
          surface,
          rows.options,
          definition.prepare(surface),
          progress,
          progress,
          duration,
          0,
          (dot: Dot) => dots.push(dot),
          (frame: RevealFrame) => reveal.push(frame),
          (id: string, frame: RevealFrame) => targets.push({ id, ...frame }),
        );
        return { duration, dots, reveal, targets };
      });
      equal(
        'handoff',
        `${precise}/${staggerMs}/${progress}`,
        values,
        values[0]?.dots.length,
      );
    }
for (const descriptor of [
  { kind: 'table-loader' },
  { kind: 'table-loader', rows: 50, rowHeight: 12.5, columns },
  {
    kind: 'table-loader',
    rows: 100,
    columns: Array.from({ length: 20 }, () => ({ kind: 'text' })),
  },
  { kind: 'table-loader', rows: -1, rowHeight: Infinity, columns: [] },
])
  equal(
    'nativeSSR',
    JSON.stringify(descriptor),
    engines.map((e) => e.server.renderStatic(descriptor)),
  );
await writeFile(
  resolve(root, '.artifacts/m4/table-command-comparison.json'),
  `${JSON.stringify(
    {
      result: 'pass',
      artifacts: current.artifacts,
      referenceArtifacts: prior.artifacts,
      referenceArchive: prior.archive,
      rows,
      scope:
        'Exact ordered geometry, 252 idle command cells, 30 row choreography command/effect cells and four native SSR outputs. No browser, renderer, physical or owner approval claim.',
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${rows.length} exact Table geometry/command/effect/SSR comparisons`,
);
