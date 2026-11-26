/**
 * The packages' changelogs (packages/<name>/CHANGELOG.md): what Changesets
 * writes, plus the day each version was released, on its own line under
 * the version's heading:
 *
 *   ## 0.2.1
 *
 *   Released: 2026-11-26
 *
 *   ### Patch Changes
 *
 * Changesets writes no dates, so a release PR runs `bun run release:version`:
 * `changeset version`, then scripts/changelog-dates.ts, which stamps today's
 * date (UTC) on each version that has none. changelog.test.ts checks that
 * every version has one, and the site's changelog page
 * (apps/site/src/lib/changelog.ts) reads them with `parseChangelog`.
 */

const versionHeading = /^## (\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/;
const releasedLine = /^Released: (\d{4}-\d{2}-\d{2})$/;

/** Today in UTC, as `YYYY-MM-DD`. */
export const today = () => new Date().toISOString().slice(0, 10);

/** Adds `Released: <date>` under every version heading that has no date. */
export function stampReleaseDates(text: string, date: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  lines.forEach((line, index) => {
    out.push(line);
    if (!versionHeading.test(line)) return;
    const next = lines.slice(index + 1).find((later) => later.trim() !== '');
    if (next === undefined || !releasedLine.test(next))
      out.push('', `Released: ${date}`);
  });
  return out.join('\n');
}

export interface Release {
  version: string;
  /** `YYYY-MM-DD`, or undefined for a version that has no date yet. */
  date: string | undefined;
  /**
   * Each change as Markdown, without the commit hash Changesets puts in
   * front, and without the "Updated dependencies" entries, which only say
   * that a package moved to the new `dotquilt`.
   */
  changes: string[];
}

/** The versions in a changelog, newest first, as Changesets orders them. */
export function parseChangelog(text: string): Release[] {
  const releases: Release[] = [];
  let release: Release | undefined;
  let change: string[] | undefined;
  const finish = () => {
    if (!release || !change) return;
    const markdown = change.join('\n').trim();
    if (!markdown.startsWith('Updated dependencies'))
      release.changes.push(markdown);
    change = undefined;
  };
  for (const line of text.split('\n')) {
    const heading = line.match(versionHeading);
    if (heading) {
      finish();
      release = { version: heading[1] as string, date: undefined, changes: [] };
      releases.push(release);
      continue;
    }
    if (!release) continue;
    const released = line.match(releasedLine);
    if (released && !change) {
      release.date = released[1];
      continue;
    }
    if (line.startsWith('- ')) {
      finish();
      change = [line.slice(2).replace(/^[0-9a-f]{7,40}: /, '')];
    } else if (line.startsWith('#')) {
      finish();
    } else if (change) {
      // A change's later lines are indented by two spaces.
      change.push(line.replace(/^ {2}/, ''));
    }
  }
  finish();
  return releases;
}
