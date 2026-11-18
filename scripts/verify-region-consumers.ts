import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, firefox, webkit } from '@playwright/test';
import type { LoadingRegion } from '../packages/core/dist/region.js';

const packet = await Bun.file('.artifacts/packed-report.json').json();
const output = '.artifacts/m4-region-inline';
const core = resolve(packet.consumer, 'node_modules/@dotquilt-internal/core');
const { regionStyles } = await import(resolve(core, 'dist/styles.js'));
const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const hashes = regionStyles
  .map(
    (css: string) =>
      `'sha256-${createHash('sha256').update(css).digest('base64')}'`,
  )
  .join(' ');
const fixtures = [];
for (const key of ['regionRoot', 'region']) {
  const source = resolve(packet.consumer, `${key}-entry.ts`);
  const build = await Bun.build({
    entrypoints: [source],
    target: 'browser',
    format: 'esm',
    minify: true,
  });
  if (!build.success || !build.outputs[0]) throw Error(`Cannot build ${key}`);
  const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
  const gzip = gzipSync(bytes, { level: 9 }).length;
  if (gzip !== packet.sizes[key].gzip || gzip > packet.sizes[key].limit)
    throw Error(`Unmatched or over-budget Region ${key}`);
  const file = `${output}/${key}.js`;
  await Bun.write(file, bytes);
  fixtures.push({
    key,
    source,
    sourceSha256: hash(await Bun.file(source).bytes()),
    file,
    gzip,
    sha256: hash(bytes),
  });
}
const rows = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    for (const fixture of fixtures)
      for (const mode of ['inline', 'external']) {
        const context = await browser.newContext({
          reducedMotion: 'no-preference',
        });
        try {
          const page = await context.newPage();
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(String(error)));
          await page.addInitScript(() => {
            Reflect.set(window, 'regionCsp', []);
            document.addEventListener('securitypolicyviolation', (event) =>
              Reflect.get(window, 'regionCsp').push(event.violatedDirective),
            );
          });
          await context.route('**/*', async (route) => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/')
              await route.fulfill({
                contentType: 'text/html',
                headers: {
                  'content-security-policy': `default-src 'none';script-src 'self';style-src 'self' ${hashes};style-src-attr 'none';img-src data:;object-src 'none';base-uri 'none';require-trusted-types-for 'script'`,
                },
                body: `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private measured Region</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/app.css"><body><dotquilt-region id="subject" state="pending"${mode === 'external' ? ' data-dotquilt-style-href="/asset.css"' : ''}><span slot="placeholder">Loading</span><button id="content">Loaded</button></dotquilt-region><script type="module" src="/fixture.js"></script></body></html>`,
              });
            else if (path === '/fixture.js')
              await route.fulfill({
                contentType: 'text/javascript',
                body: await Bun.file(fixture.file).text(),
              });
            else if (path === '/asset.css')
              await route.fulfill({
                contentType: 'text/css',
                body: await Bun.file(resolve(core, 'dist/region.css')).text(),
              });
            else if (path === '/app.css')
              await route.fulfill({
                contentType: 'text/css',
                body: 'body{width:240px;font-size:16px}#subject{width:200px;min-height:24px}',
              });
            else await route.abort();
          });
          await page.goto('http://dotquilt.test/');
          await page.waitForFunction(
            () =>
              document
                .getElementById('subject')
                ?.getAttribute('data-presentation') === 'pending',
          );
          await page.waitForFunction(
            () =>
              document
                .getElementById('subject')
                ?.shadowRoot?.querySelector<HTMLStyleElement | HTMLLinkElement>(
                  'style,link',
                )?.sheet,
          );
          const initial = await page.locator('#subject').evaluate((element) => {
            const layer =
              element.shadowRoot?.querySelector<HTMLElement>('[part=content]');
            return {
              inert: layer?.inert,
              hidden: layer?.getAttribute('aria-hidden'),
              busy: layer?.getAttribute('aria-busy'),
              visible: element.getBoundingClientRect().height > 0,
              external: element.shadowRoot
                ?.querySelector('link')
                ?.getAttribute('href'),
            };
          });
          if (
            !initial.inert ||
            initial.hidden !== 'true' ||
            initial.busy !== 'true' ||
            !initial.visible ||
            (mode === 'external' && initial.external !== '/asset.css')
          )
            throw Error('Region pending contract failed');
          const release = await page
            .locator('#subject')
            .evaluate(async (element) => {
              const region = element as LoadingRegion;
              const content = region.querySelector('#content');
              region.update({ state: 'ready', timing: { duration: 600 } });
              while (region.presentation === 'pending')
                await new Promise<void>((resolve) =>
                  requestAnimationFrame(() => resolve()),
                );
              const effects = region.shadowRoot?.getAnimations() ?? [];
              const duration = effects[0]?.effect?.getTiming().duration;
              region.motion = 'paused';
              while (region.presentation !== 'ready')
                await new Promise<void>((resolve) =>
                  requestAnimationFrame(() => resolve()),
                );
              const layer =
                region.shadowRoot?.querySelector<HTMLElement>('[part=content]');
              const result = {
                duration,
                effects: effects.length,
                released: effects.every(
                  (effect) => effect.playState === 'idle',
                ),
                remaining: region.shadowRoot?.getAnimations().length,
                inert: layer?.inert,
                hidden: layer?.getAttribute('aria-hidden'),
                busy: layer?.getAttribute('aria-busy'),
                identity: content === region.querySelector('#content'),
              };
              region.remove();
              return result;
            });
          const violations = await page.evaluate(() =>
            Reflect.get(window, 'regionCsp'),
          );
          if (
            release.duration !== 600 ||
            release.effects !== 2 ||
            !release.released ||
            release.remaining ||
            release.inert ||
            release.hidden !== null ||
            release.busy !== 'false' ||
            !release.identity ||
            violations.length ||
            errors.length
          )
            throw Error(
              `Region handoff contract failed: ${JSON.stringify({ release, violations, errors })}`,
            );
          rows.push({
            browser: name,
            version: browser.version(),
            fixture: fixture.key,
            mode,
            result: 'pass',
            initial,
            release,
            violations,
            errors,
          });
        } finally {
          await context.close();
        }
      }
  } finally {
    await browser.close();
  }
}
await Bun.write(
  `${output}/evidence.json`,
  `${JSON.stringify(
    {
      coreSha256: packet.sha256,
      fixtures,
      rows,
      limits:
        'Bare inline Region limit only; complete external Region remains separately measured and held.',
      limitations:
        'Local current browsers; not floor, physical, manual AT or performance qualification.',
    },
    null,
    2,
  )}\n`,
);
console.log(`${rows.length} exact minified Region cells passed`);
