import 'server-only';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cache } from 'react';
import {
  type IntegrationExample,
  integrationExamples,
} from './integration-guides';

export const integrationSources = cache(async (name: IntegrationExample) => {
  if (!Object.hasOwn(integrationExamples, name))
    throw new Error('Unknown example');
  const directory = resolve(process.cwd(), 'content/examples', name);
  const files: Record<string, string> = {};
  async function visit(relative: string) {
    for (const entry of (
      await readdir(resolve(directory, relative), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile())
        files[path] = await readFile(resolve(directory, path), 'utf8');
    }
  }
  await visit('');
  return files;
});
