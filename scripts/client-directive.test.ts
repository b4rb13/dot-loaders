import { expect, test } from 'bun:test';
import { hasClientDirective } from './client-directive.js';

test('client directives permit leading comments and either quote style', () => {
  expect(
    hasClientDirective("// formatting policy\n'use client';\nexport {};"),
  ).toBe(true);
  expect(hasClientDirective('/* comment */\n"use client"\nexport {};')).toBe(
    true,
  );
});
test('another string directive can precede the client boundary', () => {
  expect(hasClientDirective("'use strict'; 'use client'; export {};")).toBe(
    true,
  );
});
test('comment text is not a client directive', () => {
  expect(hasClientDirective("// 'use client';\nexport {};")).toBe(false);
  expect(hasClientDirective('/* "use client" */\nexport {};')).toBe(false);
});
test('a client-looking string after a statement or import is not a directive', () => {
  expect(hasClientDirective("import './other.js'; 'use client';")).toBe(false);
  expect(hasClientDirective("const value = 1; 'use client';")).toBe(false);
  expect(hasClientDirective("; 'use client';")).toBe(false);
});
test('expressions and escaped strings do not substitute for the literal directive', () => {
  expect(hasClientDirective("('use client');")).toBe(false);
  expect(hasClientDirective("'use client' + ''; export {};")).toBe(false);
  expect(hasClientDirective(String.raw`'use\x20client'; export {};`)).toBe(
    false,
  );
});
