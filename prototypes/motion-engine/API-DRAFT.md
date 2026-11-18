# Animation interface — approved contract reference

> Approved on2026-10-16. The [canonical motion resolution](https://github.com/b4rb13/dot-loaders/issues/14#issuecomment-6218230896) is authoritative. This local file is a planning/review asset, not a shipped SDK or evidence that release gates pass.

This is the working contract draft for the open [Define the loading motion repertoire and pointer interaction](https://github.com/b4rb13/dot-loaders/issues/14) decision, exercised in part by an isolated prototype. The owner approved Q10–Q13: independent typed bindings, candidate first-party option names/defaults/ranges subject to release gates, shared version-1 custom authoring, explicit targets capped at100, and complete line/bar/scatter semantic geometry. The owner approved Q14–Q16 and the final Q17 confirmation: the complete contract, default recipes, seven validation gates, thirty acceptance scenarios and three edge-case clarifications. The owning decision ticket is closed. This draft extends the earlier preset/geometry-only surface and wrapper-only animation rule; it is not a shipped SDK declaration.

## Consumer configuration

```tsx
const animations = {
  idle: ridge({ amplitude: 0.24, highlightWidth: 90 }),
  handoff: morphWipe({ wipeStart: 0.29, edge: 40 }),
};

<ChartLoader state={state} cycle={cycle} animations={animations} />
```

```ts
// Same bindings and option types for native elements.
element.update({
  state: 'pending',
  cycle: 'may-revenue',
  animations,
});
```

`animations.idle` and `animations.handoff` are independently optional. Explicit per-phase binding > preset's per-phase binding > component default. A partial override preserves the other phase. Existing `motion: 'system' | 'paused'` keeps its restrictive meaning; it is not repurposed as an animation object. Existing pointerResponse remains independent and engine-owned, off by default. No provider, fetch lifecycle, global registration table, network lookup, license check or stored preference is introduced by an animation binding.

Definitions are imported JavaScript values. Native HTML does not evaluate callback strings or turn a user-supplied name/URL into an executable module. Static/server output never serializes functions; the application supplies matching client imports normally. The website share format may serialize only its own allowlisted built-in IDs/options, with version validation, never arbitrary custom code. This prototype does not implement that website sharing system.

Proposed selective subpaths are `/animations` for authoring types/helper and `/animations/chart`, `/animations/text`, `/animations/table`, `/animations/skeleton`, etc. Side-effect-free family exports must tree-shake; finer per-definition entries can be added if measured consumer closure needs them. The verified npm owner/scope remains deferred. These paths are a proposal, not existing package exports. Optional paid packs could supply compatible bindings from separate imports; commercial assignment is undecided.

## Definition and typed options

A definition has `contractVersion: 1`, a stable namespaced `id`, a family, a phase, and an options schema. `defineAnimation()` returns a typed factory; calling that factory produces an immutable binding carrying normalized options. Define factories outside component render. Fresh binding objects with the same definition and equivalent options do not reset the cycle, clock or phase.

```ts
interface DriftOptions { amplitude: number; wavelength: number }

const drift = defineAnimation({
  contractVersion: 1,
  id: 'example/drift',
  family: 'chart',
  phase: 'idle',
  options: {
    parse(value: Readonly<Partial<DriftOptions>>): Readonly<DriftOptions> {
      return {
        amplitude: Math.min(0.4, Math.max(0, value.amplitude ?? 0.18)),
        wavelength: Math.min(220, Math.max(24, value.wavelength ?? 100)),
      };
    },
  },
  frame({ surface, frame, dot }, options) {
    for (let x = 0; x < surface.width; x += 8) {
      dot({
        x,
        y: surface.height * (0.5 + options.amplitude *
          Math.sin(x / options.wavelength + frame.timeMs / 800)),
        size: 2,
        opacity: 0.7,
        tone: 'accent',
      });
    }
  },
  still({ surface, dot }) {
    dot({ x: surface.width / 2, y: surface.height / 2,
          size: 2, opacity: 0.3, tone: 'base' });
  },
});

const animations = { idle: drift({ wavelength: 120 }) };
```

Options parsing is synchronous and deterministic. It copies/normalizes caller data; callers must not retain mutable nested state that changes a captured handoff. No mandatory schema dependency is required. Supported built-ins normalize within documented limits; malformed authoring/setup may throw, while mounted failures use the existing diagnostic/fallback policy. Unknown built-in option names are type errors in checked literals; runtime schema validation and diagnostic codes still need shipping coverage. IDs identify definitions, not readiness cycles or a global replacement registry.

Family and phase types reject a chart animation on TextLoader, or an idle binding in the handoff slot. Each factory retains its own option types and autocomplete. The strict `type-examples.ts` fixture checks positive native/property configurations, custom prepared-state inference, and expected failures for wrong family/phase/value/name/enum. No React runtime adapter has been built by this artifact.

## Execution context

Idle definitions supply both `frame(context, options)` and required `still(context, options)`. The engine invokes the static renderer under pause/reduction/window exhaustion; custom code does not receive an opportunity to force its moving callback in that state.

Handoff definitions supply:

- `duration(surface, options)` — recommended total milliseconds, not an extra stage delay.
- `prepare(surface, options)` — synchronous planning once per committed handoff; its return type is inferred into the frame context's readonly `prepared` value.
- `frame(context, options)` — bounded drawing and reveal commands at normalized progress.

The context provides readonly bounds, semantic family input, a bounded outgoing-dot snapshot, frame time/delta/progress and static status. It offers `dot(...)`, plus handoff-only `reveal(...)` for the owned content wrapper and `revealTarget(id, ...)` for explicit targets. It does not offer raw canvas context, DOM nodes, mutable engine buffers, lifecycle methods, requests, arbitrary selectors or arbitrary style properties. The engine applies pointer lift once after user drawing.

Semantic input contains discriminated line points/baseline, bar rectangles/baseline or scatter points; supported text mask/final glyph cells; or table cell rectangles/baselines/tone/glyphs/row IDs. The declarations now distinguish these three chart shapes; the browser lab remains a line-only final-content fixture. `animation-api.d.ts` makes these shapes concrete. This is an explicit proposed extension to the earlier points/rectangles-only geometry surface: preserve those existing cases, and admit validated text/table semantic projections for precise handoff. Applications/adapters provide data or explicit measurements; geometry preparation must retain the existing at-most-two-call bound and 2048-item cap, counting nested glyph items. Unsupported/oversized text retains full actual content and uses the generic transition. The prototype's own fixture measures its own DOM; that is not permission for the shipping engine to discover arbitrary chart/grid internals.

Callback code is synchronous: no promises, timers, independent animation loop, DOM work, module mutation, fetches or React state updates. Built-ins and custom code use the same writer and engine lifecycle. Output is finite, bounded and capped; errors settle/fall back. Caller-authored JavaScript is not sandboxed or preemptible, so the release documentation must not promise protection from a callback that blocks the main thread. Report callback cost separately and apply existing measured release gates to shipped definitions.

The prototype demonstrates the seam, total timing, output bounds and cancellation. It does not implement every planned production diagnostic, projection validator, deep-freeze policy, CSP path, event detail or memory accounting rule.

## Proposed first-party options

The owner approved these candidate names/defaults/ranges for the v1 contract, subject to the release gates. They are not measured performance results or paid assignments; a material change needs explicit review. Existing generic size/color/pointer/motion controls remain authoritative.

| Animation | Typed options · default [range] |
| --- | --- |
| Chart ridge | amplitude 0.24 [0–0.4], highlightWidth 90px [20–180] |
| Chart scan | amplitude 0.24 [0–0.4], bandWidth 36px [12–80], trail 160px [40–240] |
| Chart terrain | amplitude 0.24 [0–0.4], relief 1 [0.4–1.4] |
| Chart bars | sway 0.07 [0–0.12] |
| Chart scatter | radius 13px [6–24], spread 0.24 [0.1–0.35], sway 0.045 [0–0.1] |
| Chart cycle | holdMs 3200 [800–3200], blendMs 460 [200–600] |
| Chart morphWipe | morphEnd 0.86 [0.55–0.95], wipeStart 0.29 [0.15–0.6], edge 40px [4–80] |
| Text scramble | changesPerSecond 2.8 [0.5–4] |
| Text labelPulse | travelPxPerSecond 70 [20–140] |
| Text lock / printText | staggerMs 24 [0–40], reelMs 55 [0–100], settleMs 90 [40–180], pop 0.2 [0–0.3] |
| Table typeOn / tableShimmer | cadenceMs 600 [250–1200]; cellStyle `auto`, `text`, `number`, `badge`, `date`, `badge-text`, `text-badge` |
| Table rows | staggerMs 35 [0–50], settlePx 4 [0–8] |
| Skeleton dissolve | fallPx 5 [0–8] |
| Custom drift example | amplitude 0.18 [0–0.4], wavelength 100px [24–220] |
| Custom fanReveal example | spread 30px [0–60] |

`morphEnd`/`wipeStart` are normalized phase positions. Phase controls intentionally allow overlap; output is always bounded by the configured total. Text lock's source-like reel/pop is bounded glyph decoration, never a second animation on settled content. Table compound cell styles affect placeholder decoration and do not change final application markup or column ownership. Cycle cannot extend the four-second window just to finish all silhouettes; its source default shows only the beginning of the first transition before static settlement on a sufficiently long wait.

## Total timing and configuration changes

- Rich chart morph/wipe recommends900ms; source-informed text lock computes its full bounded sequence (the numeric fixture is461ms; max~465ms at defaults without added group delay); table row handoff recommends615ms at defaults. Source labels add a sweep and printing treatment. Simple fallback fade recommends150ms; skeleton dissolve in the lab recommends300ms; standalone typing stops immediately.
- Explicit `timing.duration` replaces the complete total; all phases scale inside it. Zero is immediate. No appended website reveal or extra completion delay. An in-flight handoff captures its binding/options/prepared geometry/timing. Changes apply to the next handoff; idle options can update live without restarting phase.
- The inclusive four-second wall window begins with first automatic movement. Pointer/config changes, cycle supersession, pause/resume, hidden state or same-instance reconnect do not rearm it. A genuinely settled ready outcome followed by a new load may start a new window.
- If a complete handoff cannot fit the remaining window, reveal immediately. Pause/reduction/failure/cancel/inactive handling remains authoritative. Refresh preserves useful interactive content. Ready-on-mount never replays.
- `speed` keeps the earlier ongoing-motion meaning; it does not silently alter an already captured handoff duration. `timing.easing`, when explicitly supplied, remaps the overall normalized timeline before the definition receives `frame.progress`; `frame.linearProgress` remains raw elapsed/total. Internal phase curves still apply inside that timeline. Omission preserves the definition’s authored curves (the generic fade uses ease-out). This defines the proposed override semantics; the lab UI currently exercises default curves and duration, so the shipping gate must additionally verify easing overrides. Supported easing syntax/validation follows the existing CSP-safe invalid-input policy and needs explicit compatibility fixtures.

## Explicit reveal targets

```ts
const revealTargets = [
  { id: 'invoice-a', element: rowA },
  { id: 'invoice-b', element: rowB },
];

// Application owns rowA/rowB, their contents and their lifetimes.
element.update({ animations: { handoff: rows() }, revealTargets });
```

Targets must be unique IDs/elements inside the component's supplied content, not the host, a sibling region, an independently owned nested region, or arbitrary page content. The engine owns only its scoped animation effects and cancels them on completion, restriction, supersession or disposal; it must not commit styles, restore a stale snapshot over application updates, clone/reparent nodes, or commandeer the grid/chart runtime. No global selectors. Maximum100 registered targets, approved alongside the existing independent table/geometry caps. Overlapping owners must diagnose and use the safe wrapper fallback.

The lab uses cancellable Web Animations effects on explicitly supplied rows, including individual `translate` so it does not replace an application's transform declaration. Underlying styles remain application-owned after effects cancel. Missing row targets use a150ms whole-table fade. The final implementation still needs focus-safe settlement if a target gains focus, invalid/removed/virtualized target handling, competing animation ownership, and browser/CSP conformance tests. These are shipping obligations, not waived by a successful visual prototype.

## Review and validation boundary

The lab includes the three comparison profiles Signature/Dissolve/Custom and independent per-family selectors. It demonstrates source-style chart field convergence/area/wipe, text matrix scramble/reel/accelerated lock/pop/print, table type-on/shimmer/compound cells/convergence/actual row stagger, skeleton dissolve, typing and a coordinated region.

It is newly authored reference behavior. It is not a source extraction, pixel-parity certification, chart/grid integration, published SDK or actual package size/rendering/accessibility evidence. Existing numeric release budgets remain in force; additional definitions do not get an implicit exemption or hidden dependency. Commercial assignment stays in the open free/paid decision. The API/option/target direction, complete acceptance/release gates and three edge-case clarifications are approved in rounds. Final confirmation is recorded and the ticket is closed; actual implementation/easing integration/release validation remains later work.
