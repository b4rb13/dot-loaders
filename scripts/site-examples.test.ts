import { expect, test } from 'bun:test';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// The docs' native examples: an error swaps in at once with
// `timing: { duration: 0 }`, and update() keeps that timing, so each example
// must reset it when the next load starts, or every later load would skip
// its handoff too.
const dir = resolve(import.meta.dir, '../examples/site/native');

test('native examples that swap an error in at once reset the timing for the next load', async () => {
  const checked: string[] = [];
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.ts')) continue;
    const code = await readFile(resolve(dir, file), 'utf8');
    if (!code.includes('timing: { duration: 0 }')) continue;
    checked.push(file);
    expect(code, file).toContain('timing: undefined');
  }
  expect(checked.length).toBeGreaterThan(3);
});
