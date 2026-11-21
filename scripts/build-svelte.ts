import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeWrapperStyles } from './wrapper-css.js';

// svelte-package ships the components as .svelte sources with types, the
// way Svelte libraries do; the app's own Svelte compiles them.
const cwd = resolve(import.meta.dir, '../packages/svelte');
await rm(resolve(cwd, 'dist'), { recursive: true, force: true });
const packager = Bun.spawn(
  ['bun', 'x', '--no-install', 'svelte-package', '-i', 'src', '-o', 'dist'],
  { cwd, stdout: 'inherit', stderr: 'inherit' },
);
if (await packager.exited) throw new Error('Svelte build failed');
await writeWrapperStyles(resolve(cwd, 'dist'));
