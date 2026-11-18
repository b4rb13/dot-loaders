# Dotquilt animation engine study

Working decision prototype for [Define the loading motion repertoire and pointer interaction](https://github.com/b4rb13/dot-loaders/issues/14). Open the local lab at [http://127.0.0.1:4179/](http://127.0.0.1:4179/). This server serves only this directory, binds only to localhost, and is not deployed.

The owner rejected the earlier Quiet/Flow/Tactile simplification and explicitly requested the full m37-style choreography, named variants, typed custom animation options, and an extensible engine. The owner approved per-definition recommended total durations and explicit opt-in real-row targets. The owner has approved the public API/options, seven validation gates, thirty acceptance scenarios and three edge-case clarifications in discussion rounds. The complete contract/default recipes are now approved and the decision ticket is closed; see the [canonical resolution](https://github.com/b4rb13/dot-loaders/issues/14#issuecomment-6218230896) and [local review snapshot](CONTRACT-REVIEW.md). Read [API-DRAFT.md](API-DRAFT.md) for the proposed interface and [animation-api.d.ts](animation-api.d.ts) for the complete draft types.

## Compare

| Profile | Axis | What it proves | Cost |
| --- | --- | --- | --- |
| Signature | Geometry and staged handoff | Full dot field converges into chart geometry, wipe reveals actual chart; text reels/locks/settles; table cells converge while actual registered rows stagger | More movement and time than a simple fade |
| Dissolve | Whole-content crossfade | The same idle variants can use a short independent fade handoff | Less distinctive continuity |
| Custom | User-authored drawing and reveal | A separate `custom-motion.js` defines drift and fanReveal with amplitude/wavelength/spread options on the same execution contract | Author must validate behavior, cost and accessibility of their code |

The profiles are comparison recipes, not exclusive product tiers or an approved public preset catalog. Select individual idle and handoff variants independently. The Custom recipe starts with a chart-only example; other families are available under Signature/Dissolve. The bottom picker is the prototype skill's verbatim review chrome. Use1–3 or arrow keys to change profiles, R to remount a fresh review fixture. Input controls keep their own keys. The picker can overlap page content at some scroll positions; scroll controls into view to use them.

## Implemented reference behavior

Newly authored from read-only source behavior. No source file or m37 dependency was copied, installed or modified.

- **Chart:** ridge, scan, terrain, bars, scatter and cycle idle silhouettes. An entire dot field has a shaped crest, depth, moving highlights or scan trails. Signature handoff freezes the outgoing field, staggers column convergence onto the fixture's real sampled line, forms the dotted area and clears behind a softened wipe while revealing the actual SVG. Six idle silhouettes are independent of the final chart type. This fixture's final chart is a line; bar/scatter final-data handoffs are still future validation fixtures.
- **Text:** 5×7 matrix slots, static punctuation, crossfaded scramble glyphs; accelerating left-to-right reel/overshoot/settling/pop into final glyphs; overlapping real-text crossfade. Label pulse and sweep/print treatment also exist. Number, label and full international-text fixtures are available. Unsupported precise text uses generic decoration and a fade; full real text remains in the mounted DOM and accessible text. The bitmap alphabet is newly authored, not copied.
- **Table:** type-on with moving caret, erase/retype, travelling shimmer, auto/text/number/badge/date/badge-text/text-badge placeholder treatments. Handoff uses cell/character geometry supplied by this fixture, transitions dots toward actual text, and drives actual registered rows with individual opacity and settling. Disable registered row targets to exercise the150ms whole-content fallback. No AG Grid selectors or runtime is used.
- **Skeleton:** travelling size/brightness pulse, dot dissolve and real-content crossfade.
- **Typing:** sequential dot size/opacity wave; standalone ready state stops immediately.
- **Region:** one wrapper handoff for its supplied content, without competing nested clocks.

The model demonstrates the engine seam, not pixel-identical source parity, a shipped renderer decision, complete content semantics or production integration.

## Shared engine and controls

`engine.js` contains the single on-demand scheduler and definition runner. Built-ins in `animations.js` and custom definitions in `custom-motion.js` use the same `defineAnimation` seam, normalized options, dot writer, prepared handoff state and scoped reveal commands. Callbacks receive no raw DOM/canvas context. The application explicitly supplies geometry and target references. Reveal effects use cancellable Web Animations without committing styles over the application's declarations.

Play cycle simulates readiness after1.1s. Hold loading keeps pending; Reveal now signals readiness. Refresh retains useful visible content. Failure immediately presents recovery. Supersede begins a handoff, replaces its loading cycle, cancels its old completion and reveals the newer result. Late readiness resolves at4.1s, after decorative motion is exhausted.

Auto total duration is definition-recommended: chart900ms, the numeric text fixture461ms, table615ms, simple fade150ms, skeleton dissolve300ms. Explicit150/1800/0ms controls replace the whole timeline.1800ms is slower visual inspection, not a new default. No appended fade or website reveal.

The four-second automatic wall-clock window includes handoff. Pending cycle churn, options, pointer and preferences do not restart it. A genuinely settled ready result followed by another load can get a fresh window. An entire handoff that cannot fit is skipped. Pause/reduction and inactivity settle/suspend as appropriate; pointer lift requires opt-in fine hover and is suspended outside active pending motion. Core persistence/provider/request APIs are not introduced; local pause storage belongs only to the lab application.

The frozen-frame inspector samples a handoff at a manually selected progress without running a loop. It is explicitly a design tool, not a new public readiness state or an automatic-motion budget bypass. Its content stays inert during inspection. Finish inspection settles to ready. R/profile/family/text-fixture/target-registration switches deliberately create a new review fixture; live animation choices/options/timing/preferences update the existing instance and do not remount its content. An active handoff retains captured definition/options/timing; later choices apply to the next one.

## Checks and limitations

Run `node verify-animations.mjs` for93 focused checks covering finite/nonempty/bounded dot output, all static renderers, whole durations, handoff endpoints, revealed target endpoints, missing geometry/target fallbacks and options validation. Run the strict TypeScript fixture to verify family/phase/option and inferred custom prepared-state types:

```sh
tsc --noEmit --strict --skipLibCheck false --target ES2022 \
  --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM \
  prototypes/motion-engine/type-examples.ts
```

These are prototype/type-contract checks, not a production SDK test suite. The declarations are not generated from a shipping implementation; no React adapter or actual custom-element package is built here.

Observed in the in-app browser: chart900ms, numeric text461ms and table615ms handoffs; actual row opacity/translation stagger; all six chart idle variants; independent scramble+printText and labelPulse+lock pairings; generated tableShimmer/printText factory names; live custom option changes without a cycle reset; reduced-motion preview; pause retained across reload and immediate restricted reveal; supersession cancelling only the outgoing handoff; late readiness skipping after four seconds; missing-row-target150ms fallback; immediate failure recovery and refresh retaining visible content. Resized320px/390px layouts had no horizontal document overflow after the grid minimum-width fix. Desktop/mobile captures cover the three recipes; separate desktop captures show text and table mid-handoff. `review.jpg` is the final chart50% frozen-frame view.

Independent source/capture review found two API-harness mismatches (factory names and coupled text phase choice), both fixed and re-reviewed with no remaining material finding. The final console pass also exposed an outgoing-engine callback during the picker's empty-frame remount; disposing when the stage clears fixes that lifecycle bug. Subsequent family/profile switches produced no new captured warnings/errors. Older console errors remain historical evidence, not a claim that the initial runs were error-free. The focused93 animation checks and strict type fixture passed; application syntax passed after the final cleanup edit.

Browser review evidence is recorded in the owning ticket. Current lab checks use the Codex in-app browser and resized viewports, not physical touch or assistive-technology certification. The actual OS forced-colors/reduced-motion paths, supported browser floors, CSP/server/hydration behavior, focus-safe interactive row targets, virtualization/competing target ownership, full validators/diagnostic codes, easing overrides, cleanup instrumentation, memory/bundle sizes and reference-device performance remain shipping work under the approved release contracts. The mechanical design scan returned no findings for this surface; no new suppressions were added.

The app is static HTML/JavaScript with no installed dependencies, fonts or external services. Scope remains private Wayfinder planning: no package extraction, publication, production website, deployment or GitHub visibility change. Source and screenshots are local/uncommitted decision assets. Do not silently promote this proof of concept into production.
