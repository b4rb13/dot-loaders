import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..'),
  line = process.argv[2] === 'floor' ? 'floor' : 'current';
const report = await Bun.file(
  resolve(root, '.artifacts/m3/next-consumers.json'),
).json();
const packed = await Bun.file(
  resolve(root, '.artifacts/m3/packed-react-report.json'),
).json();
if (
  report.result !== 'pass' ||
  report.reactSha256 !== packed.sha256 ||
  report.nativeSha256 !== packed.native.sha256
)
  throw new Error('Next consumer evidence is stale');
const task = Bun.spawn(
  [
    'node',
    'node_modules/next/dist/bin/next',
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    line === 'floor' ? '4193' : '4192',
  ],
  {
    cwd: report.consumers[line],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdout: 'inherit',
    stderr: 'inherit',
  },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => task.kill(signal));
process.exitCode = await task.exited;
