import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  artifacts = resolve(root, '.artifacts');
const native = await Bun.file(resolve(artifacts, 'packed-report.json')).json();
const adapter = await Bun.file(
  resolve(artifacts, 'm3/packed-react-report.json'),
).json();
if (adapter.native.sha256 !== native.sha256 || adapter.result !== 'pass')
  throw new Error('Matching passing packed consumers are required');
const destination = await mkdtemp(resolve(tmpdir(), 'dotquilt-clean-'));
for (const name of [
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
  'playwright.m4.config.ts',
  'playwright.motion-review.config.ts',
  'playwright.chart-production.config.ts',
  'playwright.chart-options.config.ts',
  'playwright.chart-comparison.config.ts',
  'playwright.table.config.ts',
  'playwright.table-options.config.ts',
  'playwright.table-parts.config.ts',
  'playwright.table-comparison.config.ts',
  'playwright.table-reference.config.ts',
  'playwright.presets.config.ts',
  'playwright.coordination.config.ts',
  'playwright.shared-wrapper.config.ts',
  'playwright.api.config.ts',
  'playwright.copies.config.ts',
  'playwright.layout.config.ts',
  'scripts',
  'tests',
  'examples',
  '.changeset',
  'apps',
])
  await cp(resolve(root, name), resolve(destination, name), {
    recursive: true,
  });
for (const pkg of ['core', 'react'])
  await cp(
    resolve(root, `packages/${pkg}`),
    resolve(destination, `packages/${pkg}`),
    {
      recursive: true,
      filter: (path) =>
        !/(?:^|\/)(?:node_modules|dist|\.turbo)(?:\/|$)/.test(path),
    },
  );
const checks: { command: string; exitCode: number }[] = [];
const reproduced: Record<string, string> = {};
const commands: [string[], string, string?][] = [
  [['bun', 'install', '--frozen-lockfile', '--ignore-scripts'], destination],
  [['bun', 'run', 'build'], destination],
  [['bun', 'run', 'check'], destination],
  [['bun', 'run', 'lint'], destination],
  [['bun', 'run', 'test'], destination],
  [['bun', 'run', 'test:harness'], destination],
  ...['core', 'react'].map(
    (pkg) =>
      [
        [
          'npm',
          'pack',
          '--json',
          '--ignore-scripts',
          '--pack-destination',
          destination,
        ],
        resolve(destination, `packages/${pkg}`),
        pkg,
      ] as [string[], string, string],
  ),
];
for (const [args, cwd, pkg] of commands) {
  const task = Bun.spawn(args, {
    cwd,
    env: {
      ...process.env,
      TURBO_TELEMETRY_DISABLED: '1',
      BUN_INSTALL_CACHE_DIR: resolve(artifacts, 'bun-cache'),
      npm_config_cache: resolve(artifacts, 'npm-cache'),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(task.stdout).text(),
    new Response(task.stderr).text(),
  ]);
  const exitCode = await task.exited;
  checks.push({ command: args.join(' '), exitCode });
  if (exitCode) {
    console.error(stdout, stderr);
    break;
  }
  if (pkg)
    reproduced[pkg] = createHash('sha256')
      .update(
        await readFile(resolve(destination, JSON.parse(stdout)[0].filename)),
      )
      .digest('hex');
}
const mismatches: string[] = [];
if (checks.every((c) => c.exitCode === 0))
  for (const pkg of ['core', 'react'])
    for await (const file of new Bun.Glob('**/*').scan({
      cwd: resolve(root, `packages/${pkg}/dist`),
      onlyFiles: true,
    })) {
      const [original, fresh] = await Promise.all([
        readFile(resolve(root, `packages/${pkg}/dist`, file)),
        readFile(resolve(destination, `packages/${pkg}/dist`, file)),
      ]);
      if (!original.equals(fresh)) mismatches.push(`${pkg}/${file}`);
    }
const report = {
  recordedAt: new Date().toISOString(),
  method:
    'Fresh allowlisted source copy, frozen install/build/check/lint/test/harness and independent native+React tarballs. No original dependencies, compiled outputs or source aliases.',
  path: destination,
  expected: { core: native.sha256, react: adapter.sha256 },
  checks,
  compiledOutputMismatches: mismatches,
  reproducedTarballSha256: reproduced,
  result:
    checks.length === commands.length &&
    checks.every((c) => c.exitCode === 0) &&
    !mismatches.length &&
    reproduced.core === native.sha256 &&
    reproduced.react === adapter.sha256
      ? 'pass'
      : 'fail',
};
await mkdir(resolve(artifacts, 'm3'), { recursive: true });
await writeFile(
  resolve(artifacts, 'm3/clean-reproduction.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (report.result !== 'pass') process.exitCode = 1;
