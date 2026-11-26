// The framework packages as a consumer gets them: packs dotquilt,
// @dotquilt/vue, @dotquilt/svelte and @dotquilt/angular, installs the
// tarballs with npm into fresh copies of examples/nuxt, examples/sveltekit
// and examples/angular outside the repo, builds each one (type checks
// included), then serves it and checks that the server HTML holds the
// placeholders.
//
//   bun run scripts/verify-frameworks.ts      (run `bun run build` first)
//
// Angular 22's tools need Node 24.15 or later on the PATH.
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { packResults } from './npm-pack.js';

const root = resolve(import.meta.dir, '..');
const work = await mkdtemp(resolve(tmpdir(), 'dotquilt-frameworks-'));
const packs = resolve(work, 'packs');
await mkdir(packs);

async function run(command: string[], cwd: string, env = {}) {
  const child = Bun.spawn(command, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, ...env },
  });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0)
    throw new Error(`${command.join(' ')} failed in ${cwd}:\n${err || out}`);
  return out;
}

// One tarball per package, from the workspace build.
const tarballs: Record<string, string> = {};
for (const dir of ['core', 'vue', 'svelte', 'angular']) {
  const [pack] = packResults<{ name: string; filename: string }>(
    await run(
      [
        'npm',
        'pack',
        '--json',
        '--ignore-scripts',
        '--pack-destination',
        packs,
      ],
      resolve(root, 'packages', dir),
    ),
  );
  if (!pack) throw new Error(`npm pack printed nothing for ${dir}`);
  tarballs[pack.name] = `file:${resolve(packs, pack.filename)}`;
}

const apps = [
  { name: 'nuxt', port: 4381, package: '@dotquilt/vue' },
  { name: 'sveltekit', port: 4382, package: '@dotquilt/svelte' },
  { name: 'angular', port: 4383, package: '@dotquilt/angular' },
];
const skip = new Set([
  'node_modules',
  '.nuxt',
  '.output',
  '.svelte-kit',
  'build',
  'dist',
  '.angular',
]);

const failures: string[] = [];
for (const app of apps) {
  const dir = resolve(work, app.name);
  try {
    await cp(resolve(root, 'examples', app.name), dir, {
      recursive: true,
      filter: (source) =>
        !source
          .slice(resolve(root, 'examples', app.name).length)
          .split('/')
          .some((part) => skip.has(part)),
    });
    // The tarballs in place of the workspace links, and for the framework
    // package's own dotquilt dependency too.
    const manifest = await Bun.file(resolve(dir, 'package.json')).json();
    for (const name of Object.keys(manifest.dependencies))
      if (tarballs[name]) manifest.dependencies[name] = tarballs[name];
    manifest.overrides = { dotquilt: tarballs.dotquilt };
    await writeFile(
      resolve(dir, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await run(['npm', 'install', '--no-audit', '--no-fund'], dir);
    const installed = await readdir(
      resolve(dir, 'node_modules', ...app.package.split('/'), 'dist'),
    );
    if (!installed.length) throw new Error(`${app.package} has no dist`);
    await run(['npm', 'run', 'build'], dir, {
      NUXT_TELEMETRY_DISABLED: '1',
      NG_CLI_ANALYTICS: 'false',
    });
    // Serve it on a spare port and read the first HTML.
    const start = (manifest.scripts.start as string).replace(
      /PORT=\d+/,
      `PORT=${app.port}`,
    );
    const server = Bun.spawn(['sh', '-c', start], {
      cwd: dir,
      stdout: 'ignore',
      stderr: 'ignore',
    });
    try {
      let html = '';
      for (let i = 0; i < 50 && !html; i++) {
        await Bun.sleep(200);
        html = await fetch(`http://127.0.0.1:${app.port}/`)
          .then((r) => (r.ok ? r.text() : ''))
          .catch(() => '');
      }
      for (const expected of [
        /<dotquilt-region[^>]*state="pending"/,
        /data-dotquilt-static/,
        /:is\(:not\(:defined\),:state\(unstyled\)\)/,
      ])
        if (!expected.test(html))
          throw new Error(`${app.name}: the server HTML lacks ${expected}`);
    } finally {
      server.kill();
    }
    console.log(`${app.name}: built from the tarballs, placeholders served`);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}
await rm(work, { recursive: true, force: true });
if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}
