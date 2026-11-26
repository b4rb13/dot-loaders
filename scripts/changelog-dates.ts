// Stamps today's date (UTC) on each changelog version that has none. Run by
// `bun run release:version`, after `changeset version` (see changelog.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { stampReleaseDates, today } from './changelog';
import { releaseOrder } from './packages';

const root = resolve(import.meta.dir, '..');
const date = today();
for (const dir of releaseOrder) {
  const file = join(root, dir, 'CHANGELOG.md');
  const text = readFileSync(file, 'utf8');
  const stamped = stampReleaseDates(text, date);
  if (stamped === text) continue;
  writeFileSync(file, stamped);
  console.log(`${dir}/CHANGELOG.md: dated the new versions ${date}`);
}
