import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { integrationExamples } from '../apps/website/lib/integration-guides';

const root = resolve(import.meta.dir, '..');
const output = resolve(root, '.artifacts/m5-semantic-guides');
const freeze = await Bun.file(
  resolve(root, 'docs/implementation/m5/runtime-freeze.json'),
).json();
const hash = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
async function verifyFreeze() {
  for (const [path, expected] of Object.entries(freeze.files))
    if (hash(await readFile(resolve(root, path))) !== expected)
      throw new Error(`Frozen file changed: ${path}`);
  for (const artifact of Object.values(freeze.artifacts) as {
    path: string;
    sha256: string;
  }[])
    if (hash(await readFile(artifact.path)) !== artifact.sha256)
      throw new Error('Frozen artifact changed');
}
await mkdir(output, { recursive: true });
await verifyFreeze();
const consumers: Record<string, string> = {};
const files: { example: string; path: string; sha256: string }[] = [];
const checks: { example: string; command: string[]; exitCode: number }[] = [];
for (const name of Object.keys(integrationExamples)) {
  const source = resolve(root, 'apps/website/content/examples', name);
  const directory = resolve(output, 'consumers', name);
  consumers[name] = directory;
  await mkdir(directory, { recursive: true });
  await cp(source, directory, { recursive: true });
  async function record(relative: string) {
    for (const entry of await readdir(resolve(source, relative), {
      withFileTypes: true,
    })) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await record(path);
      else if (entry.isFile()) {
        const digest = hash(await readFile(resolve(source, path)));
        if (digest !== hash(await readFile(resolve(directory, path))))
          throw new Error('Example copy differs');
        files.push({ example: name, path, sha256: digest });
      }
    }
  }
  await record('');
  await mkdir(resolve(directory, 'vendor'), { recursive: true });
  for (const artifact of Object.values(freeze.artifacts) as { path: string }[])
    await cp(
      artifact.path,
      resolve(directory, 'vendor', basename(artifact.path)),
    );
  for (const command of [
    ['bun', 'install', '--ignore-scripts'],
    ['bun', 'run', 'build'],
    ['bun', 'run', 'check'],
  ]) {
    const task = Bun.spawn(command, {
      cwd: directory,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(task.stdout).text(),
      new Response(task.stderr).text(),
      task.exited,
    ]);
    checks.push({ example: name, command, exitCode });
    await writeFile(
      resolve(output, `${name}-${command.at(-1)}.log`),
      `${stdout}\n${stderr}`,
    );
    if (exitCode)
      throw new Error(`${name} ${command.join(' ')} failed; see retained log`);
  }
  const installed = resolve(directory, 'node_modules/@dotquilt-internal');
  for (const family of ['core', 'react']) {
    const manifest = JSON.parse(
      await readFile(resolve(installed, family, 'package.json'), 'utf8'),
    );
    if (manifest.version !== '0.0.0-m2.0' || manifest.private !== true)
      throw new Error('Wrong/private artifact');
    const target = resolve(root, 'packages', family, 'dist');
    for await (const path of new Bun.Glob('**/*').scan({
      cwd: target,
      onlyFiles: true,
    }))
      if (
        hash(await readFile(resolve(target, path))) !==
        hash(await readFile(resolve(installed, family, 'dist', path)))
      )
        throw new Error(`Installed artifact differs: ${family}/${path}`);
  }
}
const react = consumers['react-ssr'];
if (!react) throw new Error('Missing React consumer');
for (const runtime of ['bun', 'node']) {
  for (const pending of [false, true]) {
    const command = [
      runtime,
      'native-static.ts',
      ...(pending ? ['pending'] : []),
    ];
    const task = Bun.spawn(command, {
      cwd: react,
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
        output,
        `native-static-${runtime}-${pending ? 'pending' : 'ready'}.html`,
      ),
      stdout,
    );
    if (
      exitCode ||
      !stdout.includes('data-dotquilt-static') ||
      !stdout.includes(
        pending ? ' hidden inert aria-hidden="true"' : '<article>',
      )
    )
      throw new Error(`DOM-free native example failed: ${stderr}`);
    checks.push({ example: 'native-static', command, exitCode });
  }
}
await verifyFreeze();
await writeFile(
  resolve(output, 'examples.json'),
  `${JSON.stringify(
    {
      status: 'PASS',
      recordedAt: new Date().toISOString(),
      scope:
        'Independent complete guide apps installed from exact frozen tarballs; current pinned Bun/Node/React/Next only; native static fragment on Bun/Node; no publication or environment qualification',
      consumers,
      checks,
      files,
      freezeFiles: Object.keys(freeze.files).length,
      artifacts: freeze.artifacts,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `Built/typechecked ${Object.keys(consumers).length} private apps; ${files.length} displayed source files match; native static fragment passes on Bun/Node; freeze unchanged`,
);
