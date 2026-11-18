# Dotquilt motion directions

Isolated working comparison for [Define the loading motion repertoire and pointer interaction](https://github.com/b4rb13/dot-loaders/issues/14). The ticket remains open. The owner approved the repertoire direction, total handoff timing, opt-in pointer API and remaining-window policy; no visual direction has been selected yet.

Review at [http://127.0.0.1:4178/](http://127.0.0.1:4178/). The current server binds only to localhost and serves only this directory. It is not a Vercel deployment. `index.html` and `motion.js` use no dependencies, external fonts, images or remote services. The code is an illustrative drawing model, not the package implementation or extracted m37 source.

## Review outcome — revision required

The owner rejected these three simplified directions on 2026-10-16. They are historical comparison evidence, not the selected product motion or an adequate reproduction of m37. The next exploration must preserve the actual source choreography: chart field/crest convergence into supplied geometry followed by a wipe; text scramble/reel/lock/settle followed by DOM handoff; and table type-on/cell convergence with coordinated row reveal. A simple fade or small vertical offset is not sufficient.

The owner also requires named animation variants, future variant additions through the engine, and user-authored animations with typed extra options. This revises the previously limited customization direction. The exact extension interface, richer default timing, opt-in content-target ownership and free/paid boundary remain pending in the open motion/commercial decisions. The first prototype's 150ms timeline should not be mistaken for source visual parity.

## Compare

| Direction | Axis | Benefit | Cost |
| --- | --- | --- | --- |
| Quiet | Opacity: restrained pulse and dissolve | Calm in dense or frequently used interfaces | Least distinctive; no specialized convergence |
| Flow | Direction: travelling wave, glyph lock, geometry convergence | Closest to the distinctive source character with restrained movement | More visual activity; specialized drawing needs measured implementation |
| Tactile | Position: vertical ripple and settling | Most physical dot movement and pointer response | More decorative movement; can distract beside dense content |

These names identify alternatives for discussion, not an approved public preset catalog. The palette, typography, surrounding layout and content stay fixed. The bottom picker follows the prototype skill's exact supplied chrome and wiring. Use 1–3 or left/right arrows to switch and R to replay; input controls retain their own keys. The picker highlight may animate, but specimen switches are instant.

Each direction includes skeleton primitives, text, line/bar/scatter charts, table, typing dots and a representative region. Typing stops without a content morph. Region uses one wrapper handoff rather than separate child clocks. Chart/table destinations are supplied fixture geometry; the model does not manipulate application chart instances or table rows. International text demonstrates the generic decorative fallback and preserves its full real text.

## Controls and timing

- Play cycle: application-owned pending state followed by readiness after 1.4 seconds.
- Hold pending: wait until Reveal content or another application action.
- Reveal content: use the configured total handoff duration when allowed.
- Refresh: keep supplied content visible and interactive with a small separate loading mark.
- Fail load: show an immediate recovery outcome with no success morph; Play cycle retries.
- Interrupt test: begin handoff, supersede it 50ms later, then let the new cycle become ready. The observations list shows cancellation and the new cycle's completion.
- Late readiness: resolve after 4.1 seconds; decorative motion stops first and readiness reveals immediately.
- Handoff timing: 150ms default, explicit 300ms, or 600ms for 4× inspection. Inspection changes only the handoff, not the four-second wall-clock window.
- Pointer lift: off by default; only skeleton/text/chart/table support it. Fine hover pointer required. Tracking is detached when paused, inactive, exhausted, ready or in handoff. Radius/displacement/growth are internal comparative values, not new public controls.
- Reduced-motion preview and persistent local Pause animations: static pending decoration and immediate readiness. OS reduction also restricts motion. Resume never resets an already-started window.

The window begins with the first motion. Pending cycles, setting changes and supersession cannot rearm it. A genuinely settled ready state permits a new window for a new load. If the configured handoff cannot fit in the remaining window, it is skipped. Owned recurring animation work stops when hidden/offscreen or inactive; readiness timers remain application simulation.

The picker, family, chart-shape and international-fixture switches deliberately create a new study instance. They compare different fixtures, not the package's configuration-update lifecycle. Pointer, timing, reduced-motion and pause changes operate on the current instance. The prototype does not claim a new component API for requests, failures, automatic delay or observation logs.

## Observed verification — 2026-10-16

Used the Codex in-app browser at its default desktop viewport and explicit 390px/320px responsive widths. Width overrides were reset after review. This is browser resizing, not physical touch-device testing.

- All three directions rendered and every family was reachable; chart line/bar/scatter selection worked.
- Pending decoration became static after four seconds; readiness afterward revealed immediately.
- Opt-in pointer tracking entered the eligible active state and detached on window exhaustion. Actual pointer feel remains part of human review.
- Reduced-motion preview used static decoration and immediate reveal. Clearing it restored the correct pending message without resetting the window.
- Pause persisted across reload and was then cleared for the handoff. Keyboard 1 switched direction; input controls retained their selection behavior.
- Interrupted 600ms handoff was superseded and the newer cycle completed; observations retain the cancellation sequence.
- Refresh showed existing chart SVG and labels throughout. Failure displayed its recovery outcome.
- Full Armenian/Arabic/emoji text was visible after handoff. No horizontal page overflow was observed in the checked narrow layouts.
- Browser warning/error log was empty in the final checked run. JavaScript syntax check passed.
- Independent source/screenshot review found scatter destinations incorrectly followed an interpolated line, and resumed motion retained a static status message. Both were corrected and the reviewer scored both findings resolved. This was a limited prototype review, not production approval.

The mechanical design detector reported tiny supporting text; it was raised to at least 12px. No new findings were suppressed. Exact picker chrome remains intentional. Its fixed position can overlap page content on narrow screens; scroll the specimen controls into view to operate them. No broader product/brand documentation or pre-existing prototype styling was changed.

Saved evidence includes `quiet-desktop.jpg`, `flow-desktop.jpg`, `tactile-desktop.jpg`, matching `*-mobile.jpg` captures at 390px, `international-mobile.jpg` (pending fallback), `table-mobile.jpg` (ready reduced-motion outcome), and corrected `scatter-desktop.jpg` / `scatter-mobile.jpg` (320px). Screenshots are layout/state evidence, not recordings of motion quality.

Real OS reduced-motion/forced-colors settings, assistive technology, real touch/pointer hardware, supported browser floors, server rendering, strict CSP, cleanup instrumentation, packed consumer integration, flashing analysis and reference-device performance remain future release validation. The forced-colors CSS/static alternative exists but was not exercised through actual OS high-contrast settings. These files do not certify the existing size, rendering or accessibility budgets.

No production source has been created, no m37 file was edited or copied, no npm package was published, and no GitHub visibility or deployment change occurred. These local planning assets have not been committed or pushed. Retain them through human selection and final ticket resolution as decision evidence; later implementation must not silently promote this model into production.
