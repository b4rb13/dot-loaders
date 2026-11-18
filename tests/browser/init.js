import { registerLoadingRegion } from '/pkg/dist/region.js';
import { registerSkeletonBlock } from '/pkg/dist/skeleton.js';

const mode = new URL(location.href).searchParams.get('mode');
for (const element of document.querySelectorAll(
  'dotquilt-region,dotquilt-skeleton-block',
)) {
  const family =
    element.localName === 'dotquilt-region' ? 'region' : 'skeleton';
  element.stylePolicy =
    mode === 'external'
      ? { mode, href: `/pkg/dist/${family}.css` }
      : {
          mode: 'inline',
          ...(mode === 'nonce' ? { nonce: 'fixture-nonce' } : {}),
        };
}
window.violations = [];
document.addEventListener('securitypolicyviolation', (e) =>
  window.violations.push(e.violatedDirective),
);
window.contentIdentity = document.getElementById('content');
window.events = [];
for (const type of ['start', 'end', 'cancel'])
  document
    .getElementById('region')
    .addEventListener(`dotquilt-handoff-${type}`, (e) =>
      window.events.push({ type, ...e.detail }),
    );
if (new URL(location.href).searchParams.has('preupgrade')) {
  const region = document.getElementById('region');
  region.state = 'ready';
  region.cycle = 'preupgrade';
  region.timing = { duration: 0 };
}
registerLoadingRegion();
registerSkeletonBlock();
// Release only the app's explicit SSR guards, after native availability takes over.
queueMicrotask(() => {
  for (const content of document.querySelectorAll('[data-app-pending]')) {
    content.removeAttribute('hidden');
    content.removeAttribute('inert');
    content.removeAttribute('aria-hidden');
    content.removeAttribute('data-app-pending');
  }
});
window.booted = true;
