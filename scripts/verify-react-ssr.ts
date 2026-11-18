import { createHash } from 'node:crypto';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m3');
const packed = await Bun.file(
  resolve(output, 'packed-react-report.json'),
).json();
if (packed.result !== 'pass')
  throw new Error('Packed React gate must pass first');
const consumer = packed.consumers.current;
const source = resolve(root, 'tests/react/ssr-budget.mjs');
await cp(source, resolve(consumer, 'ssr-budget.mjs'));
const results: Record<string, unknown> = {};
let pass = true;
for (const runtime of ['node', 'bun']) {
  const task = Bun.spawn([runtime, 'ssr-budget.mjs'], {
    cwd: consumer,
    env: process.env,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(task.stdout).text(),
    new Response(task.stderr).text(),
  ]);
  if (await task.exited)
    throw new Error(`${runtime} SSR budget probe failed: ${stderr}`);
  const result = JSON.parse(stdout);
  const coldImports: Record<string, unknown> = {};
  for (const entry of [
    '@dotquilt-internal/react/server',
    '@dotquilt-internal/react',
    'react-dom/server',
  ]) {
    await writeFile(
      resolve(consumer, 'cold-import.mjs'),
      `const start = performance.now(); await import(${JSON.stringify(entry)}); console.log(JSON.stringify({moduleEvaluationMs:performance.now()-start,windowAbsent:typeof window==='undefined',documentAbsent:typeof document==='undefined'}));`,
    );
    const cold = Bun.spawn([runtime, 'cold-import.mjs'], {
      cwd: consumer,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [text, error] = await Promise.all([
      new Response(cold.stdout).text(),
      new Response(cold.stderr).text(),
    ]);
    if (await cold.exited)
      throw new Error(`Cold import failed: ${entry} ${error}`);
    coldImports[entry] = JSON.parse(text);
  }
  results[runtime] = {
    ...result,
    coldImports,
    coldImportMethod:
      'One fresh process per entry; dynamic import elapsed time excludes process startup. Diagnostic observations, not a reference-device percentile or release timing pass.',
  };
  pass &&= result.pass;
}
const nodeStreaming: Record<string, unknown> = {};
for (const [line, directory] of Object.entries(packed.consumers) as [
  string,
  string,
][]) {
  await cp(
    resolve(root, 'tests/react/ssr-node.mjs'),
    resolve(directory, 'ssr-node.mjs'),
  );
  const stream = Bun.spawn(['node', 'ssr-node.mjs'], {
    cwd: directory,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(stream.stdout).text(),
    new Response(stream.stderr).text(),
  ]);
  if (await stream.exited)
    throw new Error(`Node ${line} streaming failed: ${stderr}`);
  const result = JSON.parse(stdout);
  pass &&= result.pass;
  nodeStreaming[line] = result;
}
const report = {
  recordedAt: new Date().toISOString(),
  nativeSha256: packed.native.sha256,
  reactSha256: packed.sha256,
  sourceSha256: createHash('sha256')
    .update(await readFile(source))
    .digest('hex'),
  method:
    'Actual React SSR output from installed tarballs, matched application content, 24 surfaces and six regions; every repeated style/link/nonce/wrapper retained in document gzip. Unique required external stylesheet responses counted once on cold style cache. Raw non-style markup excludes complete stylesheet elements and matched application markup; host metadata/nonce and all library wrappers still count. The earlier conservative CSS-text-only total is also reported for maximum input. No stylesheet/link/nonce bytes are removed from whole-document gzip accounting.',
  limits: {
    primitive: 1024,
    region: 2048,
    maximum: 16384,
    additionalGzip: 8192,
  },
  results,
  nodeStreaming,
  nodeStreamingSourceSha256: createHash('sha256')
    .update(await readFile(resolve(root, 'tests/react/ssr-node.mjs')))
    .digest('hex'),
  result: pass ? 'pass' : 'fail',
  qualification:
    'Output gates are local artifact evidence. Warm SSR samples are local observations; required reference-device time remains unverified. Next/framework transport is recorded separately.',
};
await writeFile(
  resolve(output, 'ssr-output.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (!pass) process.exitCode = 1;
