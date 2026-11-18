import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { arch, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import type {} from '../../tests/m2/catalog-client';

const root = resolve(import.meta.dir, '../..');
const hash = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const packed = await Bun.file(
  resolve(root, '.artifacts/packed-report.json'),
).json();
if ((await readFile(packed.artifact).then(hash)) !== packed.sha256)
  throw Error('Stale artifact');
const directory = `.artifacts/m2-live-memory/${Date.now()}-catalog-native`;
await mkdir(resolve(root, directory), { recursive: true });
const inputs: Record<string, string> = {};
for (const path of [
  'scripts/bench/catalog-live-memory.ts',
  'tests/m2/catalog-client.ts',
  'tests/m2/catalog-model.ts',
  'tests/m2/catalog.css',
  'tests/browser/server.ts',
  'docs/implementation/m2/catalog-trace-manifest.json',
]) {
  const bytes = await readFile(resolve(root, path));
  inputs[path] = hash(bytes);
  await mkdir(resolve(root, directory, 'inputs', path, '..'), {
    recursive: true,
  });
  await writeFile(resolve(root, directory, 'inputs', path), bytes);
}
const protocol = {
  repetitions: 3,
  profiles: ['normal', 'list', 'stress'],
  phases: ['idle', 'handoff'],
  warmupCohortsPerCell: 1,
  activeSampleAfterMs: 450,
  laboratoryGC: true,
  limitsBytes: {
    normal: 8 * 1024 * 1024,
    list: 16 * 1024 * 1024,
    stress: 24 * 1024 * 1024,
  },
  scope:
    'Mounted paused and active-phase JS heap after laboratory GC, warmed empty baseline; fixture/application included. Sparse samples, not continuous peak, total browser/GPU memory or physical-reference qualification.',
};
const log = Bun.file(resolve(root, directory, 'server.log'));
const server = Bun.spawn(['bun', 'tests/browser/server.ts'], {
  cwd: root,
  env: { ...process.env, DOTQUILT_TEST_PORT: '4184' },
  stdout: log,
  stderr: log,
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const rows: Record<string, unknown>[] = [];
let fatal: string | null = null;
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error('Live memory server failed');
    try {
      if ((await fetch('http://127.0.0.1:4184/m2/catalog')).ok) break;
    } catch {}
    if (i === 99) throw Error('Live memory server timeout');
    await Bun.sleep(100);
  }
  browser = await chromium.launch();
  await writeFile(
    resolve(root, directory, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        artifactSha256: packed.sha256,
        inputs,
        protocol,
        browser: browser.version(),
        os: { platform: platform(), release: release(), arch: arch() },
        viewport: [1280, 1000],
        dpr: 1,
        powerThermal: 'uncontrolled local diagnostic',
      },
      null,
      2,
    ),
  );
  for (let repetition = 0; repetition < 3; repetition++)
    for (const profile of ['normal', 'list', 'stress'] as const)
      for (const phase of ['idle', 'handoff']) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 1000 },
          reducedMotion: 'no-preference',
          deviceScaleFactor: 1,
        });
        try {
          const page = await context.newPage();
          await page.goto(
            `http://127.0.0.1:4184/m2/catalog?candidate=native&profile=${profile}&phase=${phase}`,
          );
          await page.waitForFunction(() => !!window.catalogFixture);
          const session = await context.newCDPSession(page);
          const sample = async () => {
            await session.send('HeapProfiler.collectGarbage');
            return {
              ...(await session.send('Runtime.getHeapUsage')),
              dom: await session.send('Memory.getDOMCounters'),
            };
          };
          await page.evaluate(async () => {
            await window.catalogFixture.prepare();
            await window.catalogFixture.run(true);
            await window.catalogFixture.teardown();
            performance.clearMarks();
          });
          const baseline = await sample();
          const before = await page.evaluate(() =>
              window.catalogFixture.prepare(),
            ),
            mounted = await sample();
          const pending = page.evaluate(() => window.catalogFixture.run(true));
          await page.waitForFunction(
            () => performance.getEntriesByName('dq:active:start').length > 0,
          );
          await Bun.sleep(protocol.activeSampleAfterMs);
          const active = await sample();
          const activeState = await page.evaluate(() => ({
            at: performance.now(),
            start: performance.getEntriesByName('dq:active:start').at(-1)
              ?.startTime,
            snapshot: window.catalogFixture.snapshot(),
          }));
          const result = await pending,
            cleanup = await page.evaluate(() =>
              window.catalogFixture.teardown(),
            );
          const phaseActive =
            activeState.start !== undefined &&
            activeState.at - activeState.start <
              (phase === 'idle' ? 4000 : 900);
          const increment =
            Math.max(mounted.usedSize, active.usedSize) - baseline.usedSize;
          const row = {
            repetition,
            profile,
            phase,
            before,
            baseline,
            mounted,
            active,
            activeState,
            phaseActive,
            final: result.final,
            errors: result.errors,
            cleanup,
            maximumSampledHeapIncrementBytes: increment,
            limitBytes: protocol.limitsBytes[profile],
            pass:
              phaseActive &&
              result.errors.length === 0 &&
              increment <= protocol.limitsBytes[profile] &&
              !Object.values(cleanup).some(Boolean),
            qualification: protocol.scope,
          };
          rows.push(row);
          await writeFile(
            resolve(root, directory, `${repetition}-${profile}-${phase}.json`),
            JSON.stringify(row, null, 2),
          );
          console.log(
            `${repetition + 1}/3 ${profile}/${phase}: sampled heap increment ${increment} B; phase active=${phaseActive}; pass=${row.pass}`,
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
  evidenceFiles[path] = await readFile(resolve(root, directory, path)).then(
    hash,
  );
const report = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  directory,
  artifactSha256: packed.sha256,
  inputs,
  protocol,
  fatal,
  rows,
  result:
    !fatal && rows.length === 18 && rows.every((r) => r.pass) ? 'pass' : 'fail',
  evidenceFiles,
};
const path = `${directory}/report.json`;
await writeFile(resolve(root, path), JSON.stringify(report, null, 2));
await writeFile(
  resolve(root, '.artifacts/m2-catalog-live-memory-latest.json'),
  JSON.stringify(
    { report: path, sha256: await readFile(resolve(root, path)).then(hash) },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({ report: path, result: report.result, fatal }, null, 2),
);
if (report.result !== 'pass') process.exitCode = 1;
