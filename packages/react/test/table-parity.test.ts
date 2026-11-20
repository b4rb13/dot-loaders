import { expect, test } from 'bun:test';
import { TableLoader } from '@dotquilt/react/table';
import { renderStatic } from 'dotquilt/server';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

// The React adapter's server-rendered TableLoader must reserve exactly the
// geometry of the native static markup, normalize options the same way, and
// never call the provider during SSR.
const columns = Object.freeze(
  Array.from({ length: 21 }, (_, i) =>
    Object.freeze({
      kind: (['text', 'number', 'badge', 'date'] as const)[i % 4] as
        | 'text'
        | 'number'
        | 'badge'
        | 'date',
      width: i + 1,
    }),
  ),
);
const cases = [
  {},
  { rows: 100, rowHeight: 16, columns: columns.slice(0, 1) },
  { rows: 100, rowHeight: 16, columns },
  { rows: 0, rowHeight: Number.POSITIVE_INFINITY, columns: [] },
  {
    rows: 1,
    rowHeight: 1,
    columns: [
      { kind: 'text' as const, width: Number.MIN_VALUE },
      { kind: 'badge' as const, width: Number.MAX_VALUE },
    ],
  },
  { rows: 100, rowHeight: Number.MAX_SAFE_INTEGER / 100, columns },
];

function geometry(html: string) {
  const svg = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/.exec(html);
  if (!svg) throw new Error('No static table outline');
  const attributes = (source: string) =>
    Object.fromEntries(
      [...source.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    );
  const outer = attributes(svg[1] ?? '');
  return {
    height: outer.height,
    viewBox: outer.viewBox,
    paths: [...(svg[2] ?? '').matchAll(/<path\b([^>]*)>/g)].map((m) =>
      attributes(m[1] ?? ''),
    ),
  };
}

for (const [index, props] of cases.entries())
  test(`React SSR table outline matches the native static outline (case ${index})`, () => {
    const before = JSON.stringify(props);
    let calls = 0;
    const native = geometry(renderStatic({ kind: 'table-loader', ...props }));
    const adapter = geometry(
      renderToString(
        h(TableLoader, {
          ...props,
          targetProvider: () => {
            calls++;
            throw new Error('SSR must not call the provider');
          },
        }),
      ),
    );
    expect(adapter).toEqual(native);
    expect(calls).toBe(0);
    expect(JSON.stringify(props)).toBe(before);
    expect(native.paths.length).toBeLessThanOrEqual(20);
  });
