import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m3');
const hash = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex');
const read = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason);
}
const native = await read('.artifacts/packed-report.json');
const adapter = await read('.artifacts/m3/packed-react-report.json');
const reactBrowser = await read('.artifacts/m3/browser-results.json');
const next = await read('.artifacts/m3/next-consumers.json');
const nextBrowser = await read('.artifacts/m3/next-browser-results.json');
const nativeBrowser = await read('.artifacts/m3/native-browser-results.json');
const ssr = await read('.artifacts/m3/ssr-output.json');
const review = await read('docs/implementation/m3/requirement-review.json');
const inventory = await read('docs/implementation/requirements.json');
const controls = await read('.artifacts/m3/remote-controls.json');
assert(
  controls.repository.visibility === 'PRIVATE' && controls.m2.state === 'OPEN',
  'Private repository/open M2 verification missing',
);
assert(
  hash(await readFile(native.artifact)) === native.sha256 &&
    hash(await readFile(adapter.artifact)) === adapter.sha256,
  'Changed artifact',
);
assert(
  adapter.result === 'pass' &&
    adapter.native.sha256 === native.sha256 &&
    adapter.version === native.version,
  'Mismatched artifact pair',
);
for (const artifact of [native, adapter])
  for (const name of artifact === native
    ? ['sourceFiles', 'buildInputs']
    : ['sources'])
    for (const [file, digest] of Object.entries(artifact[name]))
      assert(
        hash(await readFile(resolve(root, file))) === digest,
        `Stale packed input: ${file}`,
      );
assert(
  Object.values(native.sizes).every((value) => {
    const size = value as { gzip: number; limit: number };
    return size.gzip <= size.limit;
  }),
  'Native size gate failed',
);
for (const [entry, size] of Object.entries(native.externalModeGzip))
  assert(
    (size as number) <= native.sizes[entry].limit,
    `Native external size failed: ${entry}`,
  );
assert(
  Object.values(adapter.sizes).every(
    (value) => (value as { pass: boolean }).pass,
  ),
  'Adapter size gate failed',
);
for (const [report, expected, label] of [
  [reactBrowser, 216, 'React'],
  [nextBrowser, 60, 'Next'],
] as const) {
  assert(
    report.stats.expected === expected &&
      !report.stats.skipped &&
      !report.stats.unexpected &&
      !report.stats.flaky,
    `Incomplete/failed ${label} matrix`,
  );
  assert(
    report.config.metadata.nativeArtifactSha256 === native.sha256 &&
      report.config.metadata.reactArtifactSha256 === adapter.sha256,
    `Stale ${label} matrix`,
  );
}
assert(
  nativeBrowser.config.metadata.artifactSha256 === native.sha256 &&
    nativeBrowser.stats.expected === 298 &&
    nativeBrowser.stats.skipped === 2 &&
    !nativeBrowser.stats.unexpected &&
    !nativeBrowser.stats.flaky,
  'Incomplete/failed native regression matrix',
);
assert(
  next.result === 'pass' &&
    next.nativeSha256 === native.sha256 &&
    next.reactSha256 === adapter.sha256,
  'Stale Next builds',
);
for (const [file, digest] of Object.entries(next.sources))
  assert(
    hash(await readFile(resolve(root, file))) === digest,
    `Stale Next fixture: ${file}`,
  );
assert(
  ssr.result === 'pass' &&
    ssr.nativeSha256 === native.sha256 &&
    ssr.reactSha256 === adapter.sha256,
  'Stale SSR evidence',
);
assert(
  ssr.sourceSha256 ===
    hash(await readFile(resolve(root, 'tests/react/ssr-budget.mjs'))) &&
    ssr.nodeStreamingSourceSha256 ===
      hash(await readFile(resolve(root, 'tests/react/ssr-node.mjs'))),
  'Stale SSR probes',
);
assert(
  review.sourceInventorySha256 ===
    hash(
      await readFile(resolve(root, 'docs/implementation/requirements.json')),
    ) &&
    review.rows.length === inventory.requirements.length &&
    new Set(review.rows.map((r: { id: string }) => r.id)).size === 717,
  'Incomplete lossless requirement review',
);
assert(
  review.rows.every((row: { id: string }) =>
    inventory.requirements.some((r: { id: string }) => r.id === row.id),
  ),
  'Unknown reviewed clause',
);
const checks: { command: string; exitCode: number; log: string }[] = [];
async function run(args: string[], cwd = root, expected = 0) {
  const task = Bun.spawn(args, {
    cwd,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      TURBO_TELEMETRY_DISABLED: '1',
      npm_config_cache: resolve(root, '.artifacts/npm-cache'),
      BUN_INSTALL_CACHE_DIR: resolve(root, '.artifacts/bun-cache'),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(task.stdout).text(),
    new Response(task.stderr).text(),
  ]);
  const exitCode = await task.exited;
  const log = `.artifacts/m3/record-check-${checks.length + 1}.log`;
  await writeFile(resolve(root, log), `${stdout}\n${stderr}`);
  checks.push({ command: args.join(' '), exitCode, log });
  assert(exitCode === expected, `${args.join(' ')} failed; see ${log}`);
  return stdout + stderr;
}
for (const args of [
  ['bun', 'run', 'build'],
  ['bun', 'run', 'check'],
  ['bun', 'run', 'lint'],
  ['bun', 'run', 'test'],
  ['bun', 'run', 'test:harness'],
  ['bun', 'run', 'verify:clean'],
])
  await run(args);
const clean = await read('.artifacts/m3/clean-reproduction.json');
assert(
  clean.result === 'pass' &&
    clean.reproducedTarballSha256.core === native.sha256 &&
    clean.reproducedTarballSha256.react === adapter.sha256,
  'Pair is not reproducible',
);
for (const pkg of ['core', 'react']) {
  const directory = resolve(
      adapter.consumers.current,
      `node_modules/@dotquilt-internal/${pkg}`,
    ),
    manifest = JSON.parse(
      await readFile(resolve(directory, 'package.json'), 'utf8'),
    );
  assert(
    manifest.private &&
      manifest.scripts.prepublishOnly.includes('publishing is disabled'),
    'Publication guard missing',
  );
  if (pkg === 'core')
    assert(
      !Object.keys(manifest.dependencies ?? {}).length,
      'Framework dependency entered native',
    );
  else
    assert(
      manifest.dependencies['@dotquilt-internal/core'] === native.version &&
        manifest.peerDependencies.react &&
        manifest.peerDependencies['react-dom'],
      'Invalid exact native dependency/React peers',
    );
  const blocked = await run(['npm', 'run', 'prepublishOnly'], directory, 1);
  assert(
    blocked.includes('npm publishing is disabled'),
    'Publication hook did not fail for the intended reason',
  );
}
const browsers: Record<string, string> = {};
for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch({ headless: true });
  browsers[name] = browser.version();
  await browser.close();
}
const environment = {
  ...native.environment,
  osRelease: release(),
  platform: platform(),
  architecture: arch(),
  cpu: cpus()[0]?.model,
  totalMemoryBytes: totalmem(),
  browsers,
  playwright: JSON.parse(
    await readFile(
      resolve(root, 'node_modules/@playwright/test/package.json'),
      'utf8',
    ),
  ).version,
  physicalReferenceQualification: 'unverified: approved devices unavailable',
};
const attachments: Record<string, unknown>[] = [];
interface BrowserSuite {
  suites?: BrowserSuite[];
  specs?: {
    title: string;
    tests: {
      projectName: string;
      results: {
        attachments?: {
          name: string;
          contentType: string;
          body?: string;
          path?: string;
        }[];
      }[];
    }[];
  }[];
}
function walk(suites: BrowserSuite[], kind: string) {
  for (const suite of suites) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? [])
        for (const result of test.results ?? [])
          for (const attachment of result.attachments ?? [])
            if (
              ['next-ssr-output', 'runtime-react-version'].includes(
                attachment.name,
              ) ||
              attachment.name.startsWith('hydration-layout-')
            )
              attachments.push({
                kind,
                title: spec.title,
                project: test.projectName,
                ...attachment,
              });
    walk(suite.suites ?? [], kind);
  }
}
walk(reactBrowser.suites, 'react');
walk(nextBrowser.suites, 'next');
const observed = await Promise.all(
  attachments.map(async (attachment) => {
    const text = attachment.body
      ? Buffer.from(String(attachment.body), 'base64').toString()
      : await readFile(String(attachment.path), 'utf8');
    return {
      ...attachment,
      decoded:
        attachment.contentType === 'application/json' ? JSON.parse(text) : text,
    };
  }),
);
await writeFile(
  resolve(output, 'observations.json'),
  `${JSON.stringify(observed, null, 2)}\n`,
);
const m2 = await read('docs/implementation/m2/evidence.json');
let preserved = 0;
for (const [file, digest] of Object.entries(m2.evidenceSha256 ?? {})) {
  const archived = resolve(root, m2.archive, file);
  assert(
    await Bun.file(archived).exists(),
    `Missing M2 archived file: ${file}`,
  );
  assert(
    hash(await readFile(archived)) === digest,
    `Changed M2 archive: ${file}`,
  );
  preserved++;
}
const baseCommit = (await run(['git', 'rev-parse', 'HEAD'])).trim();
const archive = `.artifacts/evidence-runs/m3-${native.sha256.slice(0, 12)}-${adapter.sha256.slice(0, 12)}-${Date.now()}`;
const sources = new Set<string>([
  'package.json',
  'bun.lock',
  'bunfig.toml',
  '.bun-version',
  '.npmrc',
  'tsconfig.json',
  'turbo.json',
  'biome.json',
  'playwright.config.ts',
  'playwright.react.config.ts',
  'playwright.next.config.ts',
  '.changeset/config.json',
  '.changeset/README.md',
  '.changeset/thin-react-ssr.md',
  '.github/workflows/quality.yml',
  'README.md',
  'AGENTS.md',
  'docs/roadmap.md',
  'docs/implementation/react-quickstart.md',
  'docs/implementation/m3/progress.md',
  'docs/implementation/m3/requirement-review.json',
  'docs/implementation/requirements.json',
]);
for (const directory of ['scripts', 'tests', 'packages/core', 'packages/react'])
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, directory),
    onlyFiles: true,
  }))
    if (!/(?:^|\/)(node_modules|dist|\.turbo)(?:\/|$)/.test(file))
      sources.add(`${directory}/${file}`);
for (const file of [
  '.artifacts/packed-report.json',
  '.artifacts/m3/packed-react-report.json',
  '.artifacts/m3/ssr-output.json',
  '.artifacts/m3/next-consumers.json',
  '.artifacts/m3/browser-results.json',
  '.artifacts/m3/next-browser-results.json',
  '.artifacts/m3/native-browser-results.json',
  '.artifacts/m3/clean-reproduction.json',
  '.artifacts/m3/remote-controls.json',
  '.artifacts/m3/observations.json',
])
  sources.add(file);
for await (const file of new Bun.Glob('*.log').scan({
  cwd: output,
  onlyFiles: true,
}))
  if (!file.startsWith('record-') || file.startsWith('record-check-'))
    sources.add(`.artifacts/m3/${file}`);
for await (const file of new Bun.Glob('**/*').scan({
  cwd: resolve(output, 'history'),
  onlyFiles: true,
}))
  sources.add(`.artifacts/m3/history/${file}`);
for await (const file of new Bun.Glob('**/*').scan({
  cwd: resolve(output, 'native-test-results'),
  onlyFiles: true,
}))
  sources.add(`.artifacts/m3/native-test-results/${file}`);
// Retain the exact old artifacts referenced by this milestone's failed/earlier logs.
const priorCandidates = new Set<string>();
for (const file of sources)
  if (file.endsWith('.log') || file.endsWith('.json')) {
    for (const digest of (await readFile(resolve(root, file), 'utf8')).matchAll(
      /\b[a-f0-9]{64}\b/g,
    )) {
      const directory = resolve(root, '.artifacts/history', digest[0]);
      if (await Bun.file(resolve(directory, 'packed-report.json')).exists())
        priorCandidates.add(digest[0]);
    }
  }
for (const digest of priorCandidates)
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: resolve(root, '.artifacts/history', digest),
    onlyFiles: true,
  }))
    sources.add(`.artifacts/history/${digest}/${file}`);
for (const file of [
  'browser-first.json',
  'browser-second.json',
  'browser-resource-first.json',
  'react-browser-base.json',
  'react-browser-supplement.json',
  'next-browser-nonce-failure.json',
])
  if (await Bun.file(resolve(output, file)).exists())
    if (!file.startsWith('record-') || file.startsWith('record-check-'))
      sources.add(`.artifacts/m3/${file}`);
for await (const file of new Bun.Glob('**/*').scan({
  cwd: resolve(output, 'react-test-results'),
  onlyFiles: true,
}))
  sources.add(`.artifacts/m3/react-test-results/${file}`);
for await (const file of new Bun.Glob('**/*').scan({
  cwd: resolve(output, 'next-test-results'),
  onlyFiles: true,
}))
  sources.add(`.artifacts/m3/next-test-results/${file}`);
await mkdir(resolve(root, archive), { recursive: true });
const evidenceSha256: Record<string, string> = {};
for (const file of [...sources].sort()) {
  const bytes = await readFile(resolve(root, file));
  evidenceSha256[file] = hash(bytes);
  await mkdir(resolve(root, archive, file, '..'), { recursive: true });
  await writeFile(resolve(root, archive, file), bytes);
}
const artifactFiles: Record<string, string> = {};
for (const [kind, artifact] of [
  ['core', native],
  ['react', adapter],
] as const) {
  const target = `artifacts/${kind}.tgz`;
  await mkdir(resolve(root, archive, 'artifacts'), { recursive: true });
  await cp(artifact.artifact, resolve(root, archive, target));
  artifactFiles[target] = artifact.sha256;
}
const nextBuilds: Record<string, unknown> = {};
for (const [line, directory] of Object.entries(next.consumers) as [
  string,
  string,
][]) {
  const files: Record<string, string> = {};
  for (const file of [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'next-env.d.ts',
    '.next/BUILD_ID',
    '.next/server/app-paths-manifest.json',
    '.next/required-server-files.json',
  ])
    if (await Bun.file(resolve(directory, file)).exists()) {
      const bytes = await readFile(resolve(directory, file));
      const target = `next-consumers/${line}/${file}`;
      await mkdir(resolve(root, archive, target, '..'), { recursive: true });
      await writeFile(resolve(root, archive, target), bytes);
      files[target] = hash(bytes);
    }
  nextBuilds[line] = { path: directory, versions: next.versions[line], files };
}
const result = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  task: 'https://github.com/b4rb13/dot-loaders/issues/17',
  status:
    'pass: scoped M3 SkeletonBlock/LoadingRegion React and SSR foundation; full v1 unverified',
  archive,
  baseCommit,
  uncommittedImplementation: true,
  artifacts: {
    native: {
      sha256: native.sha256,
      version: native.version,
      files: native.files.length,
    },
    react: {
      sha256: adapter.sha256,
      version: adapter.version,
      files: adapter.files.length,
    },
  },
  environment,
  gates: {
    buildTypeLintUnitHarness: 'pass; exact logs retained',
    cleanPair: 'pass; both tarballs reproduce exactly',
    reactBrowser: reactBrowser.stats,
    nextBrowser: nextBrowser.stats,
    nativeBrowser: nativeBrowser.stats,
    nativeSize:
      'pass in every CSS mode; Region has only 5 B external-mode headroom; 20% optimization goal not achieved',
    adapterSize:
      'pass matched root/family and two-export closure in every CSS mode',
    ssrOutput:
      'pass default/maximum non-style and 24-surface/six-region gzip including cold styles; Next transport separate',
    publication:
      'private flags and both installed prepublish hooks reject publication; no registry action',
    physicalReferenceAndFullRelease: 'unverified',
  },
  sizes: {
    native: native.sizes,
    nativeExternal: native.externalModeGzip,
    react: adapter.sizes,
  },
  ssr: '.artifacts/m3/ssr-output.json',
  observations: '.artifacts/m3/observations.json',
  nextBuilds,
  checks,
  requirementReview: {
    blocks: 717,
    originalM3CarryForward: 108,
    partialEvidenceRows: review.rows.filter(
      (r: { m3Groups: string[] }) => r.m3Groups.length,
    ).length,
    fullClauseQualification: 'unverified; scoped proof only',
  },
  m2Preserved: {
    archive: m2.archive,
    checkedArchivedFiles: preserved,
    status:
      'M2 remains open; renderer choices provisional; older timing evidence remains tied to its original artifact',
  },
  evidenceSha256,
  artifactFiles,
  limitations: review.residuals,
  sourceIsolation:
    'Project files only. No historical external repository read/fingerprint/extraction, npm publication, visibility change, deployment or distribution.',
};
await writeFile(
  resolve(root, archive, 'evidence.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
await writeFile(
  resolve(root, 'docs/implementation/m3/evidence.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      status: result.status,
      archive,
      artifacts: result.artifacts,
      gates: result.gates,
      checks: checks.length,
      sourceAndEvidenceFiles: sources.size,
    },
    null,
    2,
  ),
);
