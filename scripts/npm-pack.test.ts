import { expect, test } from 'bun:test';
import { packResults } from './npm-pack';

const result = { name: 'dotquilt', filename: 'dotquilt-0.2.1.tgz', files: [] };

test('npm 11 prints pack results as an array', () => {
  expect(packResults(JSON.stringify([result]))).toEqual([result]);
});

test('npm 12 prints them as an object keyed by package name', () => {
  expect(packResults(JSON.stringify({ dotquilt: result }))).toEqual([result]);
});

test('anything else is an error, not an empty list', () => {
  expect(() => packResults('"dotquilt-0.2.1.tgz"')).toThrow('no results');
});
