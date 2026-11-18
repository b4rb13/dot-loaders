import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const root = resolve(import.meta.dir, '..');
const directory = resolve(root, '.artifacts/m4-multi-rich/media');
await mkdir(directory, { recursive: true });
const server = Bun.spawn(['bun', 'tests/shared-wrapper/server.ts'], {
  cwd: root,
  stdout: Bun.file(resolve(directory, 'server.log')),
  stderr: 'pipe',
});
const rows = [];
try {
  let available = false;
  for (let i = 0; i < 100; i++) {
    try {
      available = (await fetch('http://127.0.0.1:4202/favicon.svg')).ok;
    } catch {}
    if (available) break;
    await Bun.sleep(50);
  }
  if (!available) throw new Error('Capture fixture unavailable');
  for (const [name, engine] of [
    ['chromium', chromium],
    ['firefox', firefox],
    ['webkit', webkit],
  ] as const) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
        viewport: { width: 1100, height: 1600 },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
        recordVideo: { dir: directory, size: { width: 550, height: 800 } },
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.addInitScript(() => {
        Reflect.set(window, 'captureCSP', []);
        document.addEventListener('securitypolicyviolation', (e) =>
          Reflect.get(window, 'captureCSP').push(e.violatedDirective),
        );
      });
      await page.goto('http://127.0.0.1:4202/native?family=region&second=1');
      await page.waitForFunction(() => !!window.shared);
      // WebKit's screenshot helper injects an inline body{} stylesheet to sync
      // animations. Keep strict CSP intact and use its real-time recording.
      if (name !== 'webkit')
        await page.screenshot({
          path: resolve(directory, `${name}-pending.png`),
          caret: 'initial',
        });
      await page.evaluate(() =>
        window.shared.patch('owner', { state: 'ready', timing: undefined }),
      );
      await page.waitForFunction(
        () =>
          document
            .getElementById('owner')
            ?.getAttribute('data-presentation') === 'handoff',
      );
      await page.waitForTimeout(300);
      if (name !== 'webkit')
        await page.screenshot({
          path: resolve(directory, `${name}-handoff.png`),
          caret: 'initial',
        });
      await page.waitForFunction(
        () =>
          document
            .getElementById('owner')
            ?.getAttribute('data-presentation') === 'ready',
      );
      if (name !== 'webkit')
        await page.screenshot({
          path: resolve(directory, `${name}-ready.png`),
          caret: 'initial',
        });
      const observation = await page.evaluate(() => ({
        calls: window.shared.calls,
        events: window.shared.events,
        diagnostics: window.shared.errors,
        identity: window.shared.identity(),
        csp: Reflect.get(window, 'captureCSP'),
      }));
      if (
        errors.length ||
        observation.csp.length ||
        observation.diagnostics.length ||
        !observation.identity ||
        observation.calls.chart !== 1 ||
        observation.calls.table !== 1 ||
        observation.calls.table2 !== 1 ||
        observation.events.length !== 2
      )
        throw new Error(
          `Real-time capture failed: ${name} ${JSON.stringify({ errors, observation })}`,
        );
      const video = await page.video()?.path();
      await page.evaluate(() => window.shared.remove());
      await context.close();
      rows.push({
        name,
        browser: browser.version(),
        screenshots: name === 'webkit' ? 0 : 3,
        video,
        ...observation,
        review:
          'unreviewed by owner; functional mock-content scene, not fidelity/reference qualification',
      });
    } finally {
      await browser.close();
    }
  }
} finally {
  server.kill();
  await server.exited;
}
const files: Record<string, string> = {};
for await (const file of new Bun.Glob('*.{png,webm}').scan({
  cwd: directory,
  onlyFiles: true,
}))
  files[file] = createHash('sha256')
    .update(await readFile(resolve(directory, file)))
    .digest('hex');
await writeFile(
  resolve(directory, 'captures.json'),
  `${JSON.stringify(
    {
      artifacts: (
        await Bun.file(resolve(root, '.artifacts/m4/packed-report.json')).json()
      ).artifacts,
      clock: 'real wall time; no virtual clock or forced animation finish',
      viewport: [1100, 1600],
      dpr: 1,
      rows,
      files,
    },
    null,
    2,
  )}\n`,
);
console.log(
  'Recorded three real-time multi-rich handoffs and six screenshots; WebKit uses video to preserve strict CSP. Owner review remains open.',
);
