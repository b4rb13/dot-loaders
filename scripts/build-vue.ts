import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeWrapperStyles } from './wrapper-css.js';

const cwd = resolve(import.meta.dir, '../packages/vue');
await rm(resolve(cwd, 'dist'), { recursive: true, force: true });
await mkdir(resolve(cwd, 'dist'), { recursive: true });
const compiler = Bun.spawn(
  [
    'bun',
    'x',
    '--no-install',
    'tsc',
    '-p',
    'tsconfig.json',
    '--emitDeclarationOnly',
    'false',
  ],
  { cwd, stdout: 'inherit', stderr: 'inherit' },
);
if (await compiler.exited) throw new Error('Vue build failed');
await writeWrapperStyles(resolve(cwd, 'dist'));
