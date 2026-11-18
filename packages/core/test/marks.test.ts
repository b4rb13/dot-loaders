import { expect, test } from 'bun:test';
import { renderStatic } from '../src/server';
import { LoaderConfigurationError } from '../src/types';

test('static markup carries dash and square marks, omits the default dot and rejects others', () => {
  expect(renderStatic({ kind: 'skeleton-block', mark: 'dash' })).toStartWith(
    '<dotquilt-skeleton-block mark="dash"',
  );
  expect(renderStatic({ kind: 'table-loader', mark: 'square' })).toStartWith(
    '<dotquilt-table-loader mark="square"',
  );
  expect(renderStatic({ kind: 'skeleton-line', mark: 'dot' })).not.toContain(
    'mark=',
  );
  expect(
    renderStatic({
      kind: 'region',
      state: 'pending',
      placeholder: { kind: 'skeleton-text', mark: 'dash' },
    }),
  ).toContain('<dotquilt-skeleton-text mark="dash"');
  expect(() =>
    renderStatic({ kind: 'chart-loader', mark: 'star' as never }),
  ).toThrow(LoaderConfigurationError);
});

test('static mark rules ship only with markup that draws squares or dashes', () => {
  for (const kind of [
    'skeleton-block',
    'skeleton-line',
    'skeleton-circle',
    'skeleton-text',
    'typing-dots',
    'text-loader',
    'chart-loader',
  ] as const) {
    const description = kind === 'text-loader' ? { kind, text: 0 } : { kind };
    expect(renderStatic(description)).not.toContain('[mark=');
    for (const mark of ['dash', 'square'] as const)
      expect(renderStatic({ ...description, mark })).toContain(
        `[mark=${mark}]`,
      );
  }
});
