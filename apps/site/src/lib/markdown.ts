import type { CollectionEntry } from 'astro:content';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * A docs page as plain Markdown, for people and agents that read it without
 * a browser (`/docs/….md`, `/llms-full.txt`). The MDX is kept as written,
 * except outside code fences:
 * - module imports and exports go;
 * - live previews go (they are demos, and the code tabs show the same);
 * - `<Code code={file} …/>` becomes a fenced block holding that file;
 * - code tabs become a bold label before each block.
 */
export function pageMarkdown(entry: CollectionEntry<'docs'>): string {
  const source = entry.body ?? '';
  const folder = entry.filePath
    ? dirname(resolve(process.cwd(), entry.filePath))
    : process.cwd();
  // `import name from './file?raw'`: the files the code tabs show.
  const files = new Map<string, string>();
  for (const [, name, path] of source.matchAll(
    /^import\s+(\w+)\s+from\s+['"](.+?)\?raw['"];?\s*$/gm,
  ))
    if (name && path)
      try {
        files.set(name, readFileSync(resolve(folder, path), 'utf8').trimEnd());
      } catch {
        // A missing file leaves its block out rather than failing the build.
      }

  const out: string[] = [];
  let fenced = false,
    preview = false;
  for (const line of source.split('\n')) {
    if (/^\s*(```|~~~)/.test(line) && !preview) {
      fenced = !fenced;
      out.push(line);
      continue;
    }
    if (fenced) {
      out.push(line);
      continue;
    }
    if (preview) {
      if (line.includes('</Preview>')) preview = false;
      continue;
    }
    const trimmed = line.trim();
    // MDX's module block: imports, exports and their comments.
    if (/^(import|export)\s/.test(trimmed) || trimmed.startsWith('// '))
      continue;
    if (trimmed.startsWith('<Preview')) {
      preview = !trimmed.includes('</Preview>') && !trimmed.endsWith('/>');
      continue;
    }
    const tab = trimmed.match(/^<TabItem\s+label=["']([^"']+)["']/);
    if (tab) {
      out.push('', `**${tab[1]}**`, '');
      continue;
    }
    const code = trimmed.match(
      /^<Code\s+code=\{(\w+)(?:\.replaceAll\((["'])(.*?)\2,\s*(["'])(.*?)\4\))?\}\s+lang=["'](\w+)["'](?:\s+title=["']([^"']+)["'])?\s*\/>$/,
    );
    if (code) {
      const [, name = '', , from, , to, lang = '', title] = code;
      let text = files.get(name);
      if (text === undefined) continue;
      if (from !== undefined && to !== undefined)
        text = text.replaceAll(from, to);
      out.push(`\`\`\`${lang}${title ? ` title="${title}"` : ''}`, text, '```');
      continue;
    }
    // Any other component tag on its own line (tabs, layout wrappers).
    if (/^<\/?[A-Z][\w.]*(\s[^>]*)?\/?>$/.test(trimmed)) continue;
    out.push(line);
  }
  const { title, description } = entry.data;
  return `# ${title}\n\n${description ? `> ${description}\n\n` : ''}${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

/** The page's address, and its Markdown copy's: `docs/x` → `/docs/x/`, `/docs/x.md`. */
export const pagePath = (id: string) => (id === 'index' ? '/' : `/${id}/`);
export const markdownPath = (id: string) =>
  id === 'index' ? '/index.md' : `/${id}.md`;
