import { renderStatic } from '@dotquilt-internal/core/server';

// Run on the server: bun native-static.ts [pending]. No browser globals required.
const pending = process.argv.includes('pending');
const placeholder = renderStatic({
  kind: 'skeleton-block',
  stylePolicy: { mode: 'external', href: '/dotquilt/skeleton.css' },
});
// Application-owned HTML is fixed here; escape any real untrusted data yourself.
console.log(`<dotquilt-region state="${pending ? 'pending' : 'ready'}" aria-busy="${pending}">
  <span slot="placeholder" aria-hidden="true" inert${pending ? '' : ' hidden'}>${placeholder}</span>
  <article${pending ? ' hidden inert aria-hidden="true"' : ''}><h2>Available account</h2></article>
</dotquilt-region>
<a href="/?mode=external">Open the available server content</a>`);
