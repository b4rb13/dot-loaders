import { expect, test } from 'bun:test';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { releaseOrder } from './packages.js';

// The release workflow, release:check and changesets all follow
// scripts/packages.ts. A package left out of it would never be released.

const root = resolve(import.meta.dir, '..');
interface Manifest {
  name: string;
  private?: boolean;
  dependencies?: Record<string, string>;
}
const manifestOf = async (dir: string): Promise<Manifest> =>
  JSON.parse(await readFile(resolve(root, dir, 'package.json'), 'utf8'));

test('every public package under packages/ is in the release order', async () => {
  const dirs: string[] = [];
  for (const entry of await readdir(resolve(root, 'packages'), {
    withFileTypes: true,
  }))
    if (entry.isDirectory()) {
      const dir = `packages/${entry.name}`;
      if (!(await manifestOf(dir)).private) dirs.push(dir);
    }
  expect([...releaseOrder].sort() as string[]).toEqual(dirs.sort());
});

test('a package is released after the packages it depends on', async () => {
  const names = await Promise.all(
    releaseOrder.map(async (dir) => (await manifestOf(dir)).name),
  );
  for (const [index, dir] of releaseOrder.entries()) {
    const dependencies = Object.keys(
      (await manifestOf(dir)).dependencies ?? {},
    );
    for (const dependency of dependencies.filter((d) => names.includes(d)))
      expect(
        names.indexOf(dependency),
        `${dir} needs ${dependency}`,
      ).toBeLessThan(index);
  }
});

test('the packages share one version through the changesets fixed group', async () => {
  const config = JSON.parse(
    await readFile(resolve(root, '.changeset/config.json'), 'utf8'),
  ) as { fixed: string[][] };
  const names = await Promise.all(
    releaseOrder.map(async (dir) => (await manifestOf(dir)).name),
  );
  expect(config.fixed).toEqual([names]);
});

test('the release workflow follows the release order', async () => {
  const workflow = await readFile(
    resolve(root, '.github/workflows/release.yml'),
    'utf8',
  );
  expect(workflow).toContain('- packages/*/package.json');
  expect(workflow).toContain("from './scripts/packages.ts'");
  expect(workflow).not.toMatch(/for dir in packages\//);
});
