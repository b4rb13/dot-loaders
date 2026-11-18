import { catalog, requireComponent } from './catalog';
import type { CatalogSettings } from './catalog-model';
import { previewVersion } from './example';
export type ExampleSources = Readonly<Record<string, string>>;
const registration: Record<CatalogSettings['component'], string> = {
  'text-loader': 'TextLoader',
  'chart-loader': 'ChartLoader',
  'table-loader': 'TableLoader',
  'skeleton-block': 'SkeletonBlock',
  'skeleton-line': 'SkeletonLine',
  'skeleton-circle': 'SkeletonCircle',
  'skeleton-text': 'SkeletonText',
  'typing-dots': 'TypingDots',
  'loading-region': 'LoadingRegion',
};
export function catalogExcerpt(s: CatalogSettings) {
  const model = requireComponent(s.component);
  return s.integration === 'react'
    ? `import { ${model.name} } from '@dotquilt-internal/react/${model.entry}';\n${model.family === 'text' ? `<TextLoader state={state} cycle={cycle} motion={motion}\n  animations={textRecipes(settings)} stylePolicy={external('text')}>\n  {textSamples[settings.sample]}\n</TextLoader>` : `<LoadingRegion state={state} cycle={cycle} motion={motion}\n  placeholder={<${model.name === 'LoadingRegion' ? 'SkeletonText' : model.name} ${model.family === 'chart' ? 'variant={settings.variant} targetProvider={chartProvider} ' : model.family === 'table' ? 'targetProvider={tableProvider} rows={settings.rows} ' : ''}stylePolicy={external('${asset(s.component)}')} />}\n  stylePolicy={external('region')}>\n  {/* Your real content stays mounted here. */}\n</LoadingRegion>`}\n// Complete files below include the application state, recipes,\n// providers, target registration and external CSS setup.`
    : `import { register${registration[s.component]} } from '@dotquilt-internal/core/${model.entry}';\n// Configure properties/CSS before explicit registration.\nregister${registration[s.component]}();\nconst owner = document.querySelector('${model.family === 'text' ? model.tag : 'dotquilt-region'}')!;\nowner.update({ state: 'pending', cycle: 'request-1' });\n// After the application's current outcome is ready:\nowner.update({ state: 'ready', cycle: 'request-1' });\n// Complete files include markup, providers, recipes and controls.`;
}
export function asset(component: CatalogSettings['component']) {
  return component === 'loading-region'
    ? 'skeleton-text'
    : component === 'skeleton-block'
      ? 'skeleton'
      : component === 'skeleton-line'
        ? 'line'
        : component === 'skeleton-circle'
          ? 'circle'
          : component === 'typing-dots'
            ? 'typing'
            : component === 'text-loader'
              ? 'text'
              : component === 'chart-loader'
                ? 'chart'
                : component === 'table-loader'
                  ? 'table'
                  : 'skeleton-text';
}
function nativeContent(s: CatalogSettings) {
  if (s.component === 'chart-loader')
    return `<svg class="catalog-chart" id="chart" viewBox="0 0 320 180" preserveAspectRatio="none" role="img" aria-label="Illustrative ${s.variant} chart"></svg>`;
  if (s.component === 'table-loader')
    return `<table id="table" class="catalog-table"><caption>Illustrative project data</caption><thead><tr><th scope="col">Project</th><th scope="col">Items</th></tr></thead><tbody>${[
      'Canvas',
      'Grid',
      'Chart',
      'Table',
      'Text',
    ]
      .slice(0, s.rows)
      .map((name, i) => `<tr><td>${name}</td><td>${i * 4}</td></tr>`)
      .join('')}</tbody></table>`;
  return '<article data-testid="catalog-content"><h3>Your content stays here.</h3><p>A real application node, kept in place through loading, refreshing and reveal. The data in this example is illustrative.</p></article>';
}
function nativeMain(s: CatalogSettings) {
  const model = requireComponent(s.component);
  const name = registration[s.component];
  const text = model.family === 'text';
  const imports = new Map<string, Set<string>>();
  function use(entry: string, value: string) {
    if (!imports.has(entry)) imports.set(entry, new Set());
    imports.get(entry)?.add(value);
  }
  use(model.entry, `register${name}`);
  if (!text) {
    use('region', 'registerLoadingRegion');
    use('typing', 'registerTypingDots');
    if (model.family === 'region') use('skeleton', 'registerSkeletonText');
  }
  return `${Array.from(imports, ([entry, names]) => `import { ${[...names].join(', ')} } from '@dotquilt-internal/core/${entry}';`).join('\n')}
import { textSamples } from './lib/catalog-model';
import { localPresets, customAnimations } from './lib/catalog-authoring';
import type { CatalogSettings } from './lib/catalog-model';
import { textRecipes, chartRecipes, tableRecipes, skeletonRecipes } from './lib/catalog-recipes';
import { projectChart, projectTable } from './lib/catalog-geometry';
const settings:CatalogSettings = ${JSON.stringify(s, null, 2)};
document.querySelector('[data-enhancement-note]')?.remove();
for(const button of document.querySelectorAll('button'))button.disabled=false;
const owner=document.querySelector('${text ? 'dotquilt-text-loader' : 'dotquilt-region'}')!;
const placeholder=document.querySelector('${model.family === 'region' ? 'dotquilt-skeleton-text' : model.tag}')!;
owner.stylePolicy={mode:'external',href:'/dotquilt/${text ? 'text' : 'region'}.css'};
placeholder.stylePolicy={mode:'external',href:'/dotquilt/${asset(s.component)}.css'};
${
  text
    ? `placeholder.textContent=textSamples[settings.sample];placeholder.mask='LOADING YOUR CONTENT';placeholder.animations=textRecipes(settings);placeholder.pointerResponse=settings.pointer;placeholder.speed=settings.speed==='auto'?undefined:settings.speed;`
    : model.family === 'chart'
      ? `placeholder.variant=settings.variant;placeholder.animations=chartRecipes(settings);placeholder.pointerResponse=settings.pointer;placeholder.speed=settings.speed==='auto'?undefined:settings.speed;placeholder.targetProvider=bounds=>projectChart(bounds,settings.variant);
const svg=document.getElementById('chart')!;const geometry=projectChart({width:320,height:180},settings.variant);
const add=(tag:string,attrs:Record<string,string>)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);svg.append(node);};
if(geometry.kind==='line')add('path',{d:geometry.points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' '),fill:'none',stroke:'currentColor','stroke-width':'2'});
else if(geometry.kind==='bar')for(const b of geometry.bars)add('rect',{x:String(b.x),y:String(b.y),width:String(b.width),height:String(b.height),fill:'currentColor'});
else for(const p of geometry.points)add('circle',{cx:String(p.x),cy:String(p.y),r:'4',fill:'currentColor'});`
      : model.family === 'table'
        ? `placeholder.rows=settings.rows;placeholder.rowHeight=34;placeholder.columns=[{kind:'text',width:2},{kind:'number'}];placeholder.animations=tableRecipes(settings);placeholder.pointerResponse=settings.pointer;placeholder.speed=settings.speed==='auto'?undefined:settings.speed;
const table=document.querySelector('table')!;placeholder.targetProvider=()=>projectTable(table,placeholder);owner.revealTargets=Array.from(table.tBodies[0]?.rows??[],(element,i)=>({id:'row-'+i,element}));`
        : model.family === 'typing'
          ? `placeholder.count=settings.count;placeholder.speed=settings.speed==='auto'?undefined:settings.speed;`
          : `placeholder.animations=skeletonRecipes(settings.component==='loading-region'?{...settings,mode:'direct'}:settings);placeholder.speed=settings.speed==='auto'?undefined:settings.speed;placeholder.pointerResponse=settings.pointer;${s.component === 'skeleton-text' || model.family === 'region' ? 'placeholder.lines=settings.lines;' : ''}`
}
${text ? `placeholder.preset=settings.mode==='preset'?localPresets.text:undefined;` : model.family === 'region' ? `owner.preset=settings.mode==='preset'?localPresets.region:undefined;owner.animations=settings.mode==='custom'?{handoff:customAnimations.region.handoff(settings.options.customReveal)}:undefined;` : `placeholder.preset=settings.mode==='preset'?localPresets.${model.family}:undefined;`}
${!text ? `const indicator=document.querySelector<import('@dotquilt-internal/core/typing').TypingDots>('dotquilt-typing-dots[slot="refresh-indicator"]')!;indicator.stylePolicy={mode:'external',href:'/dotquilt/typing.css'};` : ''}
${Array.from(imports.values())
  .flatMap((names) => [...names])
  .map((name) => `${name}();`)
  .join('\n')}
let cycle=0;let paused=false;
const timing=()=>settings.duration==='auto'?undefined:{duration:Number(settings.duration)};
const status=document.getElementById('status')!;
function settle(message:string){owner.update({state:'ready',timing:{duration:0}});status.textContent=message;}
document.getElementById('start')!.addEventListener('click',()=>{owner.update({state:'pending',cycle:String(++cycle),timing:timing()});status.textContent='Pending';});
document.getElementById('refresh')!.addEventListener('click',()=>{owner.update({state:'refreshing',cycle:String(++cycle),timing:timing()});status.textContent='Refreshing; current content stays available.';});
document.getElementById('reveal')!.addEventListener('click',()=>{owner.update({state:'ready'});status.textContent='Ready';});
document.getElementById('cancel')!.addEventListener('click',()=>settle('Request cancelled; current content retained.'));
document.getElementById('fail')!.addEventListener('click',()=>settle('Request failed; showing current content.'));
document.getElementById('measure')!.addEventListener('click',()=>owner.refresh());
document.getElementById('pause')!.addEventListener('click',event=>{paused=!paused;(event.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(paused));owner.motion=paused?'paused':'system';});
`;
}
export function catalogFiles(
  s: CatalogSettings,
  sources: ExampleSources,
): Record<string, string> {
  const react = s.integration === 'react';
  const model = requireComponent(s.component);
  const text = model.family === 'text';
  const main = react
    ? `'use client';
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { LoadingState } from '@dotquilt-internal/core';
import { CatalogScene, type SceneHandle } from './components/catalog-scene';
import type { CatalogSettings } from './lib/catalog-model';
const settings:CatalogSettings=${JSON.stringify(s, null, 2)};
function Example(){
 const [state,setState]=useState<LoadingState>('ready');const [cycle,setCycle]=useState(0);const [paused,setPaused]=useState(false);const [outcome,setOutcome]=useState('');const scene=useRef<SceneHandle>(null);
 return <><h1>${model.name} example</h1><div className="preview-controls">
 <button onClick={()=>{setOutcome('');setCycle(n=>n+1);setState('pending');}}>Start loading</button>
 <button onClick={()=>{setOutcome('');setCycle(n=>n+1);setState('refreshing');}}>Refresh content</button>
 <button onClick={()=>setState('ready')}>Reveal content</button>
 <button onClick={()=>{setOutcome('Request cancelled; current content retained.');setState('ready');}}>Cancel request</button>
 <button onClick={()=>{setOutcome('Request failed; showing current content.');setState('ready');}}>Simulate failure</button>
 <button onClick={()=>scene.current?.refresh()}>Refresh measurements</button>
 <button aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>Pause motion</button></div>
 <div className="catalog-preview"><CatalogScene ref={scene} settings={settings} state={state} cycle={String(cycle)} motion={paused?'paused':'system'} immediate={Boolean(outcome)}/></div><p role="status">{outcome||state}</p></>;
}
document.querySelector('[data-enhancement-note]')?.remove();
createRoot(document.getElementById('example')!).render(<Example/>);
`
    : nativeMain(s);
  const placeholderTag =
    model.family === 'region' ? 'dotquilt-skeleton-text' : model.tag;
  const native = text
    ? `<dotquilt-text-loader class="catalog-text" state="ready">${s.sample === 'zero' ? '0' : s.sample === 'international' ? 'こんにちは世界' : 'DOTS BECOME WORDS'}</dotquilt-text-loader>`
    : `<dotquilt-region class="catalog-region catalog-${s.component}" state="ready"><${placeholderTag} class="${s.component === 'chart-loader' ? 'catalog-chart' : s.component === 'table-loader' ? 'catalog-table-loader' : s.component === 'skeleton-circle' ? 'catalog-circle' : s.component === 'skeleton-line' ? 'catalog-line' : s.component === 'skeleton-block' ? 'catalog-block' : ''}" slot="placeholder"></${placeholderTag}><dotquilt-typing-dots slot="refresh-indicator"></dotquilt-typing-dots>${nativeContent(s)}</dotquilt-region>`;
  const controls = [
    'start|Start loading',
    'refresh|Refresh content',
    'reveal|Reveal content',
    'cancel|Cancel request',
    'fail|Simulate failure',
    'measure|Refresh measurements',
    'pause|Pause motion',
  ]
    .map((pair) => {
      const [id, label] = pair.split('|');
      return `<button disabled id="${id}"${id === 'pause' ? ' aria-pressed="false"' : ''}>${label}</button>`;
    })
    .join('');
  const files: Record<string, string> = {
    'README.md': `# ${model.name} — private ${s.integration} example\n\nVersion ${previewVersion}; not published to npm. Place the exact reviewed core/React tarballs in vendor/, then bun install, bun run build, bun run start. Open http://127.0.0.1:4213. All application helpers are included below; none depend on the website. Client-only example: React's outer HTML is a useful static fallback, not hydrated pending SSR. Native unknown elements open ready with useful HTML. Requests/errors/announcements are application-owned. Motion follows the system; no endless replay. Animation mode: ${s.mode}. The local preset is immutable; explicit phase/speed/total-duration controls override only that field. Clearing restores preset then library defaults. Custom definitions run synchronously on the engine clock, without DOM access, async preparation or independent timers. Never send functions through RSC or JSON attributes.\n`,
    'package.json': JSON.stringify(
      {
        name: 'dotquilt-private-catalog-example',
        private: true,
        type: 'module',
        scripts: {
          build: `bun build ./src/main.${react ? 'tsx' : 'ts'} --outdir public --target browser && bun run styles.ts`,
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
    'public/index.html': `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${model.name} private example</title><link rel="stylesheet" href="/catalog.css"><link rel="stylesheet" href="/example.css"></head><body>${react ? `<div id="example"><h1>${model.name} example</h1><p>Your content stays readable before enhancement. Data is illustrative.</p></div>` : `<h1>${model.name} example</h1><div class="preview-controls">${controls}</div><div class="catalog-preview">${native}</div><p id="status" role="status">Ready</p>`}<p data-enhancement-note>Enable JavaScript to operate loading controls. Current content stays available.</p><script type="module" src="/main.js"></script></body></html>`,
    [`src/main.${react ? 'tsx' : 'ts'}`]: main,
    'public/example.css':
      'body{max-width:48rem;margin:3rem auto;padding:0 1rem;color:#252a24;background:#f8f8f4;font:1rem/1.65 system-ui}button{font:inherit;padding:.6rem;border:1px solid #d7dcd2;background:#fff;color:#252a24;border-radius:6px;min-height:44px}button:focus-visible{outline:2px solid #3e573c;outline-offset:4px}.preview-controls{display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0}dotquilt-region:not(:defined)>[slot]{display:none}',
    'styles.ts': `import{mkdir,copyFile}from'node:fs/promises';\nawait mkdir('public/dotquilt',{recursive:true});\nfor(const family of ${JSON.stringify(['region', 'skeleton', 'line', 'circle', 'skeleton-text', 'typing', 'text', 'chart', 'table'])})await copyFile(Bun.resolveSync('@dotquilt-internal/${react ? 'react' : 'core'}/styles/'+family+'.css',import.meta.dir),'public/dotquilt/'+family+'.css');\n`,
    'serve.ts': `const assets=new Set(['/index.html','/main.js','/catalog.css','/example.css',...${JSON.stringify(['region', 'skeleton', 'line', 'circle', 'skeleton-text', 'typing', 'text', 'chart', 'table'])}.map(f=>'/dotquilt/'+f+'.css')]);\nBun.serve({hostname:'127.0.0.1',port:4213,async fetch(request){const p=new URL(request.url).pathname;const asset=p==='/'?'/index.html':p;if(!assets.has(asset))return new Response('Not found',{status:404});const file=Bun.file(import.meta.dir+'/public'+asset);return await file.exists()?new Response(file):new Response('Not found',{status:404});}});\n`,
  };
  for (const [path, source] of Object.entries(sources))
    if (react || !path.includes('catalog-scene')) files[path] = source;
  return files;
}
export const catalogSlugs = catalog.map((item) => item.slug);
