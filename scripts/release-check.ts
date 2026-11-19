// A release dry run: what `changeset version` and `npm publish` would do,
// without changing or publishing anything. Run after `bun run build`.
//   bun run release:check
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const packages = ['packages/core', 'packages/react'];

async function run(command: string[], cwd = root) {
  const child = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0)
    throw new Error(`${command.join(' ')} failed (${code}):\n${err || out}`);
  return out;
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
const blockers: string[] = [];

console.log('Planned versions (changeset status):');
console.log(
  (await run(['bunx', '--no-install', 'changeset', 'status', '--verbose']))
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => `  ${line}`)
    .join('\n'),
);

for (const directory of packages) {
  const manifest = JSON.parse(
    await readFile(resolve(root, directory, 'package.json'), 'utf8'),
  ) as {
    name: string;
    version: string;
    private?: boolean;
    publishConfig?: { access?: string };
  };
  const [pack] = JSON.parse(
    await run(
      ['npm', 'pack', '--dry-run', '--json', '--ignore-scripts'],
      resolve(root, directory),
    ),
  ) as {
    filename: string;
    size: number;
    unpackedSize: number;
    entryCount: number;
  }[];
  if (!pack) throw new Error(`npm pack returned nothing for ${directory}`);
  console.log(
    `\n${manifest.name}@${manifest.version}: ${pack.entryCount} files, ${kb(pack.size)} packed, ${kb(pack.unpackedSize)} unpacked (${pack.filename})`,
  );
  if (manifest.private) blockers.push(`${manifest.name} is "private": true.`);
  if (manifest.name.startsWith('@dotquilt-internal/'))
    blockers.push(`${manifest.name} has the provisional name.`);
  if (manifest.publishConfig?.access !== 'public')
    blockers.push(
      `${manifest.name} publishes with access "${manifest.publishConfig?.access}", not "public".`,
    );
}

console.log(
  blockers.length
    ? `\nNot publishable yet (by design until the owner decides):\n${blockers.map((b) => `  - ${b}`).join('\n')}`
    : '\nNo publishing blockers.',
);
