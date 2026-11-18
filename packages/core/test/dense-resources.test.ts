import { expect, test } from 'bun:test';
import { lease } from '../src/internal/dense/resources';

test('document resource admission accounts compatible leases and transient capacity before growth', () => {
  const doc = {} as Document;
  const issues: string[] = [];
  const a = lease(doc, (c) => issues.push(c)),
    b = lease(doc, (c) => issues.push(c));
  expect(a.set('dots', 4096)).toBe(true);
  expect(a.set('dots', 4097)).toBe(false);
  expect(a.set('bytes', 262144)).toBe(true);
  expect(a.set('bytes', 262145)).toBe(false);
  expect(a.set('pixels', 1048576)).toBe(true);
  expect(b.set('pixels', 1048576)).toBe(true);
  a.close();
  a.close();
  expect(a.set('dots', 1)).toBe(false);
  b.close();
  expect(Reflect.has(doc, Symbol.for('dotquilt.v1.dot-ledger'))).toBe(false);
  expect(issues).toEqual(['dots-limit', 'bytes-limit']);
});
