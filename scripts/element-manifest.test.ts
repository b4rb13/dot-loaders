import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Package } from 'custom-elements-manifest/schema';
import { elements } from '../packages/core/meta/elements.js';

// What editors and tools read: package.json points at both files, and every
// class, entry and register function they name exists in the build. Whether
// the descriptions match the running elements is tests/e2e/manifest.spec.ts.

const core = resolve(import.meta.dir, '../packages/core');
const manifest = JSON.parse(
  readFileSync(resolve(core, 'package.json'), 'utf8'),
) as {
  version: string;
  customElements: string;
  'web-types': string;
  exports: Record<string, { import?: string }>;
};
const read = (path: string) =>
  JSON.parse(readFileSync(resolve(core, path), 'utf8'));

test('package.json points editors at both files', () => {
  expect(existsSync(resolve(core, manifest.customElements))).toBe(true);
  expect(existsSync(resolve(core, manifest['web-types']))).toBe(true);
});

test('every declaration names a built module and an exported class', async () => {
  const cem = read(manifest.customElements) as Package;
  const root = await import(resolve(core, 'dist/index.js'));
  const declared = cem.modules.flatMap((module) => {
    expect(existsSync(resolve(core, module.path)), module.path).toBe(true);
    return (module.declarations ?? []).map((d) => d.name);
  });
  expect(declared.sort()).toEqual(elements.map((e) => e.className).sort());
  for (const name of declared) expect(typeof root[name], name).toBe('function');
});

test('every element names an entry that exports its register function', async () => {
  for (const element of elements) {
    const subpath = `.${element.entry.slice('dotquilt'.length)}`;
    const file = manifest.exports[subpath]?.import;
    expect(file, element.entry).toBeDefined();
    const entry = await import(resolve(core, file as string));
    expect(typeof entry[element.register], element.register).toBe('function');
  }
});

test('web-types lists every element at the package version', () => {
  const types = read(manifest['web-types']) as {
    version: string;
    contributions: { html: { elements: { name: string }[] } };
  };
  expect(types.version).toBe(manifest.version);
  expect(types.contributions.html.elements.map((e) => e.name)).toEqual(
    elements.map((e) => e.tag),
  );
});
