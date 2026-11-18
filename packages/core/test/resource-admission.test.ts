import { expect, test } from 'bun:test';
import { available, lease } from '../src/internal/ledger.js';

test('optional renderer preflight does not reserve resources or suppress actual rejection', () => {
  const doc = {} as Document;
  const key = Symbol.for('dotquilt.v1.dot-ledger');
  expect(available(doc, 'bytes', 163840)).toBe(true);
  expect(Reflect.get(doc, key)).toBeUndefined();
  const errors: string[] = [];
  const owners = Array.from({ length: 8 }, () =>
    lease(doc, (code) => errors.push(code)),
  );
  for (const owner of owners) expect(owner.set('bytes', 262144)).toBe(true);
  expect(available(doc, 'bytes', 163840)).toBe(false);
  expect(errors).toEqual([]);
  const attempted = lease(doc, (code) => errors.push(code));
  expect(attempted.set('bytes', 163840)).toBe(false);
  expect(errors).toEqual(['bytes-limit']);
  attempted.close();
  for (const owner of owners) owner.close();
  expect(Reflect.get(doc, key)).toBeUndefined();
  expect(available(doc, 'bytes', 163840)).toBe(true);
});

test('preflight preserves finite integer, surface and document ceilings', () => {
  const doc = {} as Document;
  for (const count of [-1, 0.5, NaN, Infinity, 262145])
    expect(available(doc, 'bytes', count)).toBe(false);
  expect(available(doc, 'pixels', 1048576)).toBe(true);
  expect(available(doc, 'pixels', 1048577)).toBe(false);
  expect(available(doc, 'dots', 4096)).toBe(true);
  expect(available(doc, 'dots', 4097)).toBe(false);
});

test('renderer resize preflight credits its existing reservation without changing admission', () => {
  const doc = {} as Document;
  const key = Symbol.for('dotquilt.v1.dot-ledger');
  const errors: string[] = [];
  const owners = Array.from({ length: 4 }, () =>
    lease(doc, (code) => errors.push(code)),
  );
  for (const owner of owners) expect(owner.set('pixels', 1048576)).toBe(true);
  expect(available(doc, 'pixels', 1048576)).toBe(false);
  expect(available(doc, 'pixels', 1048576, 1048576)).toBe(true);
  expect(available(doc, 'pixels', 524288, 1048576)).toBe(true);
  expect(available(doc, 'pixels', 1048577, 1048576)).toBe(false);
  for (const credit of [-1, 0.5, NaN, Infinity, 4194305])
    expect(available(doc, 'pixels', 1, credit)).toBe(false);
  expect(Reflect.get(doc, key).pixels).toBe(4194304);
  expect(errors).toEqual([]);
  expect(owners[0]?.set('pixels', 1048576)).toBe(true);
  const other = lease(doc, (code) => errors.push(code));
  expect(other.set('pixels', 1)).toBe(false);
  expect(errors).toEqual(['pixels-limit']);
  other.close();
  for (const owner of owners) owner.close();
  expect(Reflect.get(doc, key)).toBeUndefined();
});
