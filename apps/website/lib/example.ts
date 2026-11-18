export const previewVersion = '0.0.0-m2.0';
export type ExampleSettings = Readonly<{
  integration: 'react' | 'native';
  lines: number;
}>;
export const defaults: ExampleSettings = { integration: 'react', lines: 3 };
export const sample =
  'Loading should feel like part of the interface. Reserve the space, keep readiness explicit, and let useful content arrive without a jump.';

export function parseSettings(search: string): {
  settings: ExampleSettings;
  notice: string;
} {
  const invalid = {
    settings: defaults,
    notice: 'This link has unsupported settings. The default example is shown.',
  };
  if (search.length > 512) return invalid;
  const query = new URLSearchParams(search);
  if (!query.size) return { settings: defaults, notice: '' };
  const allowed = new Set(['schema', 'version', 'integration', 'lines']);
  for (const key of query.keys())
    if (!allowed.has(key) || query.getAll(key).length !== 1) return invalid;
  if (query.get('schema') !== '1' || query.get('version') !== previewVersion)
    return {
      settings: defaults,
      notice: `This link targets a different schema or package. Showing private preview ${previewVersion}.`,
    };
  const integration = query.get('integration');
  const lines = query.get('lines');
  if (
    (integration !== 'react' && integration !== 'native') ||
    !lines ||
    !/^[1-5]$/.test(lines)
  )
    return invalid;
  return { settings: { integration, lines: Number(lines) }, notice: '' };
}

export function settingsQuery(settings: ExampleSettings) {
  return new URLSearchParams({
    schema: '1',
    version: previewVersion,
    integration: settings.integration,
    lines: String(settings.lines),
  }).toString();
}

export function componentCode({ integration, lines }: ExampleSettings): string {
  if (integration === 'react')
    return `'use client';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { SkeletonText } from '@dotquilt-internal/react/skeleton';

// The application supplies state, cycle and real content.
<LoadingRegion state={state} cycle={cycle} motion={paused ? 'paused' : 'system'}
  stylePolicy={{ mode: 'external', href: '/dotquilt/region.css' }}
  placeholder={<SkeletonText lines={${lines}}
    stylePolicy={{ mode: 'external', href: '/dotquilt/skeleton-text.css' }} />}>
  <p>${sample}</p>
</LoadingRegion>`;
  return `import { registerLoadingRegion } from '@dotquilt-internal/core/region';
import { registerSkeletonText } from '@dotquilt-internal/core/skeleton';

// Set request-local CSS policy before definition/connection.
const region = document.querySelector('dotquilt-region')!;
const skeleton = document.querySelector('dotquilt-skeleton-text')!;
region.stylePolicy = { mode: 'external', href: '/dotquilt/region.css' };
skeleton.stylePolicy = { mode: 'external', href: '/dotquilt/skeleton-text.css' };
registerLoadingRegion();
registerSkeletonText();
skeleton.lines = ${lines};
region.update({ state: 'pending', cycle: 'request-1' });
// After application data is ready, keeping the same content nodes:
region.update({ state: 'ready', cycle: 'request-1' });`;
}

/** All exported files are application-owned; no website helper is needed. */
export function completeExample(
  settings: ExampleSettings,
): Record<string, string> {
  const react = settings.integration === 'react';
  const extension = react ? 'tsx' : 'ts';
  const main = react
    ? `'use client';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { SkeletonText } from '@dotquilt-internal/react/skeleton';
function Example() {
  const [state, setState] = useState<'pending' | 'ready'>('ready');
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  return <>
    <h1>A quieter loading state</h1>
    <button onClick={() => { setCycle(cycle + 1); setState('pending'); }}>Start loading</button>
    <button onClick={() => setState('ready')}>Reveal content</button>
    <button aria-pressed={paused} onClick={() => setPaused(!paused)}>Pause motion</button>
    <LoadingRegion state={state} cycle={String(cycle)} motion={paused ? 'paused' : 'system'}
      stylePolicy={{mode:'external',href:'/dotquilt/region.css'}}
      placeholder={<SkeletonText lines={${settings.lines}} stylePolicy={{mode:'external',href:'/dotquilt/skeleton-text.css'}} />}>
      <p>${sample}</p>
    </LoadingRegion>
  </>;
}
createRoot(document.getElementById('example')!).render(<Example />);
`
    : `import { registerLoadingRegion } from '@dotquilt-internal/core/region';
import { registerSkeletonText } from '@dotquilt-internal/core/skeleton';
const region = document.querySelector('dotquilt-region')!;
const skeleton = document.querySelector('dotquilt-skeleton-text')!;
region.stylePolicy = {mode:'external',href:'/dotquilt/region.css'};
skeleton.stylePolicy = {mode:'external',href:'/dotquilt/skeleton-text.css'};
registerLoadingRegion();
registerSkeletonText();
skeleton.lines = ${settings.lines};
let cycle = 0;
document.getElementById('start')!.addEventListener('click', () => region.update({state:'pending',cycle:String(++cycle)}));
document.getElementById('reveal')!.addEventListener('click', () => region.update({state:'ready',cycle:String(cycle)}));
document.getElementById('pause')!.addEventListener('click', event => {
  const button = event.currentTarget as HTMLButtonElement;
  const paused = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed',String(paused));
  region.motion = paused ? 'paused' : 'system';
});
`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dotquilt private example</title><link rel="stylesheet" href="/example.css"></head>
<body>${
    react
      ? `<div id="example"><h1>A quieter loading state</h1><p>${sample}</p></div>`
      : `<h1>A quieter loading state</h1>
<button id="start">Start loading</button><button id="reveal">Reveal content</button><button id="pause" aria-pressed="false">Pause motion</button>
<dotquilt-region state="ready"><dotquilt-skeleton-text slot="placeholder" lines="${settings.lines}"></dotquilt-skeleton-text><p>${sample}</p></dotquilt-region>`
  }
<noscript><p>The example stays readable without JavaScript. Loading controls require JavaScript.</p></noscript>
<script type="module" src="/main.js"></script></body></html>`;
  return {
    'README.md': `# Dotquilt private ${settings.integration} example\n\nExact private package version: ${previewVersion}. Not published to npm.\n\nPlace the reviewed frozen tarballs in vendor/ (names in package.json). Then run bun install, bun run build and bun run start. Open http://127.0.0.1:4211. Keep vendor/ private. Node/Bun bundling and these CSS assets are required; do not import raw TypeScript in a browser. The application owns the loading buttons and cycle; no data fetch is simulated. For server-rendered pending markup, use the separately documented /server renderStatic integration rather than assuming these client-only files implement SSR.\n`,
    'package.json': JSON.stringify(
      {
        name: 'dotquilt-private-example',
        private: true,
        type: 'module',
        scripts: {
          build: `bun build ./src/main.${extension} --outdir public --target browser && bun run styles.ts`,
          start: 'bun run serve.ts',
        },
        overrides: {
          '@dotquilt-internal/core':
            'file:./vendor/dotquilt-internal-core-0.0.0-m2.0.tgz',
        },
        dependencies: {
          '@dotquilt-internal/core':
            'file:./vendor/dotquilt-internal-core-0.0.0-m2.0.tgz',
          ...(react
            ? {
                '@dotquilt-internal/react':
                  'file:./vendor/dotquilt-internal-react-0.0.0-m2.0.tgz',
                react: '19.3.1',
                'react-dom': '19.3.1',
              }
            : {}),
        },
      },
      null,
      2,
    ),
    'public/index.html': html,
    'public/example.css': `body{margin:3rem auto;padding:0 1rem;max-width:40rem;font:1rem/1.6 system-ui;color:#20271f;background:#f7f7f2}button{font:inherit;margin:0 .5rem 1rem 0;padding:.5rem}dotquilt-region{display:block;min-height:8rem}dotquilt-region:not(:defined)>[slot=placeholder]{display:none}`,
    [`src/main.${extension}`]: main,
    'styles.ts': `import {mkdir,copyFile} from 'node:fs/promises';\nawait mkdir('public/dotquilt',{recursive:true});\nfor(const family of ['region','skeleton-text']) await copyFile(Bun.resolveSync('@dotquilt-internal/${react ? 'react' : 'core'}/styles/'+family+'.css',import.meta.dir),'public/dotquilt/'+family+'.css');\n`,
    'serve.ts': `const assets = new Set(['/index.html','/main.js','/example.css','/dotquilt/region.css','/dotquilt/skeleton-text.css']);\nBun.serve({hostname:'127.0.0.1',port:4211,async fetch(request){const path=new URL(request.url).pathname;const asset=path==='/'?'/index.html':path;if(!assets.has(asset)) return new Response('Not found',{status:404});const file=Bun.file(import.meta.dir+'/public'+asset);return await file.exists()?new Response(file):new Response('Not found',{status:404});}});\n`,
  };
}
