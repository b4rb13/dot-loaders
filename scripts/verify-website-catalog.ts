import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import {
  catalog,
  catalogDefaults,
  requireComponent,
} from '../apps/website/lib/catalog';
import { catalogFiles } from '../apps/website/lib/catalog-files';
import type { CatalogSettings } from '../apps/website/lib/catalog-model';
import { fieldsFor, isRecipeKey } from '../apps/website/lib/catalog-options';

const root = resolve(import.meta.dir, '..');
const output = resolve(root, '.artifacts/m5-options/final-examples');
await mkdir(output, { recursive: true });
const freeze = await Bun.file(
  resolve(root, 'docs/implementation/m5/runtime-freeze.json'),
).json();
async function checkFreeze() {
  for (const [path, hash] of Object.entries(freeze.files))
    if (
      createHash('sha256')
        .update(await readFile(resolve(root, path)))
        .digest('hex') !== hash
    )
      throw new Error(`Frozen runtime changed: ${path}`);
}
await checkFreeze();
const sourcePaths = {
  'src/lib/catalog-options.ts': 'lib/catalog-options.ts',
  'src/lib/catalog-authoring.ts': 'lib/catalog-authoring.ts',
  'src/lib/catalog-model.ts': 'lib/catalog-model.ts',
  'src/lib/catalog-recipes.ts': 'lib/catalog-recipes.ts',
  'src/lib/catalog-geometry.ts': 'lib/catalog-geometry.ts',
  'src/components/catalog-scene.tsx': 'components/catalog-scene.tsx',
  'public/catalog.css': 'app/catalog.css',
};
const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(sourcePaths).map(async ([destination, source]) => [
      destination,
      await readFile(resolve(root, 'apps/website', source), 'utf8'),
    ]),
  ),
);
const profiles: CatalogSettings[] = [];
for (const item of catalog)
  for (const integration of ['native', 'react'] as const)
    profiles.push({ ...catalogDefaults(item.slug), integration });
for (const integration of ['native', 'react'] as const) {
  for (const variant of ['bar', 'scatter'] as const)
    profiles.push({
      ...catalogDefaults('chart-loader'),
      integration,
      variant,
      idle: 'scan',
      reveal: 'morphWipe',
    });
  profiles.push({
    ...catalogDefaults('text-loader'),
    integration,
    idle: 'scrambleCharacters',
    reveal: 'lock',
  });
  profiles.push({
    ...catalogDefaults('text-loader'),
    integration,
    idle: 'scrambleWords',
    reveal: 'printText',
  });
  profiles.push({
    ...catalogDefaults('table-loader'),
    integration,
    idle: 'tableShimmer',
    reveal: 'rows',
    rows: 3,
  });
}
const results = [];
for (const integration of ['native', 'react'] as const) {
  for (const component of [
    'text-loader',
    'chart-loader',
    'table-loader',
    'skeleton-block',
    'loading-region',
    'typing-dots',
  ] as const) {
    profiles.push({
      ...catalogDefaults(component),
      integration,
      mode: 'preset',
    });
    if (component !== 'typing-dots')
      profiles.push({
        ...catalogDefaults(component),
        integration,
        mode: 'custom',
        options:
          component === 'loading-region'
            ? { customReveal: { duration: 380, liftPx: 4 } }
            : {
                customIdle: { periodMs: 1400, minimumOpacity: 0.5 },
                customReveal: { duration: 380, liftPx: 4 },
              },
      });
  }
  for (const [component, idle, reveal] of [
    ['text-loader', 'scrambleCharacters', 'lock'],
    ['chart-loader', 'cycle', 'morphWipe'],
    ['table-loader', 'tableShimmer', 'rows'],
    ['skeleton-block', 'pulse', 'dissolve'],
  ] as const) {
    const item = requireComponent(component);
    const options = Object.fromEntries(
      [...item.idles, ...item.reveals]
        .filter((key): key is Exclude<typeof key, 'default'> =>
          isRecipeKey(key),
        )
        .map((key) => [
          key,
          Object.fromEntries(
            Object.entries(fieldsFor(key)).map(([field, spec]) => [
              field,
              spec.kind === 'number' ? spec.max : spec.values.at(-1),
            ]),
          ),
        ]),
    );
    profiles.push({
      ...catalogDefaults(component),
      integration,
      idle,
      reveal,
      options,
      duration: '300',
    });
  }
}
const browser = await chromium.launch();
try {
  for (const [index, settings] of profiles.entries()) {
    const directory = resolve(
      output,
      `${String(index + 1).padStart(2, '0')}-${settings.component}-${settings.integration}-${settings.variant}`,
    );
    await mkdir(directory, { recursive: true });
    const files = catalogFiles(settings, sources);
    for (const [path, content] of Object.entries(files)) {
      const target = resolve(directory, path);
      await mkdir(resolve(target, '..'), { recursive: true });
      await writeFile(target, content);
    }
    await mkdir(resolve(directory, 'vendor'), { recursive: true });
    for (const artifact of Object.values(freeze.artifacts) as {
      path: string;
      sha256: string;
    }[]) {
      if (
        createHash('sha256')
          .update(await readFile(artifact.path))
          .digest('hex') !== artifact.sha256
      )
        throw new Error('Frozen tarball changed');
      await cp(
        artifact.path,
        resolve(
          directory,
          'vendor',
          artifact.path.split('/').at(-1) ?? 'missing.tgz',
        ),
      );
    }
    for (const [label, args] of [
      ['install', ['bun', 'install', '--ignore-scripts']],
      ['build', ['bun', 'run', 'build']],
      [
        'types',
        [
          resolve(root, 'node_modules/.bin/tsc'),
          '--noEmit',
          '--ignoreConfig',
          '--strict',
          '--exactOptionalPropertyTypes',
          '--skipLibCheck',
          '--target',
          'ES2022',
          '--module',
          'ESNext',
          '--moduleResolution',
          'Bundler',
          '--jsx',
          'react-jsx',
          '--esModuleInterop',
          `src/main.${settings.integration === 'react' ? 'tsx' : 'ts'}`,
        ],
      ],
    ] as const) {
      const task = Bun.spawn([...args], {
        cwd: directory,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const [stdout, stderr, code] = await Promise.all([
        new Response(task.stdout).text(),
        new Response(task.stderr).text(),
        task.exited,
      ]);
      await writeFile(resolve(directory, `${label}.log`), stdout + stderr);
      if (code)
        throw new Error(
          `${index + 1} ${settings.component}/${settings.integration} ${label}: ${stdout}${stderr}`,
        );
    }
    const server = Bun.spawn(['bun', 'run', 'serve.ts'], {
      cwd: directory,
      stdout: 'ignore',
      stderr: 'pipe',
    });
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    try {
      let loaded = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          await page.goto('http://127.0.0.1:4213');
          loaded = true;
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      if (!loaded) throw new Error('Example server did not become ready');
      const owner = page
        .locator(
          settings.component === 'text-loader'
            ? 'dotquilt-text-loader'
            : 'dotquilt-region',
        )
        .first();
      await expect(owner).toHaveAttribute('state', 'ready');
      await page
        .getByRole('button', { name: 'Start loading', exact: true })
        .click();
      await expect(owner).toHaveAttribute('state', 'pending');
      await page
        .getByRole('button', { name: 'Reveal content', exact: true })
        .click();
      await expect(owner).toHaveAttribute('data-presentation', 'ready');
      await page
        .getByRole('button', { name: 'Refresh content', exact: true })
        .click();
      await expect(owner).toHaveAttribute('state', 'refreshing');
      await page
        .getByRole('button', { name: 'Pause motion', exact: true })
        .click();
      await expect(owner).toHaveAttribute('motion', 'paused');
      await page
        .getByRole('button', { name: 'Cancel request', exact: true })
        .click();
      await expect(owner).toHaveAttribute('state', 'ready');
      const context = await browser.newContext({ javaScriptEnabled: false });
      const staticPage = await context.newPage();
      await staticPage.goto('http://127.0.0.1:4213');
      await expect(staticPage.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(staticPage.getByText(/Enable JavaScript/)).toBeVisible();
      await context.close();
      if (errors.length) throw new Error(errors.join('\n'));
      results.push({
        settings,
        files: Object.keys(files),
        compile: 'pass',
        types: 'pass',
        loadingRefreshPauseRevealCancel: 'pass',
        noJavaScript: 'pass',
        errors,
      });
      await writeFile(
        resolve(output, 'results.json'),
        `${JSON.stringify({ profiles: profiles.length, results, frozenFiles: 303, artifacts: freeze.artifacts }, null, 2)}\n`,
      );
      console.log(
        `${index + 1}/${profiles.length} ${settings.component}/${settings.integration}/${settings.variant}: pass`,
      );
    } finally {
      await page.close();
      server.kill();
      await server.exited;
    }
  }
} finally {
  await browser.close();
}
await checkFreeze();
console.log('All complete catalog examples passed; frozen runtime unchanged.');
