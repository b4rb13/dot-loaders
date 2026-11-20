import { expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// The public stylesheets for the `external` style policy. Each package ships
// them as dist/<name>.css behind one `./styles/*.css` export pattern.
const stylesheets = [
  'skeleton',
  'skeleton-family',
  'line',
  'circle',
  'skeleton-text',
  'typing',
  'region',
  'text',
  'chart',
  'table',
];
const root = resolve(import.meta.dir, '..');

for (const name of ['core', 'react']) {
  const directory = resolve(root, 'packages', name);
  const manifest = require(resolve(directory, 'package.json')) as {
    name: string;
    exports: Record<string, unknown>;
  };

  test(`${name}: stylesheets are exported through one pattern`, () => {
    const patterns = Object.entries(manifest.exports).filter(([key]) =>
      key.includes('*'),
    );
    expect(patterns).toEqual([['./styles/*.css', './dist/*.css']]);
    expect(
      Object.keys(manifest.exports).filter((key) => key.endsWith('.css')),
    ).toEqual(['./styles/*.css']);
  });

  test(`${name}: every documented stylesheet path resolves to its file`, () => {
    for (const sheet of stylesheets) {
      const path = Bun.resolveSync(
        `${manifest.name}/styles/${sheet}.css`,
        root,
      );
      expect(path).toBe(resolve(directory, 'dist', `${sheet}.css`));
      expect(existsSync(path)).toBe(true);
    }
  });

  test(`${name}: the pattern reaches only the top-level stylesheets`, () => {
    const css = readdirSync(resolve(directory, 'dist'), {
      recursive: true,
    }).filter((file) => String(file).endsWith('.css'));
    expect(css.map(String).sort()).toEqual(
      stylesheets.map((sheet) => `${sheet}.css`).sort(),
    );
  });

  test(`${name}: private implementation paths stay unexported`, () => {
    for (const path of ['/internal/table-model', '/dist/index.js'])
      expect(() => Bun.resolveSync(`${manifest.name}${path}`, root)).toThrow();
  });
}
