import { expect, test } from 'bun:test';
import { m4SizeRegressions } from '../../scripts/m4-regressions.js';

test('size regression thresholds are conjunctive and inclusive', () => {
  const previous = { consumer: { gzip: 5120, external: 6000 } };
  expect(
    m4SizeRegressions({ consumer: { gzip: 5375, external: 6256 } }, previous),
  ).toEqual([]);
  expect(
    m4SizeRegressions(
      { consumer: { gzip: 5376, external: 6300 } },
      previous,
    ).map((row) => row.metric),
  ).toEqual(['gzip', 'external']);
});

test('both CSS deliveries, missing consumers and invalid numbers fail closed', () => {
  const reference = {
    consumer: { gzip: 1000, external: 1200, sharedExternal: 1100 },
  };
  expect(
    m4SizeRegressions(
      { consumer: { gzip: 1000, external: 1200, sharedExternal: 1356 } },
      reference,
    ).map((row) => row.metric),
  ).toEqual(['sharedExternal']);
  expect(() => m4SizeRegressions({}, reference)).toThrow('Missing regression');
  expect(() =>
    m4SizeRegressions({ consumer: { gzip: 1000, external: 1200 } }, reference),
  ).toThrow('Invalid regression');
  expect(() =>
    m4SizeRegressions(
      { consumer: { gzip: Number.NaN, external: 1200 } },
      reference,
    ),
  ).toThrow('Invalid regression');
  expect(() =>
    m4SizeRegressions({ other: { gzip: 1, external: 1 } }, {}),
  ).toThrow('explicit baseline review');
});
