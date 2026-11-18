import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m3');
const packed = await Bun.file(
  resolve(output, 'packed-react-report.json'),
).json();
if (packed.result !== 'pass')
  throw new Error('Packed adapter must pass before Next integration');
const hash = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex');
for (const artifact of [packed, packed.native])
  if (hash(await readFile(artifact.artifact)) !== artifact.sha256)
    throw new Error('Artifact changed');
const versions = {
  current: {
    next: '16.4.2',
    react: '19.3.1',
    typesReact: '19.3.0',
    typesDom: '19.3.0',
    typescript: '7.0.2',
  },
  floor: {
    next: '16.0.11',
    react: '19.0.9',
    typesReact: '19.0.14',
    typesDom: '19.0.6',
    typescript: '5.7.3',
  },
};
const consumers: Record<string, string> = {},
  checks: { line: string; command: string; exitCode: number }[] = [];
for (const [line, versionsForLine] of Object.entries(versions)) {
  const directory = await mkdtemp(resolve(tmpdir(), `dotquilt-next-${line}-`));
  consumers[line] = directory;
  await cp(resolve(root, 'tests/fixtures/m3-next'), directory, {
    recursive: true,
  });
  await cp(
    resolve(root, 'tests/react/catalog.tsx'),
    resolve(directory, 'app/catalog.tsx'),
  );
  await mkdir(resolve(directory, 'public/dotquilt'), { recursive: true });
  for (const family of [
    'skeleton',
    'region',
    'line',
    'circle',
    'skeleton-text',
    'typing',
    'text',
    'chart',
    'table',
  ])
    await cp(
      resolve(root, `packages/react/dist/${family}.css`),
      resolve(directory, `public/dotquilt/${family}.css`),
    );
  await writeFile(
    resolve(directory, 'package.json'),
    JSON.stringify(
      {
        name: `dotquilt-next-${line}-consumer`,
        version: '0.0.0',
        private: true,
        type: 'module',
        scripts: { build: 'next build', start: 'next start' },
        dependencies: {
          '@dotquilt-internal/core': `file:${packed.native.artifact}`,
          '@dotquilt-internal/react': `file:${packed.artifact}`,
          next: versionsForLine.next,
          react: versionsForLine.react,
          'react-dom': versionsForLine.react,
        },
        devDependencies: {
          '@types/node': '24.0.0',
          '@types/react': versionsForLine.typesReact,
          '@types/react-dom': versionsForLine.typesDom,
          typescript: versionsForLine.typescript,
        },
      },
      null,
      2,
    ),
  );
  for (const args of [
    ['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund'],
    ['node', 'node_modules/next/dist/bin/next', 'build'],
  ]) {
    const task = Bun.spawn(args, {
      cwd: directory,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: '1',
        npm_config_cache: resolve(root, '.artifacts/npm-cache'),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr] = await Promise.all([
      new Response(task.stdout).text(),
      new Response(task.stderr).text(),
    ]);
    const exitCode = await task.exited;
    checks.push({ line, command: args.join(' '), exitCode });
    await writeFile(
      resolve(
        output,
        `next-${line}-${args[0] === 'npm' ? 'install' : 'build'}.log`,
      ),
      `${stdout}\n${stderr}`,
    );
    if (exitCode) {
      await writeFile(
        resolve(output, 'next-prepare-failure.json'),
        JSON.stringify({ versions, consumers, checks }, null, 2),
      );
      throw new Error(`Next ${line} ${args[0]} failed; log retained`);
    }
  }
}
const sources: Record<string, string> = {};
for await (const file of new Bun.Glob('**/*').scan({
  cwd: resolve(root, 'tests/fixtures/m3-next'),
  onlyFiles: true,
}))
  sources[`tests/fixtures/m3-next/${file}`] = hash(
    await readFile(resolve(root, 'tests/fixtures/m3-next', file)),
  );
const report = {
  recordedAt: new Date().toISOString(),
  nativeSha256: packed.native.sha256,
  reactSha256: packed.sha256,
  versions,
  consumers,
  checks,
  sources,
  result: 'pass',
  method:
    'Independent production Next App Router builds from installed exact private tarballs. No workspace aliases or source transpilation.',
};
await writeFile(
  resolve(output, 'next-consumers.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
