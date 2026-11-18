import { expect, test } from 'bun:test';
import { wholeWorkSummary } from '../../scripts/bench/whole-work';

test('whole work includes unclassified overhead and requires both per-run and pooled tails', () => {
  const high = { differences: [{ additionalBusyMs: 10 }] };
  expect(
    wholeWorkSummary(
      Array.from({ length: 20 }, () => high),
      { p95: 4, p99: 8 },
    ).numericPass,
  ).toBe(false);
  const low = { differences: [{ additionalBusyMs: 1 }] };
  expect(
    wholeWorkSummary(
      Array.from({ length: 20 }, () => low),
      { p95: 4, p99: 8 },
    ).numericPass,
  ).toBe(true);
  expect(wholeWorkSummary([low], { p95: 4, p99: 8 }).numericPass).toBe(false);
});
