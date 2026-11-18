# Native M1 quickstart

This is a private development slice, tracked in [Establish the Bun/Turborepo foundation and packed native loading flow](https://github.com/b4rb13/dot-loaders/issues/15). Implemented size gates pass under the owner-approved 4.5 KiB SkeletonBlock amendment; M1 is complete for this recorded native slice; later release qualification remains unverified. The provisional name `@dotquilt-internal/core` claims no npm ownership. No registry package or website has been launched. Subsequent development follows the [approved M4 size/fixture/acceptance amendment](https://github.com/b4rb13/dot-loaders/issues/9#issuecomment-6226666680); the original M1 packet keeps its historical 4.5 KiB result. Current Block and Region gates are 6 KiB each, with independent M4 baseline-growth review.

## Reproduce

Use Bun **1.4.3** (see `.bun-version`) and Node 24. The implementation was tested with Node 24.14.0. Current development dependencies are exact and the Bun lockfile is committed-ready; install scripts are unnecessary.

```sh
bun install --frozen-lockfile --ignore-scripts
bun run build
bun run check
bun run lint
bun run test
bun run verify:packed
bunx --no-install playwright install chromium firefox webkit
bun run test:browser
bun run verify:clean
bun run verify:m1
```

`verify:packed` creates an allowlisted private tarball, installs it in separate temporary npm and Bun consumers, verifies DOM-free Node/Bun imports and TypeScript 5.7/current Bundler/NodeNext declarations, then measures production closures. It deliberately returns failure when the approved size limits fail. `.artifacts/packed-report.json` retains exact results, hashes and consumer paths even on that failure. Root and family named imports are measured separately, including required external CSS. Browser tests exercise the measured minified family bundles as well as that actual installed artifact; they do not import workspace source. Full `bun run verify` stops at the failing gate.

`verify:clean` makes an allowlisted source copy in a fresh temporary directory, performs a frozen install/build/check/lint/test and independently packs it; the tarball digest must match. `verify:m1` then validates the [requirement-to-test assignments](m1-requirement-review.json) against those current results, source/reference hashes and publication guards. It needs the recorded read-only m37 reference paths in this maintainer workspace; ordinary consumer installation does not.

The native fixture can be inspected locally after preparing the artifact:

```sh
bun tests/browser/server.ts
```

Open `http://127.0.0.1:4181`. Query modes `?mode=nonce`, `?mode=hash`, `?mode=external` and `?static` exercise the documented delivery paths. This is the native test/example fixture, not the M5 website. It is a manual application-owned fixture; tests drive state through the public host properties.

## Compose and update

Install the reviewed tarball in a separate consumer. In a normal browser-bundled application, import these modules from that installed package:

```js
import { registerLoadingRegion } from '@dotquilt-internal/core/region';
import { registerSkeletonBlock } from '@dotquilt-internal/core/skeleton';

registerLoadingRegion();
registerSkeletonBlock();
const region = document.querySelector('dotquilt-region');

export function beginReplacement(requestId) {
  region.update({ state: 'pending', cycle: requestId });
}
export function beginRefresh(requestId) {
  region.update({ state: 'refreshing', cycle: requestId });
}
export function showOutcome(requestId, text, immediate = false) {
  if (region.cycle !== requestId) return;
  region.querySelector('[data-value]').textContent = text;
  region.update({ state: 'ready', timing: immediate ? { duration: 0 } : {} });
}
```

```html
<link rel="stylesheet" href="/account.css">
<p role="status" aria-live="polite" aria-atomic="true" id="account-status">
  Loading account activity
</p>
<dotquilt-region class="account" aria-label="Account activity" state="ready">
  <dotquilt-skeleton-block slot="placeholder"></dotquilt-skeleton-block>
  <article><button>Account action</button><p data-value>0</p></article>
</dotquilt-region>
```

```css
.account { min-block-size: 6rem; --dotquilt-color: #627467; }
.account > [slot="placeholder"] { block-size: 6rem; }
```

A plain HTML consumer can bundle that application module with `bun build app.js --outdir public` and serve the output alongside its HTML/CSS. Core has no framework runtime requirement. The app owns requests, stale-result rejection, status text, empty/error/retry content and meaningful labels. Zero/empty strings are legitimate outcomes. Supply error/cancellation content and ready plus duration zero atomically. Refresh keeps useful content interactive. Replacement preserves content nodes but hides/inerts them, moving focus to the region only when needed before hiding. Completion never restores focus automatically.

The native region uses default content, `placeholder`, and optional `refresh-indicator` slots. Presentation events are `dotquilt-handoff-start/end/cancel`; diagnostic events are `dotquilt-error`. Committed starts receive one terminal event. State/cycle supersession cancels; restrictions/focus/current geometry invalidation settle current ready content. Configure equivalent options without changing cycle to avoid inventing a new load. Standard authored role/tabindex/ARIA and application content styles are preserved.

## Motion and optional authoring

`motion="paused"` and OS reduced motion are restrictive. A paused ancestor restricts descendants. The app persists its own pause choice; core does not read storage. One continuous loading presentation has an inclusive four-second automatic-motion window. Cycle churn, pause/hiding and reconnect do not rearm it. An entire handoff that cannot fit is skipped. The native slice uses a CSS dot field with bounded-duration WAAPI pulse/fade; custom definitions use on-demand shared scheduling and a bounded SVG command painter. These are slice implementations, not the final dense-renderer selection.

```js
import { defineAnimation } from '@dotquilt-internal/core/animations';
const quiet = defineAnimation({
  contractVersion: 1, id: 'example/quiet', family: 'skeleton', phase: 'idle',
  options: { parse: () => ({}) },
  frame({ dot, frame }) {
    dot({ x: 16, y: 16, size: 2, opacity: .35 + .1 * Math.sin(frame.timeMs / 500), tone: 'base' });
  },
  still({ dot }) { dot({ x: 16, y: 16, size: 2, opacity: .35, tone: 'base' }); },
});
document.querySelector('dotquilt-skeleton-block').animations = { idle: quiet() };
```

Definitions receive frozen semantic/frame snapshots and commands, not raw DOM/canvas, requests or lifecycle controls. They are trusted synchronous application code, not a sandbox; the app owns callback execution cost. Options are copied/frozen with depth/value bounds. The engine limits dot commands, clamps reveal opacity/vertical displacement, handles errors and releases owned painters/animations. Custom callbacks cannot postpone final content access. Only the implemented skeleton/region authoring families are exposed in M1; chart/text/table/typing APIs remain later work. `definePreset` currently validates skeleton animation presets. `pulse` and `dissolve` have independently typed options. Fine-pointer lift is opt-in with `pointerResponse: 'lift'`; it is suspended by lifecycle/motion restrictions.

## Static and CSP integration

`/server` exports pure `renderStatic`, `skeletonStyles` and `regionStyles`. Descriptions cover only the implemented library-owned decoration; they do not accept arbitrary HTML or serialize callbacks. Applications render real content with their own templates. Available content stays readable without JavaScript. Raw unknown custom-element tags alone are not a rendered skeleton; use the static helper and reserve geometry in application CSS.

For **server-pending** markup, the application must protect unavailable content before enhancement. The complete runnable fixture is `tests/browser/server.ts` (`?ssr=pending&mode=nonce`, with `&static` or `&failed` to prevent enhancement). It uses the helper only for the library wrapper/placeholder and inserts app-templated content before the closing region tag. The app marks that content `data-app-pending hidden inert aria-hidden="true"`; the status/recovery link remains outside. For ready or refreshing output, omit those guards and retain usable content. The composition example above starts ready; raw pending tags alone do not establish a safe pre-upgrade state.

After selective registration, release **only those explicit app guards** in a microtask, once native availability has taken over:

```js
registerLoadingRegion();
registerSkeletonBlock();
queueMicrotask(() => {
  for (const content of document.querySelectorAll('[data-app-pending]')) {
    content.removeAttribute('hidden');
    content.removeAttribute('inert');
    content.removeAttribute('aria-hidden');
    content.removeAttribute('data-app-pending');
  }
});
```

Do not clear ordinary application-authored hidden/inert values. If enhancement never runs, the pending guard remains; supplied ready content and the external status/recovery path stay available. No application HTML parameter, DSD or framework hydration is introduced by this native recipe.

Set each host's `stylePolicy` **before registration/upgrade**; the library preserves pre-upgrade properties. Use `{mode:'inline', nonce: requestNonce}` for nonce-authorized styles, hashes computed from the exact exported CSS strings, or `{mode:'external', href: applicationApprovedUrl}` for a stylesheet inserted inside that host's shadow root. Use `/styles/skeleton.css` and `/styles/region.css` as appropriate. No global nonce or automatic credential propagation is provided. Supply the same policy for static markup and every matching client host, including nested/static examples. Late policy changes are diagnosed and ignored.

Strict CSP uses application classes and external CSS rather than style attributes. The real-header fixtures include `style-src-attr 'none'` and Trusted Types enforcement. Library DOM creation uses node APIs rather than HTML sinks; animations use WAAPI rather than injecting style attributes. No permissive policy or `unsafe-inline` workaround is needed for nonce/hash/external modes. `refreshStyles(scope)` refreshes affected hosts after external style invalidations without changing readiness/cycle.

## Evidence and remaining scope

See [M1 evidence](m1-progress.md), [source references](m37-reference.json) and the [canonical requirement inventory](requirements.json). Current automated engines supplement actual browser-floor/manual-AT/physical-reference checks; they do not certify those later gates. Dense catalog, React/Next integration, full SSR/streaming qualification, final motion/renderer proof, protected deployment and release remain later milestones. The owner reports creating npm account `b4rb13`; see the [setup register](npm-setup.md) for completed preparation and remaining authentication/release gates. Keep m37 read-only.

Static fallback markup embeds `staticSkeletonStyles`, without idle, hover or custom-drawing rules. A hash CSP authorizes those exact strings along with `skeletonStyles`/`regionStyles` used by enhancement. External mode still counts the complete enhanced stylesheet response. Pointer lift tracks bounds from the owning region because the placeholder remains inert; listeners exist only for an active opt-in surface.
