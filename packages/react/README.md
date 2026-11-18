# Dotquilt React — private validation slice

Thin React 19 adapters for `SkeletonBlock` and `LoadingRegion`. React owns your content and local state; the native package owns presentation, focus protection, motion preferences and loading transitions. M4 also includes line/circle/multiline skeletons, TypingDots and an initial `TextLoader` via `/text`; TextLoader accepts string/number children, `mask`, the shared state/cycle/timing controls and typed text animation bindings from the native `/animations/text` entry. Current-React hydration is covered incrementally; TextLoader’s size gate and full environment qualification remain open. ChartLoader/TableLoader and complete catalog qualification remain M4 work. Renderer selection and physical reference qualification remain provisional in M2.

Both packages are private, coordinated at the same provisional version, and guarded against npm publication. Use the matching locally packed native and React tarballs. npm installs must list both tarballs; Bun's local test consumers additionally override the exact native dependency to its local tarball. These private artifact names are not public registry reservations.

```tsx
'use client';
import { useState } from 'react';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { SkeletonBlock } from '@dotquilt-internal/react/skeleton';

export function Account() {
  const [state, setState] = useState<'pending' | 'ready' | 'refreshing'>('ready');
  return <>
    <button type="button" onClick={() => setState('pending')}>Load replacement</button>
    <button type="button" onClick={() => setState('ready')}>Show outcome</button>
    <LoadingRegion state={state} aria-label="Account"
      placeholder={<SkeletonBlock className="account-skeleton" />}
      refreshIndicator={<span>Refreshing</span>}
      onHandoffEnd={event => console.log(event.detail.handoffId)}>
      <label htmlFor="note">Account note</label>
      <input id="note" defaultValue="Keep this mounted" />
    </LoadingRegion>
  </>;
}
```

Reserve geometry using your stylesheet, for example `.account-skeleton { width: 20rem; height: 8rem; }`. The application controls readiness, current/error/empty content, stale responses, retry and announcements. Use `refreshing` to retain visible interactive content; use `pending` for replacement. To expose an immediate error or cancelled outcome, commit `state="ready"` and `timing={{duration: 0}}` together. Changing `cycle` invalidates prior handoff work; it does not remount your children. Cycle identity is delivered through the committed native properties and is not serialized into static HTML.

`ref` resolves to the registered native element, including its `update` method. Rich options (`timing`, `animations`, `revealTargets`, `preset`, `stylePolicy`) are delivered as properties in one layout commit, never stringified attributes. Host event callbacks receive native `CustomEvent`s; descendant events are filtered. Equivalent objects and ordinary rerenders do not restart work. Removing optional props restores native defaults. No provider, memoization or React key reset is required.

The normal React server renderer produces static placeholders and readable available content, including when enhancement fails or JavaScript is disabled. Supplied fallback content is decorative/inert; the application must supply meaningful status/recovery UI. Client enhancement selectively registers mounted component families. Ready/pending state is deterministic; motion starts only on committed enhancement. React retains direct ownership of light-DOM content without cloning or reparenting. The selected integration is static first and does not emit Declarative Shadow DOM; DSD remains an unselected candidate.

## Styles and CSP

Set `stylePolicy` before first render and supply it to each component. Later changes are diagnosed rather than silently changing authorization. There is no global mutable nonce or implicit inheritance of credentials.

- Default `{mode: 'inline'}` emits deterministic static CSS. Authorize the exact strings from `@dotquilt-internal/react/server` (`reactSkeletonStyles`, `reactRegionStyles`) and the native `/server` runtime CSS (`skeletonStyles`, `regionStyles`) using CSP hashes.
- `{mode: 'inline', nonce}` applies a request/document nonce to static and shadow styles. The host uses the standard `nonce` attribute/property so the browser's nonce hiding remains effective. React 19.0–19.2 have an attribute-based nonce hydration check; a narrowly scoped snapshot bridge matches that visible attribute during hydration and then supplies the real prop. It never clears the DOM nonce, suppresses warnings or shares request data.
- `{mode: 'external', href}` points to an application-served combined stylesheet. Copy the matching adapter `styles/skeleton.css` or `styles/region.css` asset to your approved URL. That same file serves static and enhanced styles. It is not an injected style attribute.

Typed `style` supports normal React CSS and the five approved `--dotquilt-*` variables. With `style-src-attr 'none'`, use classes or external CSS for your own theme/geometry rather than inline `style` props. HTML attributes, arbitrary children and application CSS remain application output, not bounded library-generated markup.

For Next 16 App Router, import a client component from an RSC page normally; do not turn off SSR. Define custom animation functions and DOM reveal targets in the client component, because they cannot cross the RSC serialization boundary. Pass only serializable application data across that boundary. Refs and callbacks also belong in client code.

Keep CSP authorization tied to the **document**, including client navigation: establish a request nonce in the server layout and pass it through an application-owned client context that survives navigation. A later RSC response's nonce does not replace the already loaded document's policy. The executable fixture in `tests/fixtures/m3-next` demonstrates this pattern, streaming, external styles, failed/delayed scripts and no-JavaScript recovery. That context is a fixture/application choice, not a required package provider.

## Validation boundaries

The compiled package has selective ESM entries/declarations and preserved `use client` directives; `/server` is pure and imports without browser globals. React/ReactDOM are external peers. The adapter depends on the exact matching native package; native has no runtime dependency on React.

Build/test commands and the exact verification matrix are recorded in the repository's M3 evidence. Automated Chromium/Firefox/WebKit results are not claims of actual supported browser-floor, Safari/iOS, screen-reader or physical-device qualification. No npm publication, distribution, deployment or public-release readiness is implied.

## Private ChartLoader slice

`/chart` exports the thin `ChartLoader` adapter with typed variant, targetProvider, preset, animations, motion, speed and pointerResponse props. Compose it as a LoadingRegion placeholder; render the actual chart as region children. ChartLoader has no independent readiness state or children slot. Providers run synchronously only for an owning handoff, return CSS-pixel content-box geometry, and are never serialized or called by SSR. Native and React share one scheduler and engine. `/styles/chart.css` and `/server` `reactChartStyles` cover static and enhanced delivery. Three final geometry types and all six idle recipes are available; actual reference-device/browser-floor/manual-AT qualification and owner visual review remain pending.

## Private TableLoader slice

`/table` exports the thin decorative TableLoader adapter and typed props. It forwards rows, rowHeight, columns, targetProvider, animations/preset and activity/style controls to the same native element at commit. Put the actual application table in LoadingRegion children and register its rows through the region's revealTargets. SSR does not call/serialize providers or element references. Current React hydration/Strict Mode and static/CSP paths are covered incrementally; TableLoader size and final environment/visual qualification remain held. Publishing stays disabled.

Table static layout reuses the native pure helpers at build time; the compiled adapter includes its own private data module and imports no native internal package path. The adapter captures the inert SVG once for initial SSR/hydration; subsequent committed props continue to update the same native host.

Development builds run from the repository root so Turborepo builds the native declarations and pure layout source before the adapter. Installed consumers need only the compiled public packages; no repository-relative runtime import is shipped.
