import { parseChangelog } from '../../../../scripts/changelog';
import { releaseOrder } from '../../../../scripts/packages';

/**
 * The changelog (/docs/changelog/), as Markdown generated from the five
 * packages' CHANGELOG.md files, which Changesets writes and
 * `bun run release:version` dates (scripts/changelog.ts). The packages share
 * one version number, so the page lists each release once, newest first,
 * with its date, and under it each change once: a change that touched two
 * packages is in both changelogs, and here under a heading naming both.
 * content.config.ts adds the page to the docs collection, as it does the
 * API reference.
 */

/** `2026-11-26` → `26 November 2026`. */
const longDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const code = (text: string) => `\`${text}\``;
const and = (items: readonly string[]) =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/** A change as a list item: its later lines indented under the bullet. */
const item = (change: string) =>
  `- ${change
    .split('\n')
    .map((line, index) => (index === 0 || line === '' ? line : `  ${line}`))
    .join('\n')}`;

interface Package {
  name: string;
  changelog: string;
}

/**
 * @param read Reads a file from the repository, by its path from the root
 *   (`packages/core/CHANGELOG.md`).
 */
export function changelogPage(read: (path: string) => string) {
  const packages: Package[] = releaseOrder.map((dir) => ({
    name: (JSON.parse(read(`${dir}/package.json`)) as { name: string }).name,
    changelog: read(`${dir}/CHANGELOG.md`),
  }));
  const parsed = packages.map((pkg) => ({
    name: pkg.name,
    releases: parseChangelog(pkg.changelog),
  }));
  const [core] = parsed;
  if (!core) throw new Error('No packages to read changelogs from.');

  const releases = core.releases.map((release) => {
    // Each change once, with every package whose changelog has it.
    const changes = new Map<string, string[]>();
    const released: string[] = [];
    for (const { name, releases: own } of parsed) {
      const same = own.find((other) => other.version === release.version);
      if (!same) continue;
      released.push(name);
      for (const change of same.changes)
        changes.set(change, [...(changes.get(change) ?? []), name]);
    }
    // Grouped by those packages, in the order they are released.
    const groups = new Map<string, string[]>();
    for (const [change, names] of changes) {
      const label = and(names.map(code));
      groups.set(label, [...(groups.get(label) ?? []), change]);
    }
    const quiet = released.filter(
      (name) => ![...changes.values()].some((names) => names.includes(name)),
    );
    return [
      `## ${release.version}`,
      '',
      ...(release.date ? [`Released ${longDate(release.date)}.`, ''] : []),
      ...[...groups].flatMap(([label, list]) => [
        `### ${label}`,
        '',
        ...list.map(item),
        '',
      ]),
      ...(quiet.length
        ? [
            `${and(quiet.map(code))} ${quiet.length > 1 ? 'have' : 'has'} no changes of ${quiet.length > 1 ? 'their' : 'its'} own in this release, and ${quiet.length > 1 ? 'move' : 'moves'} to the same version.`,
            '',
          ]
        : []),
    ];
  });

  const body = [
    'Every Dotquilt release, newest first. The five packages share one version number: install the same version of `dotquilt` and of your framework package. [Versions and breaking changes](/docs/stability/#versions-and-breaking-changes) explains what each kind of release may contain.',
    '',
    'This page is generated from the packages’ changelogs. Releases are also on [GitHub](https://github.com/b4rb13/dot-loaders/releases) and [npm](https://www.npmjs.com/package/dotquilt?activeTab=versions).',
    '',
    ...releases.flat(),
  ]
    .join('\n')
    .trim();

  return {
    id: 'docs/changelog',
    data: {
      title: 'Changelog',
      description:
        'Every Dotquilt release, newest first, with its date: what changed in dotquilt and in the React, Vue, Svelte and Angular packages.',
      head: [
        {
          tag: 'title',
          content:
            'Dotquilt changelog: every release and what changed | Dotquilt',
        },
      ],
      // The releases, not the packages under each.
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
    },
    body: `${body}\n`,
  };
}
