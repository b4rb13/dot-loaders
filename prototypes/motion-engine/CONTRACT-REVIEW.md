# Complete motion contract — approved review snapshot

> Approved on2026-10-16. The [canonical motion resolution](https://github.com/b4rb13/dot-loaders/issues/14#issuecomment-6218230896) is authoritative. This local file is a planning/review asset, not a shipped SDK or evidence that release gates pass.

## Resolution — approved loading motion repertoire and animation contract

On 2026-10-16 the owner explicitly approved the complete motion contract, including the default recipes, public animation API and typed option baseline, seven validation gates, thirty acceptance scenarios and three clarifications, and instructed that the resolution be recorded, this ticket closed and the map updated. This is the canonical resolution for **Define the loading motion repertoire and pointer interaction**. It consolidates Q1–Q16 and the final Q17 confirmation; earlier discussion/prototype recommendations are superseded where they conflict.

### Relationship to existing contracts

This resolution explicitly replaces the earlier universal150ms rich-handoff default with definition-recommended complete totals; expands preset/geometry-only customization with typed custom animation definitions; and extends wrapper-only reveal to explicit opt-in application-owned targets. All other readiness, native/React boundaries, lifecycle, accessibility, CSP/SSR, release-governance and numerical-budget rules remain binding.

- [Define the v1 loading experiences and readiness contract](https://github.com/b4rb13/dot-loaders/issues/5#issuecomment-6204621037)
- [Choose core boundaries and supported environments](https://github.com/b4rb13/dot-loaders/issues/6#issuecomment-6204905694)
- [Define the public API and customization surface](https://github.com/b4rb13/dot-loaders/issues/7#issuecomment-6205250388)
- [Set accessible loading and content handoff behavior](https://github.com/b4rb13/dot-loaders/issues/8#issuecomment-6206110701)
- [Set measurable size and rendering release budgets](https://github.com/b4rb13/dot-loaders/issues/9#issuecomment-6206454654)
- [Choose package identity and release governance](https://github.com/b4rb13/dot-loaders/issues/10#issuecomment-6206730493)
- [Choose the documentation and playground experience](https://github.com/b4rb13/dot-loaders/issues/11#issuecomment-6216480125)

### Approved repertoire and default recipes

| Family | Default idle → handoff | Selectable repertoire / boundary |
| --- | --- | --- |
| Skeleton primitives/multiline | Travelling dot pulse → dot dissolve/content crossfade | Generic fade remains available; preserve reserved geometry and supplied real content. |
| Text | Scramble → lock/reel/settle/pop with real-text overlap | Independent labelPulse and printText choices, plus simple fade; full actual text retained, generic fallback outside supported precise rendering. |
| Chart | Ridge → morphWipe | Six idle silhouettes: ridge, scan, terrain, bars, scatter, cycle. Final-data geometry is independently line, bar or scatter. Full outgoing field converges to supplied geometry and disappears with actual-content wipe; not just a line appearing over a stationary skeleton. |
| Table | typeOn → rows | tableShimmer alternate idle, all seven declared cellStyle values, measured cell/glyph convergence and explicitly registered actual-row reveal. Missing targets use whole-content fade; no required grid adapter. |
| Typing | Sequential dot wave → immediate stop | No separate pointer response or success entrance. |
| Loading region | One coordinated placeholder presentation → wrapper handoff | Coordinate child phases on the owning timeline/window; no second overlay/pointer or appended reveal. Independently owned regions retain independent readiness. |

These default recipes are approved; they do not assign commercial tiers. Signature/Dissolve/Custom are review recipes, not mandatory public preset/tier names. Extra source treatments not in this declared repertoire are future definitions, not an implicit obligation to copy every source control. Newly authored reference behavior is not pixel-identical source parity. The browser study's real chart fixture is line-only: bar/scatter runtime/visual fixtures are release requirements.

## Readiness and content ownership remain authoritative

The application owns requests, outcomes, state and cycle. Initial/replacement pending keeps supplied content mounted but unavailable; refreshing retains useful visible, interactive content; ready makes the current outcome available without waiting for decoration. No cloned/reparented content, false progress, data-truthiness heuristic, request provider or chart/grid ownership. Ready-on-mount never replays. Error/cancellation presentation uses the approved atomic ready+duration0 recipe after the app rejects stale results. No new success/error readiness enum.

One total includes all morph, skeleton disappearance and real-content reveal phases. Chart recommends900ms; default bounded text lock up to~465ms (numeric fixture461ms); table rows615ms at default options; simple fade150ms; skeleton dissolve300ms; standalone typing stops immediately. The automatic wall-clock limit is four seconds from first movement, including handoff. An entire handoff that cannot fit is skipped. Static server pixels do not start the clock; pause/hiding/cycle churn/same-instance reconnect do not rearm it. A genuinely settled ready presentation followed by a distinct load may begin another window. Children share the owning region's remaining window.

Supersession/removal cancels captured old work exactly once. Restrictions, focus priority or invalidated geometry settle still-current ready content with the existing terminal event policy. Coalesced changes create no fictional event pairs; a committed zero-duration handoff has its existing start/end pair. Recheck intent after synchronous handlers. No stale callback can later reveal or finish an obsolete cycle.

## Pointer response

`pointerResponse: 'none' | 'lift'`, native `pointer-response`, defaults to none. Available on skeleton/text/chart/table surfaces; explicit setting > preset > default. Nearby dots brighten, grow slightly and lift vertically without moving real content or changing base geometry. Radius/displacement/growth/smoothing remain internal; existing color/dot controls apply. Fine hover only, excluding touch; suspended during handoff, pause/reduced motion, inactivity or exhaustion. Changes preserve phase/cycle/window; last consumer releases tracking. Typing/region do not add another pointer effect. Invalid values fall back to none with a diagnostic.

## Public API, options and extension contract

The following public animation contract and option baseline are approved, subject to the required release gates. The native and React shipping declarations/examples must cover every accepted helper; no undocumented signature or untested public factory is excused by this prototype. Native core remains framework independent and server imports inert. Definition/option/import changes are subject to the existing release-governance contract. The npm owner/scope is still deferred.

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

Approved selective animation-entry approach: `/animations` for authoring types/helper and `/animations/chart`, `/animations/text`, `/animations/table`, `/animations/skeleton`, etc. Side-effect-free family exports must tree-shake; finer per-definition entries can be added if measured consumer closure needs them. The verified npm owner/scope remains deferred. These are required planned entry paths, not a claim that packages/exports already exist. Optional paid packs could supply compatible bindings from separate imports; commercial assignment is undecided.

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

Semantic input contains discriminated line points/baseline, bar rectangles/baseline or scatter points; supported text mask/final glyph cells; or table cell rectangles/baselines/tone/glyphs/row IDs. The declarations now distinguish these three chart shapes; the browser lab remains a line-only final-content fixture. `animation-api.d.ts` makes these shapes concrete. This is an explicitly approved extension to the earlier points/rectangles-only geometry surface: preserve those existing cases, and admit validated text/table semantic projections for precise handoff. Applications/adapters provide data or explicit measurements; geometry preparation must retain the existing at-most-two-call bound and 2048-item cap, counting nested glyph items. Unsupported/oversized text retains full actual content and uses the generic transition. The prototype's own fixture measures its own DOM; that is not permission for the shipping engine to discover arbitrary chart/grid internals.


The chart projection distinction is explicit (CSS pixels in the established content-box coordinate system):

```ts
type ChartInput =
  | { readonly kind: 'line'; readonly points: readonly Point[]; readonly baseline: number }
  | { readonly kind: 'bar'; readonly bars: readonly Rect[]; readonly baseline: number }
  | { readonly kind: 'scatter'; readonly points: readonly Point[] };
```

Existing finite point/rectangle provider cases remain supported. Nested glyph projection items count toward the same2048-item limit; explicit reveal-target count is a separate100 cap, not permission to exceed geometry/table/resource limits.

Callback code is synchronous: no promises, timers, independent animation loop, DOM work, module mutation, fetches or React state updates. Built-ins and custom code use the same writer and engine lifecycle. Output is finite, bounded and capped; errors settle/fall back. Caller-authored JavaScript is not sandboxed or preemptible, so the release documentation must not promise protection from a callback that blocks the main thread. Report callback cost separately and apply existing measured release gates to shipped definitions.

The prototype demonstrates the seam, total timing, output bounds and cancellation. It does not implement every planned production diagnostic, projection validator, deep-freeze policy, CSP path, event detail or memory accounting rule.

## Approved first-party option baseline

The owner approved these names/defaults/ranges for the v1 contract, subject to the release gates. They are not measured performance results or paid assignments; a material change needs explicit review. Existing generic size/color/pointer/motion controls remain authoritative.

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

- Rich chart morph/wipe recommends900ms; source-informed text lock computes its full bounded sequence (the numeric fixture is461ms; max~465ms at defaults without added group delay); table row handoff recommends615ms at defaults. Source labels add a sweep and printing treatment. Simple fallback fade recommends150ms; skeleton dissolve recommends300ms; standalone typing stops immediately.
- Explicit `timing.duration` replaces the complete total; all phases scale inside it. Zero is immediate. No appended website reveal or extra completion delay. An in-flight handoff captures its binding/options/prepared geometry/timing. Changes apply to the next handoff; idle options can update live without restarting phase.
- The inclusive four-second wall window begins with first automatic movement. Pointer/config changes, cycle supersession, pause/resume, hidden state or same-instance reconnect do not rearm it. A genuinely settled ready outcome followed by a new load may start a new window.
- If a complete handoff cannot fit the remaining window, reveal immediately. Pause/reduction/failure/cancel/inactive handling remains authoritative. Refresh preserves useful interactive content. Ready-on-mount never replays.
- `speed` keeps the earlier ongoing-motion meaning; it does not silently alter an already captured handoff duration. `timing.easing`, when explicitly supplied, remaps the overall normalized timeline before the definition receives `frame.progress`; `frame.linearProgress` remains raw elapsed/total. Internal phase curves still apply inside that timeline. Omission preserves the definition’s authored curves (the generic fade uses ease-out). These override semantics are approved; the lab UI currently exercises default curves and duration, so the shipping gate must additionally verify easing overrides. Supported easing syntax/validation follows the existing CSP-safe invalid-input policy and needs explicit compatibility fixtures.

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

It is newly authored reference behavior. It is not a source extraction, pixel-parity certification, chart/grid integration, published SDK or actual package size/rendering/accessibility evidence. Existing numeric release budgets remain in force; additional definitions do not get an implicit exemption or hidden dependency. Commercial assignment stays in the open free/paid decision. The owner has approved the complete motion contract. Actual implementation/easing integration/release validation remains later work; this resolution settles policy and does not mark shipping gates as passed.


## Required motion validation

## Seven gates

1. **Choreography and visual fidelity.** Retain a versioned fixture/recording baseline for every first-party advertised idle/handoff combination, meaningful option endpoints and representative simultaneous surfaces. Human review at normal speed verifies geometry convergence, skeleton disappearance, actual-content reveal, continuity, timing and static fallbacks. Slower/frozen inspection supplements normal-speed review. Cover line/bar/scatter final geometry, supported numeric/label text and table cell/row types. Record layout, dataset/seed, font, direction, dimensions, DPR and preferences. No generic fade substituted for an advertised specialized treatment without explicit disclosure/review. No claim of pixel-identical m37 parity.
2. **Packed public contract.** Native and React/Next consumers use actual packed JS/types/CSS, supported minimum/current tooling and environments. Positive and negative type fixtures cover every exported factory, helper, family, phase, option and inferred prepared state. Test property/pre-upgrade/atomic update, preset precedence and override removal. Compile/run complete docs examples, including independent custom idle/handoff definitions. Selective import checks must show no unrelated family/framework runtime. No undeclared helper or callback-string execution.
3. **Readiness, interruption and events.** Deterministic tests cover every state transition, equivalent configuration, captured options/timing, live idle/speed changes, geometry invalidation, reentrant event handlers, supersession, removal/adoption and rapid updates. Every committed start has exactly one end/cancel; obsolete work has no later mutation/completion. Test complete totals, zero, easing and four-second elapsed deadline against actually displayed motion, including main-thread stalls/compositor effects. Preserve existing immediate failure/cancellation recipe and skipped-versus-committed event semantics.
4. **Application content and target ownership.** Real native/React content retains identity, handlers, state, focus and application styles. Test valid, missing, conflicting, outside, nested-owner, removed, reordered and virtualized row targets; enforce100 targets independently of geometry caps. Focusable controls must be available at readiness without waiting for decorative completion. Exercise the three clarifications below, app style/animation changes and cancellation cleanup. No cloned content, arbitrary selector discovery or required grid/chart runtime.
5. **Accessibility, preferences and actual environments.** Extend the approved floor/current-browser, real-device, genuine Windows forced-colors, live OS reduced-motion, persistent website pause and manual screen-reader matrices to the motion/target paths. Test keyboard/focus, decorative semantics, no false progress, status independence, contrast/flashing at supported speed/option extremes, zoom/text spacing and international content. Resized viewports and zero automated scan violations cannot replace the established manual evidence.
6. **Static rendering, security policy and fallbacks.** Packed server imports are DOM-free; functions/element references are never serialized into HTML or share links. Test pending/ready/streaming/delayed or failed upgrade, hydration and client navigation under actual supported CSP headers/style delivery modes and Trusted Types enforcement. Invalid/oversized/throwing geometry/options/definitions use bounded diagnostics and safe presentation; no permissive-policy workaround, stuck hidden result or retry loop. Test missing/failed canvas resources and valid updates after recovery.
7. **Measured resources and regressions.** Apply all existing numerical bundle, frame/setup, backing-pixel, dot/geometry, allocation, heap, SSR/CLS and cleanup budgets to actual distributables and claimed motion catalog. Include known custom-definition fixtures in the same runner and report their cost; never promise to sandbox/preempt arbitrary user JavaScript. Use the approved physical Pixel reference and secondary devices, fixed workloads, paired baselines, three warmups/twenty valid runs and retained evidence. Test allowed worst-case settings, fallbacks, multiple compatible copies and zero dormant scheduling. Numerical exceptions follow existing narrowly scoped governance; readiness/focus/safety/stale-work/cleanup invariants cannot be waived.

## Thirty acceptance scenarios

| ID | Scenario | Required result |
| --- | --- | --- |
| M01 | All six advertised chart idle silhouettes | Distinct whole-field shapes, highlights/trails and continuous phase; cycling cannot extend the motion window. |
| M02 | Ready line, bar and scatter data | Dots converge onto the supplied final type's geometry and disappear with coordinated actual-content reveal; no invented chart values or new chart ownership. |
| M03 | Supported number/label text, punctuation and changing mask | Scramble/pulse and lock/print behave independently; bounded reel/settle/pop and overlap end completely. Unsupported text uses generic decoration without replacing meaningful text. |
| M04 | Table type-on/shimmer and all declared cell treatments | Caret/erase/shimmer, cell-to-glyph convergence and registered actual-row staggering agree with supplied geometry; absent targets use whole-content fallback. |
| M05 | Skeleton, typing and coordinated region | Primitive pulse/dissolve works; standalone typing stops at ready; a region coordinates one handoff rather than adding competing nested reveals. |
| M06 | Independent bindings and defaults in native/React/presets | Each phase resolves explicit binding > preset > default; a partial override preserves the other phase and removing an override restores inheritance. |
| M07 | Wrong family/phase/options/enum/version | Checked declarations reject invalid usage; runtime validation diagnoses and follows safe mounted recovery without corrupting content. |
| M08 | Equivalent objects, options, styles, pointer or live speed changes | No accidental load, content remount, phase restart or motion-window reset; pointer response applies once, only when eligible. |
| M09 | Configuration changes during handoff | Captured definition/options/timing remain stable; next handoff uses new settings. Invalidated geometry follows clarification C2. |
| M10 | Independently authored idle and handoff | Same scheduler/static/cancellation/bounds contract; required still renderer, inferred prepared state and typed extra options; no registry replacement by ID. |
| M11 | Recommended total, explicit duration and zero | Whole sequence fits one total with no appended fade/minimum wait. Zero is immediate; a committed instant handoff has its existing start/end pair, ready-on-mount has none. |
| M12 | Explicit easing, internal curves and terminal sampling | Raw linear progress stays raw; bounded eased progress drives authored phases; deadline/end state follows clarification C3. |
| M13 | Insufficient remaining time, exhaustion and cycle churn | Skip a handoff that cannot fit; later readiness reveals immediately. Pending/hidden/pause/reconnect churn does not rearm; only a genuinely settled ready presentation followed by a new load may do so. |
| M14 | Live pause/reduced motion/ancestor restriction | Static pending rendering or immediate current-content settlement, correct terminal semantics, no ready replay on resume; actual displayed movement respects the inclusive four-second deadline. |
| M15 | Supersession, event-handler reentrancy and removal | Old work cancels once, latest intent wins, no late stale end/write or resurrection; independently owned regions do not wait for unrelated regions. |
| M16 | Ready on mount, zero/empty, failure and cancellation | Application owns outcomes; meaningful empty values stay valid. The atomic ready+duration0 recipe reveals error/cancel promptly, without success choreography. |
| M17 | Refresh including refresh failure | Useful content/focus remain visible and interactive; busy cue ends without replaying replacement choreography. |
| M18 | Focus before replacement and during reveal | Existing fallback-before-hide policy holds. Readiness enables controls immediately; gaining focus within visually constrained content settles the owning handoff under C1 without moving focus. |
| M19 | Target registration boundaries/counts | Unique IDs/elements inside supplied content; host, external, nested-owner and competing-owner targets rejected/fallback.100 is permitted subject to independent resource limits;101 is bounded/diagnosed. |
| M20 | Application style changes during animation | Cancelling scoped effects exposes current app styles; no stale restoration, persistent committed styles, clones or reparenting. Competing ownership uses safe fallback/settlement. |
| M21 | Row reorder/removal/recycling or geometry change | Captured element identity is respected; stale glyph/clip/row effects stop and latest ready presentation settles under C2. No DOM polling or new automatic handoff. |
| M22 | Invalid/nonfinite/oversized input, thrown callback or missing geometry | Diagnose without per-frame flooding; bounded safe static/fade/immediate fallback as eligible. Full real content remains available and later valid input can recover. Never retry failing user callbacks every frame. |
| M23 | Server/no-JS, failed module, pre-upgrade and hydration | Useful correct static pending/ready output; no serialized callbacks or targets, DOM-free imports, no ready replay, no request-local state leak or child remount. |
| M24 | Every supported CSP/style mode and Trusted Types | Actual-header execution succeeds or documented safe static fallback applies; no eval, callback strings or unsafe policy relaxation. |
| M25 | Browser floors/current, real touch/AT/forced colors | Existing required matrix passes critical motion/target interactions. Pointer lift is optional fine-hover decoration, absent on touch and suspended during handoff/restrictions/inactivity. Flashing limits hold at allowed simultaneous extremes. |
| M26 | Zoom, font load/resize, spacing, RTL/mixed scripts/emoji/combining text | Content/reading order/lang/dir and focus remain intact; generic fallback when precise decoration is unsupported, no inaccessible overflow or manually reversed text. |
| M27 | Packed selective imports, catalog and docs examples | Complete required closure fits existing ceilings, including assets/CSS and authoring seam when imported; no hidden dependency/paid runtime/network lookup. Documented fixtures compile/run. |
| M28 | Typical/list/stress motion and readiness setup | Approved physical-reference percentile, cadence and setup gates pass; no library-introduced task >=50ms. Report actual degradation/static counts and all valid runs. |
| M29 | Boundary and over-limit resources, provider attempts | All pixel/dot/buffer/canvas/table/geometry limits hold before allocation, including temporaries and nested glyph items; provider attempts <=2, consumed items <=2048. Safe fallback keeps readiness/layout intact. |
| M30 | Hidden/offscreen/zero-size, disposal and repeated cleanup | No dormant loop/subscription/target retention. Three100-cycle cleanup experiments meet every10/50/100 checkpoint and <=512KiB residual limit, with no retained discarded instance at any byte size. Other memory/SSR/CLS budgets remain binding. |

## Three approved edge-case clarifications

- **C1 — Focus wins over decorative reveal.** If focus enters content still constrained by opacity/clip/row choreography, immediately settle the entire owning handoff to its latest valid presentation, remove its scoped effects and preserve focus. Do not wait for a row delay or make ready content inert merely to preserve animation. Settlement ends a still-current committed handoff; supersession/removal still cancels it.
- **C2 — A stale visual plan cannot survive content invalidation.** A normal configuration edit stays next-handoff-only. But a supplied-content/measurement change that invalidates captured geometry, removal/recycling of a captured target or conflicting ownership during playback immediately settles latest valid ready content and clears old effects. Do not replan/replay mid-handoff or rearm motion. App-owned removal of a focused node remains the app's focus-management responsibility. Target-list updates without invalidating current targets apply next time.
- **C3 — Completion is exact despite easing or author output.** Expose bounded eased progress alongside raw linear progress; easing never extends the total or four-second deadline. At completion the engine removes decoration and owned effects and makes the full latest valid content presentation available, even if a custom author omitted a final reveal command. Invalid easing follows existing fallback policy. Callback exceptions do not fabricate success or change application readiness. JavaScript callback execution is not sandboxed/preemptible.

## Evidence and release policy

Keep reproducible artifacts/traces/recordings, exact versions and environment cells with the release candidate. Failed or missing required evidence is failed/unverified, never silently passed by prototype checks. A visual fallback must be documented accurately and cannot replace a promised specialized first-party effect just to hide a normal-fixture regression. Existing numerical-exception policy remains unchanged; hard safety/accessibility/identity/stale-work/cleanup guarantees have no motion-specific waiver. Free/paid allocation belongs to the separate commercial decision. The owner approved this complete contract, including default recipes, API/options, all seven gates, all thirty scenarios and C1–C3, and explicitly instructed resolution recording, ticket closure and map update.


### Evidence, commercial boundary and subsequent work

The initial Quiet/Flow/Tactile comparison was rejected. The improved Signature/Dissolve/Custom lab informed this accepted contract; those comparison names do not assign product tiers. Local source/notes/screenshots live in `prototypes/motion-engine/`; the lab URL is workspace-local, not a durable deployment. Assets remain local/uncommitted planning evidence. The declaration fragments extend the existing component APIs; the animation-only native declaration example is not a replacement for the complete state/cycle/update interface already approved. Shipping implementation must provide complete generated declarations and packed native/React examples for every promised factory/helper.

Observed prototype evidence:93 focused animation checks, strict type fixtures (including discriminated chart geometry), manual browser observations and an independent source/capture review after identified harness defects were corrected. This does not certify production conformance, historical browser floors, actual assistive technology, real CSP/SSR, physical reference-device budgets or production cleanup. Final real-chart fixture is line-only; bar/scatter runtime/visual evidence is explicitly required before claiming those shipping behaviors.

Read-only source behavior was inspected at m37 HEAD `5f940c1059ebfe08f734a90714c5da51f77b66f5`; no m37 source file was copied into this prototype or modified and no source-project install/mutating script was run. Later extraction/relicensing still requires the approved provenance workflow.

No animation is assigned a paid tier by this resolution. [Define the free product and optional paid expansion boundary](https://github.com/b4rb13/dot-loaders/issues/12) owns that decision, including possible separately imported optional packs. Core lifecycle, accessibility, performance and user-authored animation support remain usable without a paid runtime/license check. Publication, repo visibility and website launch retain their independent approval gates. No production package/source extraction, production website, npm publication, visibility change or deployment was performed by resolving this ticket.
