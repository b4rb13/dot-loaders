import { createHash } from 'node:crypto';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m4-react-catalog');
await mkdir(output, { recursive: true });
const packed = await Bun.file(
  resolve(root, '.artifacts/m3/packed-react-report.json'),
).json();
const hash = async (path: string) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
for (const artifact of [packed, packed.native])
  if ((await hash(artifact.artifact)) !== artifact.sha256)
    throw Error('Changed packed artifact');
const sourceSha256 = await hash(resolve(root, 'tests/react/catalog-ssr.mjs'));
const rows = [],
  rawOutputs: { path: string; sha256: string }[] = [];
for (const [line, directory] of Object.entries(packed.consumers) as [
  string,
  string,
][]) {
  await cp(
    resolve(root, 'tests/react/catalog-ssr.mjs'),
    resolve(directory, 'catalog-ssr.mjs'),
  );
  for (const runtime of ['node', 'bun']) {
    const p = Bun.spawn([runtime, 'catalog-ssr.mjs'], {
      cwd: directory,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr] = await Promise.all([
      new Response(p.stdout).text(),
      new Response(p.stderr).text(),
    ]);
    await Bun.write(
      resolve(output, `ssr-${line}-${runtime}.log`),
      stdout + stderr,
    );
    if (await p.exited)
      throw Error(`${line}/${runtime} SSR functional failure; log retained`);
    await cp(
      resolve(directory, `catalog-ssr-output-${runtime}.json`),
      resolve(output, `ssr-output-${line}-${runtime}.json`),
    );
    const path = `.artifacts/m4-react-catalog/ssr-output-${line}-${runtime}.json`;
    rawOutputs.push({ path, sha256: await hash(resolve(root, path)) });
    rows.push({ line, runtimeName: runtime, ...JSON.parse(stdout) });
  }
}
const result = {
  recordedAt: new Date().toISOString(),
  artifacts: { core: packed.native.sha256, react: packed.sha256 },
  rows,
  sourceSha256,
  rawOutputs,
  functionalPass: rows.every((r) => r.functionalPass),
  numericPass: rows.every((r) => r.numericPass),
};
await Bun.write(
  resolve(output, 'ssr.json'),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    functionalPass: result.functionalPass,
    numericPass: result.numericPass,
    rows: rows.length,
  }),
);
if (!result.numericPass) process.exitCode = 1;
