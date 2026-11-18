import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { arch, cpus, loadavg, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import type { CatalogFixture } from '../../tests/m2/catalog-client';
import {
  catalogCounts,
  dashboardFamilies,
  individualFamilies,
} from '../../tests/m2/catalog-model';
import type {} from '../../tests/m2/trace-client';
import {
  analyzeTrace,
  comparePair,
  layoutScore,
  nearestRank,
  summarizePairs,
  type TraceEvent,
} from './trace';
import { wholeWorkSummary } from './whole-work';

const root = resolve(import.meta.dir, '../..');
const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const read = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
const args = process.argv.slice(2);
const option = (name: string, fallback: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ??
  fallback;
for (const arg of args)
  if (
    !/^--(scene|candidate|family|profile|phase)=/.test(arg) &&
    arg !== '--smoke'
  )
    throw new Error(`Unknown option ${arg}`);
const scene = option('scene', 'proof');
const catalogScene = scene === 'catalog';
const candidate = option('candidate', catalogScene ? 'native' : 'canvas'),
  family = option('family', catalogScene ? 'mixed' : 'line'),
  profile = option('profile', 'normal'),
  phase = option('phase', 'idle');
if (
  !['proof', 'catalog'].includes(scene) ||
  !(
    catalogScene ? ['native', 'svg', 'canvas', 'dom'] : ['svg', 'canvas', 'dom']
  ).includes(candidate) ||
  !(
    catalogScene
      ? ['mixed', ...individualFamilies]
      : ['line', 'bar', 'scatter', 'text', 'table']
  ).includes(family) ||
  (catalogScene && profile === 'individual' && family === 'mixed') ||
  !['individual', 'normal', 'list', 'stress'].includes(profile) ||
  !['idle', 'handoff'].includes(phase)
)
  throw new Error('Unsupported benchmark configuration');
const smoke = args.includes('--smoke');
const packed = await read('.artifacts/packed-report.json');
const manifestPath = `docs/implementation/m2/${catalogScene ? 'catalog-trace-manifest' : 'trace-manifest'}.json`;
const manifest = await read(manifestPath);
if (hash(await readFile(packed.artifact)) !== packed.sha256)
  throw new Error('Stale packed artifact');
for (const [path, digest] of Object.entries({
  ...packed.sourceFiles,
  ...packed.buildInputs,
}))
  if (hash(await readFile(resolve(root, path))) !== digest)
    throw new Error(`Stale packed input ${path}; repack first`);
const directory = `.artifacts/m2-traces/${Date.now()}-${catalogScene ? 'catalog-' : ''}${candidate}-${profile}-${family}-${phase}${smoke ? '-smoke' : ''}`;
await mkdir(resolve(root, directory), { recursive: true });
const inputs: Record<string, string> = {};
for (const path of [
  'scripts/bench/run.ts',
  'scripts/bench/trace.ts',
  'tests/m2/trace-client.ts',
  ...(catalogScene
    ? [
        'tests/m2/catalog-client.ts',
        'tests/m2/catalog-model.ts',
        'tests/m2/catalog.css',
        'scripts/bench/whole-work.ts',
      ]
    : []),
  'tests/browser/server.ts',
  manifestPath,
  'package.json',
  'bun.lock',
]) {
  inputs[path] = hash(await readFile(resolve(root, path)));
  const destination = resolve(root, directory, 'inputs', path);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await writeFile(destination, await readFile(resolve(root, path)));
}
await writeFile(
  resolve(root, directory, 'packed-report.json'),
  JSON.stringify(packed, null, 2),
);
const serverLog = Bun.file(resolve(root, directory, 'server.log'));
const server = Bun.spawn(['bun', 'tests/browser/server.ts'], {
  cwd: root,
  env: { ...process.env, DOTQUILT_TEST_PORT: '4182' },
  stdout: serverLog,
  stderr: serverLog,
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const attempts: Record<string, unknown>[] = [],
  warmups: Record<string, unknown>[] = [],
  pairs: ReturnType<typeof comparePair>[] = [];
const evidenceFiles: Record<string, string> = {};
const limits = profile === 'stress' ? { p95: 8, p99: 12 } : { p95: 4, p99: 8 };
const count =
  profile === 'individual'
    ? 1
    : profile === 'normal'
      ? 24
      : profile === 'list'
        ? 200
        : 100;
const visible = profile === 'list' ? 20 : count;
let frameMs = 1000 / 60;
const capture = async (animated: boolean, name: string) => {
  if (!browser) throw new Error('Missing browser');
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  let session: Awaited<ReturnType<typeof context.newCDPSession>> | undefined;
  let tracing = false;
  try {
    await page.goto(
      `http://127.0.0.1:4182/m2/${catalogScene ? 'catalog' : 'trace'}?candidate=${candidate}&family=${family}&profile=${profile}&phase=${phase}`,
    );
    await page.waitForFunction(
      (catalog) => (catalog ? !!window.catalogFixture : !!window.traceFixture),
      catalogScene,
    );
    session = await context.newCDPSession(page);
    await session.send('Tracing.start', {
      transferMode: 'ReturnAsStream',
      traceConfig: {
        recordMode: 'recordContinuously',
        includedCategories: manifest.categories,
        traceBufferSizeInKb: 65536,
      },
    });
    tracing = true;
    const before = await page.evaluate(
      (catalog) =>
        catalog
          ? window.catalogFixture.prepare()
          : window.traceFixture.prepare(),
      catalogScene,
    );
    const result = await page.evaluate(
      ({ a, catalog }) =>
        catalog ? window.catalogFixture.run(a) : window.traceFixture.run(a),
      { a: animated, catalog: catalogScene },
    );
    const cleanup = await page.evaluate(
      (catalog) =>
        catalog
          ? window.catalogFixture.teardown()
          : window.traceFixture.teardown(),
      catalogScene,
    );
    const complete = new Promise<{
      stream?: string;
      dataLossOccurred?: boolean;
    }>((resolve) => session?.once('Tracing.tracingComplete', resolve));
    await session.send('Tracing.end');
    tracing = false;
    const ended = await complete;
    if (!ended.stream)
      throw new Error('Instrumentation failure: no trace stream');
    const chunks: Buffer[] = [];
    for (;;) {
      const part = await session.send('IO.read', {
        handle: ended.stream,
        size: 1048576,
      });
      chunks.push(
        Buffer.from(part.data, part.base64Encoded ? 'base64' : 'utf8'),
      );
      if (part.eof) break;
    }
    await session.send('IO.close', { handle: ended.stream });
    const bytes = Buffer.concat(chunks),
      compressed = gzipSync(bytes, { level: 6 });
    const path = `${directory}/${name}.trace.json.gz`;
    await writeFile(resolve(root, path), compressed);
    evidenceFiles[path] = hash(compressed);
    const trace = JSON.parse(bytes.toString('utf8')) as {
      traceEvents: TraceEvent[];
    };
    if (ended.dataLossOccurred)
      throw new Error(
        'Instrumentation failure: trace data loss (raw retained)',
      );
    const analysis = analyzeTrace(trace.traceEvents, result.windowMs, frameMs);
    const interval = result.opportunities
      .slice(1)
      .map((t, i) => t - (result.opportunities[i] as number));
    const cadence = Object.fromEntries(
      before.visibleIds.map((id) => [
        id,
        ((result.committed[id]?.filter(
          (time) =>
            time >= result.start && time < result.start + result.windowMs,
        ).length ?? 0) *
          1000) /
          result.windowMs,
      ]),
    );
    const functionalFailures: string[] = [];
    if (
      before.mounted !== count ||
      before.visible !== visible ||
      result.final.visible !== visible
    )
      functionalFailures.push('visibility-count');
    const expectedSurface =
      profile === 'individual'
        ? [320, 160]
        : profile === 'normal'
          ? [160, 80]
          : profile === 'list'
            ? [180, catalogScene ? 120 : 160]
            : [120, 60];
    if (
      before.surfaces.some(
        (s) =>
          Math.abs(s.width - (expectedSurface[0] as number)) > 0.5 ||
          Math.abs(s.height - (expectedSurface[1] as number)) > 0.5,
      )
    )
      functionalFailures.push('surface-dimensions');
    if (before.viewport[0] !== 1280 || before.viewport[1] !== 1000)
      functionalFailures.push('viewport-mismatch');
    if (before.documentHidden || before.dpr !== 1 || before.zoom !== 1)
      functionalFailures.push('environment-mismatch');
    if (Object.values(cleanup).some(Boolean))
      functionalFailures.push('cleanup');
    if (result.final.violations.length) functionalFailures.push('csp');
    const catalogBefore = catalogScene
      ? (before as ReturnType<CatalogFixture['snapshot']>).catalog
      : null;
    const catalogResult = catalogScene
      ? (result as Awaited<ReturnType<CatalogFixture['run']>>)
      : null;
    if (
      phase === 'handoff' &&
      result.final.ready !== (catalogBefore?.controllers ?? count)
    )
      functionalFailures.push('ready-content');
    if (!catalogScene && profile === 'normal' && before.ledger?.dots !== 8640)
      functionalFailures.push('normal-quality-allocation');
    if (profile !== 'stress' && result.errors.length)
      functionalFailures.push('unexpected-engine-error');
    if (
      animated &&
      !catalogScene &&
      phase === 'idle' &&
      profile !== 'stress' &&
      Object.values(cadence).some((hz) => hz === 0)
    )
      functionalFailures.push('normal-no-animation');
    if (catalogBefore) {
      if (
        profile === 'normal' &&
        (before.publicHosts !== 30 ||
          catalogBefore.regions !== 6 ||
          JSON.stringify(catalogBefore.families) !==
            JSON.stringify(catalogCounts(dashboardFamilies)))
      )
        functionalFailures.push('canonical-dashboard-counts');
      if (!catalogResult?.final.catalog.identitiesRetained)
        functionalFailures.push('content-identity');
      if (
        (result.final.ledger?.dots ?? 0) > 16384 ||
        (result.final.ledger?.pixels ?? 0) > 4194304 ||
        (result.final.ledger?.bytes ?? 0) > 2097152
      )
        functionalFailures.push('document-resource-cap');
      if (
        profile === 'list' &&
        phase === 'idle' &&
        JSON.stringify(
          catalogResult?.catalog.scrolls.map((s) => [s.top, s.visible]),
        ) !==
          JSON.stringify([
            [960, 20],
            [2400, 20],
            [4320, 20],
          ])
      )
        functionalFailures.push('scrolling-protocol');
    }
    const cls = layoutScore(result.shifts);
    const sample = {
      name,
      animated,
      loadAverage: loadavg(),
      before,
      result,
      cleanup,
      analysis,
      functionalFailures,
      cadence: {
        changedCommandCommitsPerSecond: cadence,
        animatedSurfaces: Object.values(cadence).filter((hz) => hz > 0).length,
        staticOrDeniedSurfaces:
          visible - Object.values(cadence).filter((hz) => hz > 0).length,
        normalFloorPass:
          catalogScene || phase !== 'idle' || !animated || profile === 'stress'
            ? null
            : Object.values(cadence).every((hz) => hz >= 30),
        physicalPresentation:
          'unverified: command commits and delivered RAF are not optical/display presentation',
      },
      frameHealth: {
        deliveredOpportunities: result.opportunities.length,
        intervalP95Ms: interval.length ? nearestRank(interval, 0.95) : null,
        maximumIntervalMs: interval.length ? Math.max(...interval) : null,
        gapsOverTwoBins: interval.filter((v) => v > frameMs * 2 + 0.5).length,
      },
      layout: {
        clsSupported: result.clsSupported,
        cls: result.clsSupported ? cls : null,
        allRawShifts: result.shifts,
        includingRecentInputSum: result.shifts.reduce(
          (sum, e) => sum + e.value,
          0,
        ),
        neighboringRectsStable:
          JSON.stringify(result.initialRects) ===
          JSON.stringify(result.final.rects),
        scope:
          'local fixed fixture only; no SSR/hydration or arbitrary consumer layout claim',
      },
      trace: {
        path,
        sha256: hash(compressed),
        uncompressedSha256: hash(bytes),
        bytes: bytes.length,
        events: trace.traceEvents.length,
        dataLoss: false,
      },
    };
    const samplePath = `${directory}/${name}.json`;
    await writeFile(resolve(root, samplePath), JSON.stringify(sample, null, 2));
    evidenceFiles[samplePath] = hash(await readFile(resolve(root, samplePath)));
    return sample;
  } finally {
    if (tracing && session) await session.send('Tracing.end').catch(() => {});
    await context.close();
    await Bun.sleep(250);
  }
};
let fatal: string | undefined;
let calibration:
  | {
      intervals: number[];
      medianOpportunityHz: number;
      physicalDisplay: string;
    }
  | undefined;
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw new Error('Benchmark server failed; inspect server.log');
    try {
      if ((await fetch('http://127.0.0.1:4182/m2/trace')).ok) break;
    } catch {}
    if (i === 99) throw new Error('Benchmark server timeout');
    await Bun.sleep(100);
  }
  browser = await chromium.launch();
  const calibrationPage = await browser.newPage();
  const intervals = await calibrationPage.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const times: number[] = [];
        const next = (time: number) => {
          times.push(time);
          if (times.length === 121)
            resolve(times.slice(1).map((t, i) => t - (times[i] as number)));
          else requestAnimationFrame(next);
        };
        requestAnimationFrame(next);
      }),
  );
  frameMs = nearestRank(intervals, 0.5);
  calibration = {
    intervals,
    medianOpportunityHz: 1000 / frameMs,
    physicalDisplay:
      'unknown: headless browser scheduling estimate, not a verified physical display cadence',
  };
  await calibrationPage.close();
  const frozen = {
    ...manifest,
    runtime: {
      smoke,
      scene,
      candidate,
      family,
      profile,
      phase,
      inputs,
      artifactSha256: packed.sha256,
      browser: browser.version(),
      viewport: [1280, 1000],
      dpr: 1,
      calibration,
      frameMs,
      os: {
        platform: platform(),
        release: release(),
        arch: arch(),
        cpuModel: cpus()[0]?.model,
      },
      bun: Bun.version,
      node: process.version,
      zoom: 1,
      powerAndThermal:
        'uncontrolled local diagnostic; no reference qualification',
      cache:
        'warmed execution; fresh browser contexts do not prove cold code caches',
    },
  };
  await writeFile(
    resolve(root, directory, 'manifest.json'),
    JSON.stringify(frozen, null, 2),
  );
  evidenceFiles[`${directory}/manifest.json`] = hash(
    await readFile(resolve(root, directory, 'manifest.json')),
  );
  for (let i = 0; i < (smoke ? 0 : 3); i++) {
    const order = i % 2 ? [true, false] : [false, true];
    const runs = [];
    for (const animated of order)
      runs.push(
        await capture(
          animated,
          `warmup-${i}-${animated ? 'animated' : 'static'}`,
        ),
      );
    warmups.push({
      index: i,
      order,
      samples: runs.map((r) => r.name),
      functionalFailures: runs.flatMap((r) => r.functionalFailures),
    });
    console.log(`warmup pair ${i + 1}/3 retained`);
  }
  const required = smoke ? 1 : 20;
  for (
    let attempt = 0;
    pairs.length < required && attempt < required + 3;
    attempt++
  ) {
    const order = pairs.length % 2 ? [true, false] : [false, true];
    try {
      const runs = [];
      for (const animated of order)
        runs.push(
          await capture(
            animated,
            `attempt-${attempt}-${animated ? 'animated' : 'static'}`,
          ),
        );
      const animated = runs.find((r) => r.animated),
        baseline = runs.find((r) => !r.animated);
      if (!animated || !baseline)
        throw new Error('Instrumentation failure: incomplete pair');
      const pair = comparePair(animated.analysis, baseline.analysis, limits);
      pairs.push(pair);
      attempts.push({
        attempt,
        valid: true,
        order,
        samples: runs.map((r) => r.name),
        ...pair,
        functionalFailures: runs.flatMap((r) => r.functionalFailures),
        cadence: animated.cadence,
        frameHealth: {
          animated: animated.frameHealth,
          static: baseline.frameHealth,
        },
        layout: { animated: animated.layout, static: baseline.layout },
        initialization: {
          animated: animated.analysis.phases.initialization,
          static: baseline.analysis.phases.initialization,
        },
        setup: {
          animated: animated.analysis.phases.setup,
          static: baseline.analysis.phases.setup,
        },
        teardown: {
          animated: animated.analysis.phases.teardown,
          static: baseline.analysis.phases.teardown,
        },
      });
      console.log(
        `valid pair ${pairs.length}/${required}: p95=${pair.p95.toFixed(3)}ms p99=${pair.p99.toFixed(3)}ms; >=50ms tasks=${pair.animatedLongTasks.length}`,
      );
    } catch (error) {
      const reason = String(error);
      const instrumentation =
        /Instrumentation|trace|Trace|Truncated|main-thread|Incomparable|Protocol error|Target.*closed|Browser.*closed|crash|Connection closed/.test(
          reason,
        );
      attempts.push({
        attempt,
        valid: false,
        order,
        reason,
        classification: instrumentation
          ? 'transport/browser/instrumentation failure; partial raw evidence retained'
          : 'unexpected harness/fixture defect: halt, not an eligible slow-run exclusion',
      });
      console.log(`invalid attempt ${attempt}: ${reason}`);
      if (!instrumentation) {
        fatal = reason;
        break;
      }
      if (!browser.isConnected()) break;
    }
  }
} catch (error) {
  fatal = String(error);
} finally {
  await browser?.close();
  server.kill();
  await server.exited;
}
const summary = pairs.length ? summarizePairs(pairs, limits, 20) : null;
const phaseTotals = Object.fromEntries(
  ['initialization', 'setup', 'teardown'].map((name) => [
    name,
    Object.fromEntries(
      ['animated', 'static'].map((side) => {
        const values = attempts
          .filter((a) => a.valid)
          .map(
            (a) =>
              (
                a[name] as Record<
                  string,
                  {
                    busyMs: number;
                    renderMs: number;
                    elapsedMs: number;
                    threadCpuLowerMs: number;
                    threadCpuUpperMs: number;
                  }
                >
              )[side],
          );
        const tail = (
          key:
            | 'busyMs'
            | 'renderMs'
            | 'elapsedMs'
            | 'threadCpuLowerMs'
            | 'threadCpuUpperMs',
        ) =>
          values.length
            ? nearestRank(
                values.map((v) => v?.[key] ?? 0),
                0.95,
              )
            : null;
        const target =
          name === 'initialization'
            ? profile === 'individual'
              ? 8
              : profile === 'normal'
                ? 40
                : 100
            : name === 'setup' && phase === 'handoff'
              ? 8
              : null;
        return [
          side,
          {
            samples: values.length,
            traceBusyP95Ms: tail('busyMs'),
            traceRenderP95Ms: tail('renderMs'),
            threadCpuLowerP95Ms: tail('threadCpuLowerMs'),
            threadCpuUpperP95Ms: tail('threadCpuUpperMs'),
            elapsedP95Ms: tail('elapsedMs'),
            targetMs: target,
            diagnosticProxyWithinTarget:
              target === null || tail('busyMs') === null
                ? null
                : (tail('busyMs') as number) <= target,
          },
        ];
      }),
    ),
  ]),
);
const report = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  directory,
  candidate,
  scene,
  family,
  profile,
  phase,
  artifactSha256: packed.sha256,
  baseCommit: packed.sourceCommit,
  inputs,
  smoke,
  calibration,
  warmups,
  attempts,
  summary,
  ...(catalogScene && pairs.length
    ? {
        wholeWork: wholeWorkSummary(pairs, limits),
        presentationCadence:
          'unverified: sparse native-effect observations and candidate command commits are not per-surface physical presentation evidence',
      }
    : {}),
  phaseTotals,
  fatal: fatal ?? null,
  protocolComplete:
    !smoke && !fatal && warmups.length === 3 && pairs.length === 20,
  collectionPass:
    !fatal &&
    pairs.length === (smoke ? 1 : 20) &&
    attempts.every(
      (a) => !a.valid || !(a.functionalFailures as string[]).length,
    ) &&
    warmups.every((a) => !(a.functionalFailures as string[]).length),
  qualification:
    'unverified: local headless diagnostic and wall-time trace estimates; no reference hardware or final renderer selection',
  evidenceFiles,
};
const reportPath = `${directory}/report.json`;
await writeFile(resolve(root, reportPath), JSON.stringify(report, null, 2));
await writeFile(
  resolve(
    root,
    `.artifacts/m2-${catalogScene ? `catalog-${candidate}-${profile}-${family}-` : ''}trace-latest-${phase}${smoke ? '-smoke' : ''}.json`,
  ),
  JSON.stringify(
    {
      report: reportPath,
      sha256: hash(await readFile(resolve(root, reportPath))),
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      report: reportPath,
      collectionPass: report.collectionPass,
      protocolComplete: report.protocolComplete,
      summary,
      fatal,
    },
    null,
    2,
  ),
);
if (!report.collectionPass) process.exitCode = 1;
