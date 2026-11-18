import { expect, test } from 'bun:test';
import {
  catalogCounts,
  dashboardFamilies,
  dashboardGroups,
} from '../m2/catalog-model';

test('canonical dashboard fixes the approved 24-surface mix and six rich loading regions', () => {
  expect(dashboardFamilies).toHaveLength(24);
  expect(dashboardGroups).toHaveLength(6);
  expect(catalogCounts(dashboardFamilies)).toEqual({
    block: 4,
    line: 4,
    circle: 2,
    multiline: 2,
    text: 4,
    'chart-line': 1,
    'chart-bar': 1,
    'chart-scatter': 1,
    table: 3,
    typing: 2,
    region: 0,
  });
  for (const group of dashboardGroups)
    expect(
      group.filter((kind) => kind.startsWith('chart-') || kind === 'table'),
    ).toHaveLength(1);
});
