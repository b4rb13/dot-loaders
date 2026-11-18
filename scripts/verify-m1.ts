import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface Fixture {
  file: string;
  titlePrefix: string;
  projects: string[];
}
interface Group {
  title: string;
  dueGate: string;
  scope: string;
  owner: string;
  browserFixtures: Fixture[];
  checks: string[];
}
interface Assignment {
  id: string;
  disposition: string;
  m1Groups: string[];
  carryForward: string[];
  reason: string;
}
interface Suite {
  file?: string;
  suites?: Suite[];
  specs?: {
    title: string;
    tests: { projectName: string; results: { status: string }[] }[];
  }[];
}
const root = resolve(import.meta.dir, '..');
const read = async (file: string) =>
  JSON.parse(await readFile(resolve(root, file), 'utf8'));
const hash = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packed = await read('.artifacts/packed-report.json');
const browser = await read('.artifacts/browser-results.json');
const clean = await read('.artifacts/clean-reproduction.json');
const review = (await read(
  'docs/implementation/m1-requirement-review.json',
)) as {
  inventoryClausesSha256: string;
  groups: Record<string, Group>;
  laterGates: Record<
    string,
    { dueGate: string; owner: string; status: string }
  >;
  assignments: Assignment[];
};
const inventory = (await read('docs/implementation/requirements.json')) as {
  requirements: {
    id: string;
    source: string;
    section: string;
    clause: string;
  }[];
};
assert(
  review.inventoryClausesSha256 ===
    hash(
      JSON.stringify(
        inventory.requirements.map((r) => [
          r.id,
          r.source,
          r.section,
          r.clause,
        ]),
      ),
    ),
  'Source clauses changed; review assignments again',
);
assert(
  review.assignments.length === inventory.requirements.length &&
    new Set(review.assignments.map((r) => r.id)).size ===
      review.assignments.length,
  'Missing/duplicate review assignment',
);
const sourceIds = new Set(inventory.requirements.map((r) => r.id));
for (const row of review.assignments) {
  assert(
    sourceIds.has(row.id) && row.reason,
    `Invalid source assignment ${row.id}`,
  );
  assert(
    ['context', 'later', 'mixed'].includes(row.disposition),
    `Unreviewed disposition ${row.id}`,
  );
  assert(
    row.disposition === 'context' ||
      row.m1Groups.length ||
      row.carryForward.length,
    `Unassigned obligation ${row.id}`,
  );
  for (const id of row.m1Groups)
    assert(review.groups[id], `Missing M1 group ${id}`);
  for (const id of row.carryForward)
    assert(
      review.laterGates[id]?.owner &&
        review.laterGates[id]?.status === 'unverified',
      `Missing future owner/gate ${id}`,
    );
}
for (const section of ['sourceFiles', 'buildInputs'])
  for (const [file, digest] of Object.entries(packed[section]))
    assert(
      hash(await readFile(resolve(root, file))) === digest,
      `Stale evidence for ${file}`,
    );
assert(
  hash(await readFile(packed.artifact)) === packed.sha256,
  'Tarball digest mismatch',
);
assert(
  browser.config.metadata.artifactSha256 === packed.sha256 &&
    browser.stats.unexpected === 0 &&
    browser.stats.flaky === 0,
  'Browser evidence failed, flaky or stale',
);
assert(
  clean.result === 'pass' &&
    clean.matchingArtifactSource === packed.sha256 &&
    clean.reproducedTarballSha256 === packed.sha256 &&
    !clean.compiledOutputMismatches.length,
  'Fresh package reproduction missing or stale',
);
for (const [name, size] of Object.entries(packed.sizes) as [
  string,
  { gzip: number; limit: number },
][]) {
  assert(size.gzip <= size.limit, `Size failed: ${name}`);
  if (name in packed.externalModeGzip)
    assert(
      packed.externalModeGzip[name] <= size.limit,
      `External CSS size failed: ${name}`,
    );
}
assert(
  packed.budgetPolicy.skeletonClosureLimit === 4608 &&
    packed.budgetPolicy.decision.endsWith('6221590324'),
  'Unapproved budget policy',
);
const installed = resolve(
  packed.consumer,
  'node_modules/@dotquilt-internal/core',
);
for (const file of [
  'package.json',
  'packages/core/package.json',
  resolve(installed, 'package.json'),
])
  assert(
    (await read(file)).private === true,
    `Publication guard missing: ${file}`,
  );
const guard = Bun.spawn(['bun', 'run', 'prepublishOnly'], {
  cwd: installed,
  stdout: 'pipe',
  stderr: 'pipe',
});
await new Response(guard.stdout).text();
const guardError = await new Response(guard.stderr).text();
assert(
  (await guard.exited) === 1 &&
    guardError.includes('npm publishing is disabled during private validation'),
  'Installed publication lifecycle did not reject',
);
const pure = Bun.spawn(['bun', 'test', 'packages/core/test'], {
  cwd: root,
  stdout: 'pipe',
  stderr: 'pipe',
});
await new Response(pure.stdout).text();
const pureLog = await new Response(pure.stderr).text();
assert((await pure.exited) === 0, `Pure contracts failed: ${pureLog}`);
const cases: {
  file: string;
  title: string;
  project: string;
  passed: boolean;
}[] = [];
function visit(suite: Suite) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests)
      cases.push({
        file: suite.file ?? '',
        title: spec.title,
        project: test.projectName,
        passed:
          test.results.length === 1 && test.results[0]?.status === 'passed',
      });
  for (const child of suite.suites ?? []) visit(child);
}
for (const suite of browser.suites) visit(suite);
const checked = Object.fromEntries(
  Object.entries(review.groups).map(([id, group]) => {
    const evidence = group.browserFixtures.flatMap((fixture) =>
      fixture.projects.map((project) => {
        const matches = cases.filter(
          (c) =>
            c.file.endsWith(fixture.file) &&
            c.title.startsWith(fixture.titlePrefix) &&
            c.project === project,
        );
        assert(
          matches.length && matches.every((c) => c.passed),
          `Required M1 fixture missing/failed: ${id} / ${fixture.titlePrefix} / ${project}`,
        );
        return {
          fixture: `${fixture.file}: ${fixture.titlePrefix}`,
          project,
          passed: matches.length,
        };
      }),
    );
    for (const check of group.checks)
      assert(
        ['packed', 'types', 'clean', 'pure', 'private', 'provenance'].includes(
          check,
        ),
        `Unknown check ${check}`,
      );
    return [
      id,
      {
        status:
          'pass for in-project M1 checks; external historical origin not rechecked',
        scope: group.scope,
        evidence,
        checks: group.checks,
      },
    ];
  }),
);
const result = {
  date: new Date().toISOString(),
  artifactSha256: packed.sha256,
  reviewSha256: hash(
    await readFile(
      resolve(root, 'docs/implementation/m1-requirement-review.json'),
    ),
  ),
  status:
    'pass: in-project M1 regression; external historical origin not rechecked; later qualification unverified',
  sourceBlocks: review.assignments.length,
  assignedToM1Slice: review.assignments.filter((r) => r.m1Groups.length).length,
  laterOnly: review.assignments.filter((r) => r.disposition === 'later').length,
  context: review.assignments.filter((r) => r.disposition === 'context').length,
  groups: checked,
  browserStats: browser.stats,
  pureContracts: 'pass',
  publicationGuard: {
    exitCode: 1,
    npmPublishInvoked: false,
    registryWrites: 0,
  },
  sourceReference: {
    status:
      'not rechecked: owner requested project-only work; historical source inventory retained',
    externalRepositoryAccess: false,
    copies: 0,
    mutations: 0,
  },
  clean: { result: clean.result, sha256: clean.reproducedTarballSha256 },
  laterGates: review.laterGates,
  limitations: [
    'No actual browser-floor/branded Safari/iOS/manual AT/genuine Windows forced-colors qualification',
    'Finite WAAPI timing and post-stall state are not external pixel/flash or physical reference evidence',
    'Local CDP preliminary collection is not the full three-independent-100-cycle physical heap protocol',
    'No React/Next/catalog/site/registry/hosted-CI release claims; implementation remains uncommitted',
  ],
};
await writeFile(
  resolve(root, '.artifacts/m1-review-results.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      status: result.status,
      sourceBlocks: result.sourceBlocks,
      groups: Object.keys(checked).length,
      artifactSha256: packed.sha256,
    },
    null,
    2,
  ),
);
