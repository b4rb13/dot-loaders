import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { arch, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import type {} from '../../tests/m2/catalog-client';

const root = resolve(import.meta.dir, '../..');
const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const packed = await Bun.file(
  resolve(root, '.artifacts/packed-report.json'),
).json();
if (hash(await readFile(packed.artifact)) !== packed.sha256)
  throw Error('Stale artifact');
for (const [path, expected] of Object.entries({
  ...packed.sourceFiles,
  ...packed.buildInputs,
}))
  if (hash(await readFile(resolve(root, path))) !== expected)
    throw Error(`Stale packed input ${path}`);
const smoke = process.argv.includes('--smoke');
if (process.argv.slice(2).some((arg) => arg !== '--smoke'))
  throw Error('Unknown memory option');
const directory = `.artifacts/m2-cleanup/${Date.now()}-catalog-native${smoke ? '-smoke' : ''}`;
await mkdir(resolve(root, directory), { recursive: true });
const inputs: Record<string, string> = {};
for (const path of [
  'scripts/bench/catalog-memory.ts',
  'tests/m2/catalog-client.ts',
  'tests/m2/catalog-model.ts',
  'tests/m2/catalog.css',
  'tests/browser/server.ts',
  'docs/implementation/m2/catalog-trace-manifest.json',
  'package.json',
  'bun.lock',
]) {
  const bytes = await readFile(resolve(root, path));
  inputs[path] = hash(bytes);
  await mkdir(resolve(root, directory, 'inputs', path, '..'), {
    recursive: true,
  });
  await writeFile(resolve(root, directory, 'inputs', path), bytes);
}
const protocol = {
  repetitions: smoke ? 1 : 3,
  cycles: smoke ? 3 : 100,
  warmupCohorts: smoke ? 1 : 3,
  checkpoints: smoke ? [3] : [10, 50, 100],
  surfaces: 24,
  regions: 6,
  publicHosts: 30,
  controllers: 10,
  requestedHandoffMs: 900,
  liveHeapLimitBytes: 8 * 1024 * 1024,
  residualHeapLimitBytes: 512 * 1024,
  requireDiscardedNodesReleased: true,
  method:
    'Warmed empty fixture; laboratory CDP GC before heap samples; all fixture/app cost included; native code unmodified. Local Chromium only, no physical-reference qualification.',
};
const serverLog = Bun.file(resolve(root, directory, 'server.log'));
const server = Bun.spawn(['bun', 'tests/browser/server.ts'], {
  cwd: root,
  env: { ...process.env, DOTQUILT_TEST_PORT: '4184' },
  stdout: serverLog,
  stderr: serverLog,
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const repetitions: Record<string, unknown>[] = [];
let fatal: string | null = null;
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error('Memory fixture server failed');
    try {
      if ((await fetch('http://127.0.0.1:4184/m2/catalog')).ok) break;
    } catch {}
    if (i === 99) throw Error('Memory fixture server timeout');
    await Bun.sleep(100);
  }
  browser = await chromium.launch();
  await writeFile(
    resolve(root, directory, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        recordedAt: new Date().toISOString(),
        protocol,
        artifactSha256: packed.sha256,
        inputs,
        browser: browser.version(),
        os: { platform: platform(), release: release(), arch: arch() },
        viewport: [1280, 1000],
        dpr: 1,
        powerThermal: 'uncontrolled local diagnostic',
        smoke,
      },
      null,
      2,
    ),
  );
  for (let repetition = 0; repetition < protocol.repetitions; repetition++) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: 'no-preference',
      deviceScaleFactor: 1,
    });
    try {
      const page = await context.newPage();
      await page.goto(
        'http://127.0.0.1:4184/m2/catalog?candidate=native&profile=normal&phase=handoff',
      );
      await page.waitForFunction(() => !!window.catalogFixture);
      const session = await context.newCDPSession(page);
      const settle = () =>
        page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
      const sample = async () => {
        await settle();
        await session.send('HeapProfiler.collectGarbage');
        return {
          ...(await session.send('Runtime.getHeapUsage')),
          dom: await session.send('Memory.getDOMCounters'),
        };
      };
      for (let i = 0; i < protocol.warmupCohorts; i++) {
        await page.evaluate(async () => {
          await window.catalogFixture.prepare();
          await window.catalogFixture.run(true);
          await window.catalogFixture.teardown();
        });
      }
      const baseline = await sample(),
        checkpoints = [],
        failures: string[] = [];
      for (let cycle = 1; cycle <= protocol.cycles; cycle++) {
        const before = await page.evaluate(() =>
          window.catalogFixture.prepare(),
        );
        if (
          before.mounted !== 24 ||
          before.visible !== 24 ||
          before.publicHosts !== 30 ||
          before.catalog.controllers !== 10
        )
          failures.push(`cycle-${cycle}:canonical-counts`);
        const live = protocol.checkpoints.includes(cycle)
          ? await sample()
          : null;
        await page.evaluate(() => window.catalogFixture.updateAppearance());
        const result = await page.evaluate(() =>
          window.catalogFixture.run(true),
        );
        if (
          result.final.ready !== 10 ||
          !result.final.catalog.identitiesRetained ||
          result.errors.length ||
          result.final.violations.length ||
          result.catalog.terminal.filter(
            (e) => e.type === 'dotquilt-handoff-end',
          ).length !== 10
        )
          failures.push(`cycle-${cycle}:handoff`);
        await page.evaluate(() => window.catalogFixture.trackDiscarded());
        const cleanup = await page.evaluate(() =>
          window.catalogFixture.teardown(),
        );
        await page.evaluate(() => performance.clearMarks());
        if (Object.values(cleanup).some(Boolean))
          failures.push(`cycle-${cycle}:services`);
        if (live) {
          const after = await sample();
          const retained = await page.evaluate(() =>
            window.catalogFixture.retained(),
          );
          const checkpoint = {
            cycle,
            live,
            after,
            retained,
            liveHeapIncrementBytes: live.usedSize - baseline.usedSize,
            residualHeapIncrementBytes: after.usedSize - baseline.usedSize,
            liveHeapPass:
              live.usedSize - baseline.usedSize <= protocol.liveHeapLimitBytes,
            residualHeapPass:
              after.usedSize - baseline.usedSize <=
              protocol.residualHeapLimitBytes,
            discardedNodesPass: retained.hosts === 0 && retained.content === 0,
          };
          checkpoints.push(checkpoint);
          if (
            !checkpoint.liveHeapPass ||
            !checkpoint.residualHeapPass ||
            !checkpoint.discardedNodesPass
          )
            failures.push(`cycle-${cycle}:memory`);
          console.log(
            `repetition ${repetition + 1}/${protocol.repetitions}, cycle ${cycle}: residual ${checkpoint.residualHeapIncrementBytes} B; retained hosts/content ${retained.hosts}/${retained.content}`,
          );
        }
      }
      repetitions.push({
        repetition,
        baseline,
        checkpoints,
        failures,
        result: failures.length ? 'fail' : 'pass',
      });
      await writeFile(
        resolve(root, directory, `repetition-${repetition}.json`),
        JSON.stringify(repetitions.at(-1), null, 2),
      );
    } finally {
      await context.close();
    }
  }
} catch (error) {
  fatal = String(error);
} finally {
  await browser?.close();
  server.kill();
  await server.exited;
}
const evidenceFiles: Record<string, string> = {};
for await (const path of new Bun.Glob('**/*').scan({
  cwd: resolve(root, directory),
  onlyFiles: true,
}))
  evidenceFiles[path] = hash(await readFile(resolve(root, directory, path)));
const report = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  directory,
  artifactSha256: packed.sha256,
  inputs,
  protocol,
  smoke,
  fatal,
  repetitions,
  protocolComplete: !smoke && !fatal && repetitions.length === 3,
  result:
    fatal ||
    repetitions.length !== protocol.repetitions ||
    repetitions.some((r) => r.result !== 'pass')
      ? 'fail'
      : 'pass',
  qualification:
    'Local diagnostic; physical reference, full heap-snapshot retaining-path attribution and total browser/GPU memory remain unverified',
  evidenceFiles,
};
const path = `${directory}/report.json`;
await writeFile(resolve(root, path), JSON.stringify(report, null, 2));
await writeFile(
  resolve(
    root,
    `.artifacts/m2-catalog-memory-latest${smoke ? '-smoke' : ''}.json`,
  ),
  JSON.stringify(
    { report: path, sha256: hash(await readFile(resolve(root, path))) },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      report: path,
      result: report.result,
      protocolComplete: report.protocolComplete,
      fatal,
    },
    null,
    2,
  ),
);
if (report.result !== 'pass') process.exitCode = 1;
