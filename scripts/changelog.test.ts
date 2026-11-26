import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseChangelog, stampReleaseDates } from './changelog';
import { releaseOrder } from './packages';

const root = resolve(import.meta.dir, '..');

describe('every package changelog', () => {
  for (const dir of releaseOrder) {
    test(`${dir}: each version has its release date, newest first`, () => {
      const releases = parseChangelog(
        readFileSync(join(root, dir, 'CHANGELOG.md'), 'utf8'),
      );
      const { version } = JSON.parse(
        readFileSync(join(root, dir, 'package.json'), 'utf8'),
      ) as { version: string };
      expect(releases[0]?.version).toBe(version);
      for (const release of releases)
        expect(
          release.date,
          `${dir} ${release.version} has no "Released:" line: run bun run release:version`,
        ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const dates = releases.map((release) => release.date ?? '');
      expect(dates).toEqual([...dates].sort().reverse());
    });
  }
});

const sample = `# dotquilt

## 0.3.0

### Minor Changes

- 1a2b3c4: A new option.

  It has a second paragraph.

### Patch Changes

- Updated dependencies [5d6e7f8]
  - dotquilt@0.3.0

## 0.2.0

Released: 2026-11-21

### Patch Changes

- A fix, written without a commit.
`;

test('stamping dates only the versions that have no date', () => {
  const stamped = stampReleaseDates(sample, '2026-12-01');
  expect(stamped).toContain(
    '## 0.3.0\n\nReleased: 2026-12-01\n\n### Minor Changes',
  );
  expect(stamped.match(/Released:/g)).toHaveLength(2);
  expect(stampReleaseDates(stamped, '2027-01-01')).toBe(stamped);
});

test('a parsed changelog keeps the changes and drops hashes and dependency updates', () => {
  expect(parseChangelog(stampReleaseDates(sample, '2026-12-01'))).toEqual([
    {
      version: '0.3.0',
      date: '2026-12-01',
      changes: ['A new option.\n\nIt has a second paragraph.'],
    },
    {
      version: '0.2.0',
      date: '2026-11-21',
      changes: ['A fix, written without a commit.'],
    },
  ]);
});
