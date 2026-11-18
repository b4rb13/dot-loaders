import { cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  output = resolve(root, '.artifacts/m4'),
  consumer = (await readFile(resolve(output, 'consumer-path'), 'utf8')).trim();
for (const file of ['api.ts', 'client.ts', 'react.tsx'])
  await cp(
    resolve(root, 'tests/table', file),
    resolve(consumer, `table-${file}`),
  );
for (const [file, name] of [
  ['client.ts', 'table'],
  ['react.tsx', 'table-react'],
] as const) {
  const path = resolve(consumer, `table-${file}`),
    source = (await readFile(path, 'utf8')).replace(
      "'./api.js'",
      "'./table-api.js'",
    );
  await writeFile(path, source);
  const b = await Bun.build({
    entrypoints: [path],
    minify: true,
    target: 'browser',
    format: 'esm',
  });
  if (!b.success || !b.outputs[0]) throw new Error(String(b.logs));
  await writeFile(
    resolve(output, `${name}.js`),
    new Uint8Array(await b.outputs[0].arrayBuffer()),
  );
}
console.log('Packed TableLoader native/React consumers prepared');
