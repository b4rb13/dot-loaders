import { describe, expect, test } from 'bun:test';
import { m4BudgetFailures } from '../../scripts/m4-budgets.js';

type Sizes = Parameters<typeof m4BudgetFailures>[0];
function passing(): Sizes {
  const sizes: Sizes = {};
  for (const [family, limit] of Object.entries({
    block: 6144,
    line: 6144,
    circle: 6144,
    multiline: 8192,
    typing: 4096,
    text: 10240,
    chart: 12288,
    table: 12288,
    skeletonFamily: 10240,
  }))
    for (const entry of ['root', 'family']) {
      sizes[`${family}-${entry}-native`] = {
        gzip: 1000,
        external: 1200,
        limit,
        pass: true,
        ...(family === 'skeletonFamily'
          ? { sharedExternal: 1100, sharedPass: true }
          : {}),
      };
      sizes[`${family}-${entry}-react`] = {
        gzip: 1100,
        external: 1300,
        increment: 100,
        externalIncrement: 100,
        incrementLimit: 2048,
        incrementPass: true,
        ...(family === 'skeletonFamily'
          ? { sharedExternal: 1200, sharedExternalIncrement: 100 }
          : {}),
      };
    }
  return sizes;
}
function row(sizes: Sizes, key: string) {
  const value = sizes[key];
  if (!value) throw new Error(key);
  return value;
}
describe('M4 release budget integrity', () => {
  test('amended absolute ceiling is inclusive and independent of the growth gate', () => {
    const sizes = passing();
    Object.assign(row(sizes, 'block-root-native'), { external: 6144 });
    Object.assign(row(sizes, 'block-root-react'), { external: 6244 });
    expect(m4BudgetFailures(sizes)).toEqual([]);
    Object.assign(row(sizes, 'block-root-native'), {
      external: 6145,
      pass: false,
    });
    Object.assign(row(sizes, 'block-root-react'), { external: 6245 });
    expect(m4BudgetFailures(sizes)).toEqual(['block-root-native']);
  });
  test('requires all selective and root closures', () => {
    expect(m4BudgetFailures(passing())).toEqual([]);
    const sizes = passing();
    delete sizes['circle-root-native'];
    expect(() => m4BudgetFailures(sizes)).toThrow('Missing or invalid');
    expect(() => m4BudgetFailures({})).toThrow('Missing or invalid');
  });
  test('cannot pass by raising a reported ceiling or editing a pass flag', () => {
    const sizes = passing();
    row(sizes, 'line-root-native').limit = 8192;
    expect(() => m4BudgetFailures(sizes)).toThrow('Changed ceiling');
    row(sizes, 'line-root-native').limit = 6144;
    row(sizes, 'line-root-native').external = 6145;
    expect(() => m4BudgetFailures(sizes)).toThrow('inconsistent status');
  });
  test('reported failure remains a failure even if the shared resource passes', () => {
    const sizes = passing();
    Object.assign(row(sizes, 'skeletonFamily-root-native'), {
      external: 10241,
      pass: false,
    });
    Object.assign(row(sizes, 'skeletonFamily-root-react'), {
      external: 10341,
      externalIncrement: 100,
    });
    expect(m4BudgetFailures(sizes)).toEqual(['skeletonFamily-root-native']);
  });
  test('shared delivery is mandatory evidence and has the same hard limit', () => {
    const sizes = passing();
    delete row(sizes, 'skeletonFamily-root-native').sharedExternal;
    expect(() => m4BudgetFailures(sizes)).toThrow('Missing real shared');
    Object.assign(row(sizes, 'skeletonFamily-root-native'), {
      sharedExternal: 10241,
      sharedPass: false,
    });
    Object.assign(row(sizes, 'skeletonFamily-root-react'), {
      sharedExternal: 10341,
      sharedExternalIncrement: 100,
    });
    expect(m4BudgetFailures(sizes)).toEqual(['skeletonFamily-root-native']);
  });
  test('recomputes signed matched React increments across every delivery', () => {
    const sizes = passing();
    row(sizes, 'typing-family-react').increment = 0;
    expect(() => m4BudgetFailures(sizes)).toThrow('Invalid matched React');
    Object.assign(row(sizes, 'typing-family-react'), {
      gzip: 900,
      increment: -100,
    });
    expect(m4BudgetFailures(sizes)).toEqual([]);
  });
  test('rejects missing, negative, nonfinite and extra measurements', () => {
    for (const gzip of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const sizes = passing();
      row(sizes, 'block-root-native').gzip = gzip;
      expect(() => m4BudgetFailures(sizes)).toThrow('invalid M4 size row');
    }
    const sizes = passing();
    sizes.surprise = { gzip: 1, external: 1 };
    expect(() => m4BudgetFailures(sizes)).toThrow('Unexpected M4 budget row');
  });
});
