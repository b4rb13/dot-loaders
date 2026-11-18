import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, firefox, webkit } from '@playwright/test';

// Execute the exact installed size fixtures, without adding exports or setup.
const packet = await Bun.file('.artifacts/m4/packed-report.json').json();
const output = '.artifacts/m4-primitives';
const core = resolve(packet.consumer, 'node_modules/@dotquilt-internal/core');
const { skeletonStyles } = await import(resolve(core, 'dist/styles.js'));
const { typingStyles } = await import(resolve(core, 'dist/catalog-styles.js'));
const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const hashes = [skeletonStyles, typingStyles]
  .flat()
  .map(
    (css: string) =>
      `'sha256-${createHash('sha256').update(css).digest('base64')}'`,
  )
  .join(' ');
const fixtures = [];
for (const family of ['block', 'typing'])
  for (const entry of ['root', 'family']) {
    const key = `${family}-${entry}-native`;
    const source = resolve(packet.consumer, `${key}.ts`);
    const build = await Bun.build({
      entrypoints: [source],
      target: 'browser',
      format: 'esm',
      minify: true,
    });
    if (!build.success || !build.outputs[0])
      throw Error(`Cannot compile ${key}`);
    const bytes = new Uint8Array(await build.outputs[0].arrayBuffer());
    const gzip = gzipSync(bytes, { level: 9 }).length;
    if (gzip !== packet.sizes[key].gzip)
      throw Error(`Unmatched size fixture ${key}`);
    const file = `${output}/${key}.js`;
    await Bun.write(file, bytes);
    fixtures.push({
      family,
      key,
      file,
      gzip,
      sha256: hash(bytes),
      source,
      sourceSha256: hash(await Bun.file(source).bytes()),
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
          const tag =
            fixture.family === 'block'
              ? 'dotquilt-skeleton-block'
              : 'dotquilt-typing-dots';
          const asset = fixture.family === 'block' ? 'skeleton' : 'typing';
          const page = await context.newPage();
          const failures: string[] = [];
          page.on('pageerror', (error) => failures.push(String(error)));
          await page.addInitScript(() => {
            Reflect.set(window, 'primitiveCsp', []);
            document.addEventListener('securitypolicyviolation', (event) => {
              if (
                /^(style|script|require-trusted-types)/.test(
                  event.violatedDirective,
                )
              )
                Reflect.get(window, 'primitiveCsp').push(
                  event.violatedDirective,
                );
            });
          });
          await context.route('**/*', async (route) => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/')
              await route.fulfill({
                contentType: 'text/html',
                headers: {
                  'content-security-policy': `default-src 'none';script-src 'self';style-src 'self' ${hashes};style-src-attr 'none';object-src 'none';base-uri 'none';require-trusted-types-for 'script'`,
                },
                body: `<!doctype html><html lang="en"><meta charset="utf-8"><title>Private measured primitive</title><link rel="stylesheet" href="/app.css"><body><${tag} id="subject"${mode === 'external' ? ` data-dotquilt-style-href="/asset.css"` : ''}></${tag}><script type="module" src="/fixture.js"></script></body></html>`,
              });
            else if (path === '/fixture.js')
              await route.fulfill({
                contentType: 'text/javascript',
                body: await Bun.file(fixture.file).text(),
              });
            else if (path === '/asset.css')
              await route.fulfill({
                contentType: 'text/css',
                body: await Bun.file(resolve(core, `dist/${asset}.css`)).text(),
              });
            else if (path === '/app.css')
              await route.fulfill({
                contentType: 'text/css',
                body: 'body{width:240px;font-size:16px}#subject{width:200px;height:20px}',
              });
            else await route.abort();
          });
          await page.goto('http://dotquilt.test/');
          await page.waitForFunction(() =>
            document.getElementById('subject')?.hasAttribute('data-moving'),
          );
          await page.waitForFunction(
            () =>
              document
                .getElementById('subject')
                ?.shadowRoot?.querySelector<HTMLLinkElement | HTMLStyleElement>(
                  'style,link',
                )?.sheet,
          );
          const initial = await page.locator('#subject').evaluate((element) => {
            const root = element.shadowRoot;
            return {
              hidden: element.getAttribute('aria-hidden'),
              effects: root?.getAnimations().length ?? 0,
              external: root?.querySelector('link')?.getAttribute('href'),
              visible: element.getBoundingClientRect().height > 0,
              surfaceWidth:
                root?.querySelector('.surface,.dot')?.getBoundingClientRect()
                  .width ?? 0,
              violations: Reflect.get(window, 'primitiveCsp') as string[],
            };
          });
          if (
            initial.hidden !== 'true' ||
            !initial.effects ||
            !initial.visible ||
            !initial.surfaceWidth ||
            initial.violations.length ||
            (mode === 'external' && initial.external !== '/asset.css')
          )
            throw Error(`Missing decoration ${fixture.key}/${name}/${mode}`);
          await page
            .locator('#subject')
            .evaluate((element) => Reflect.set(element, 'motion', 'paused'));
          await page.waitForFunction(
            () =>
              !document.getElementById('subject')?.hasAttribute('data-moving'),
          );
          const pausedEffects = await page
            .locator('#subject')
            .evaluate(
              (element) => element.shadowRoot?.getAnimations().length ?? 0,
            );
          if (pausedEffects)
            throw Error(`Pause retained effects ${fixture.key}`);
          await page
            .locator('#subject')
            .evaluate((element) => Reflect.set(element, 'motion', 'system'));
          await page.waitForFunction(() =>
            document.getElementById('subject')?.hasAttribute('data-moving'),
          );
          const released = await page
            .locator('#subject')
            .evaluate((element) => {
              const effects = element.shadowRoot?.getAnimations() ?? [];
              element.remove();
              return (
                effects.length > 0 &&
                effects.every((effect) => effect.playState === 'idle')
              );
            });
          if (!released || failures.length)
            throw Error(`Primitive cleanup failed ${fixture.key}: ${failures}`);
          rows.push({
            browser: name,
            version: browser.version(),
            fixture: fixture.key,
            mode,
            result: 'pass',
            ...initial,
            pausedEffects,
            released,
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
      artifacts: packet.artifacts,
      fixtures,
      rows,
      assertions:
        'exact measured minified payload; CSP inline/external boot, visible decorative output, running effects, pause and disconnection',
      limitations:
        'local current browsers; not browser-floor, physical, manual AT or timing qualification',
    },
    null,
    2,
  )}\n`,
);
console.log(`${rows.length} exact minified primitive cells passed`);
