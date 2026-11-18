import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { completeExample } from '../apps/website/lib/example';

const root = resolve(import.meta.dir, '..');
const output = resolve(root, '.artifacts/m5-start/examples');
await mkdir(output, { recursive: true });
const freeze = await Bun.file(
  resolve(root, 'docs/implementation/m5/runtime-freeze.json'),
).json();
async function verifyFreeze() {
  for (const [path, expected] of Object.entries(freeze.files))
    if (
      createHash('sha256')
        .update(await readFile(resolve(root, path)))
        .digest('hex') !== expected
    )
      throw new Error(`Frozen runtime changed: ${path}`);
}
await verifyFreeze();
const results = [];
for (const integration of ['native', 'react'] as const) {
  const directory = resolve(output, integration);
  for (const [file, content] of Object.entries(
    completeExample({ integration, lines: 3 }),
  )) {
    const path = resolve(directory, file);
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, content);
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
      throw new Error('Frozen artifact changed');
    const name = artifact.path.split('/').at(-1);
    if (!name) throw new Error('Missing artifact name');
    await cp(artifact.path, resolve(directory, 'vendor', name));
  }
  for (const args of [
    ['bun', 'install', '--ignore-scripts'],
    ['bun', 'run', 'build'],
    [
      resolve(root, 'node_modules/.bin/tsc'),
      '--noEmit',
      '--ignoreConfig',
      '--strict',
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
      `src/main.${integration === 'react' ? 'tsx' : 'ts'}`,
    ],
  ]) {
    const task = Bun.spawn(args, {
      cwd: directory,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(task.stdout).text(),
      new Response(task.stderr).text(),
      task.exited,
    ]);
    await writeFile(
      resolve(
        directory,
        args.includes('install')
          ? 'install.log'
          : args.includes('build')
            ? 'build.log'
            : 'types.log',
      ),
      stdout + stderr,
    );
    if (exitCode)
      throw new Error(
        `${integration}: ${args.join(' ')} failed\n${stdout}${stderr}`,
      );
  }
  const server = Bun.spawn(['bun', 'run', 'serve.ts'], {
    cwd: directory,
    stdout: 'ignore',
    stderr: 'pipe',
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto('http://127.0.0.1:4211', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Start loading' }).click();
    await page.locator('dotquilt-region[state=pending]').waitFor();
    await page.getByRole('button', { name: 'Pause motion' }).click();
    await page.locator('dotquilt-region[motion=paused]').waitFor();
    await page.getByRole('button', { name: 'Reveal content' }).click();
    await page.locator('dotquilt-region[state=ready]').waitFor();
    if (
      !(await page
        .getByText('Loading should feel', { exact: false })
        .isVisible()) ||
      errors.length
    )
      throw new Error(
        `${integration}: content/errors ${JSON.stringify(errors)}`,
      );
    const context = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await context.newPage();
    await staticPage.goto('http://127.0.0.1:4211');
    if (
      !(await staticPage
        .getByText('Loading should feel', { exact: false })
        .isVisible())
    )
      throw new Error(`${integration}: missing no-JS content`);
    await context.close();
    results.push({
      integration,
      compile: 'pass',
      types: 'pass',
      loadingPauseReveal: 'pass',
      noJavaScript: 'pass',
      errors,
    });
  } finally {
    await browser.close();
    server.kill();
    await server.exited;
  }
}
await verifyFreeze();
await writeFile(
  resolve(output, 'results.json'),
  `${JSON.stringify({ artifacts: freeze.artifacts, results, frozenFiles: Object.keys(freeze.files).length }, null, 2)}\n`,
);
console.log(
  'Both complete examples compile, typecheck and run from the frozen tarballs; runtime unchanged.',
);
