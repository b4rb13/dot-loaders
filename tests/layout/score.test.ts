import { expect, test } from 'bun:test';
import { layoutScore } from './score';

const shift = (startTime: number, value: number, hadRecentInput = false) => ({
  startTime,
  value,
  hadRecentInput,
});

test('CLS uses gap/session windows and keeps recent-input shifts out of its score', () => {
  expect(
    layoutScore([
      shift(100, 0.01),
      shift(600, 0.02),
      shift(1600, 0.04),
      shift(1700, 10, true),
    ]),
  ).toBe(0.04);
  expect(
    layoutScore([
      shift(900, 0.01),
      shift(1800, 0.01),
      shift(2700, 0.01),
      shift(3600, 0.01),
      shift(4500, 0.01),
      shift(5400, 0.01),
      shift(6000, 0.02),
    ]),
  ).toBeCloseTo(0.06);
});
