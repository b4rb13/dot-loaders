# Dotquilt audit — 2026-11-18

What I checked: build, typecheck, lint and all unit tests (run locally); the production website (run, clicked through every page at desktop and phone width); a code read of the runtime (`packages/core`), the React adapter (`packages/react`), the website (`apps/website`), and the tests/scripts/tooling. GitHub issues were reviewed too. Spot-checks of the reviewers' main claims are noted where I confirmed them.

## Progress

**Phase 0 — done (2026-11-18).**
- The code is committed on `chore/phase-0-baseline` and pushed.
- Evidence is archived in `../dot-loaders-archive/`.
- The freeze gate is removed and `AGENTS.md`/`README` are rewritten.

**Phase 1 — mostly done (2026-11-18).**
- **Commands:**
  - `bun run test`: unit tests only, about 1 s
  - `bun run test:e2e`: Chromium against the workspace build, no tarballs
  - `bun run verify`: everything CI runs, about 3 min locally
- **New `tests/e2e`:** all 9 components get pending/ready/layout checks plus light/dark screenshots. It reproduces the TableLoader overflow as a known failure.
- **Native suite:** `tests/browser` runs against the workspace build. A hash-mode CSP fixture bug is fixed.
- **Legacy suites:** all slow suites now run through one `bun run test:legacy`.
- **Deleted:**
  - about 40 evidence scripts
  - 5 orphan configs
  - the micro-cost specs
  - the old website tests
  - the old budget machinery
- **Hash goldens:** replaced by invariants plus readable snapshots.
- **Size:** `bun run size` reports sizes without enforcing budgets.
- **CI:** `quality.yml` runs the checks above; `legacy.yml` runs on demand.
- **Left over:**
  - ~~React adapter client tests in the fast suite.~~ Done when the legacy suites were ported: the React suite is the `react-chromium` project of `bun run test:e2e` (39 tests, about 17 s) and runs in CI on every runtime change. The legacy runner keeps only the React 19.0 rerun and catalog SSR under Node and Bun.
  - Porting the legacy suites component by component.
  - Size budgets, pending decision 1.

**Phase 4a — done (2026-11-18).**
- **Round 1** (Sashiko, Overprint, Flipdot) was rejected as not serious.
- **Round 2:** the owner picked System from Precision, Reference and System, and asked for it to be smoother and more elegant.
- **Locked:** the refined System is locked as [design/SPEC.md](design/SPEC.md), with [design/tokens.css](design/tokens.css). Mockups are in `design/directions*/`.
- **Marks:** dot by default; dash and square are offered as a component option.

**Phase 4b — done (2026-11-19; its last open question, reduced motion, was decided 2026-11-20).** The components' default look, built to [design/SPEC.md](design/SPEC.md). Phase 3 is done; its last item, one renderer per element, is settled by decision 2. Slices go by family, so each PR leaves its family consistent:
- **A. Marks and the skeleton family — done on `design/4b-skeleton`.**
  - **One marks module:** `internal/marks.ts` holds the default mark size (4.4 px), gap (4.6 px), colours, resting opacity (37%), glow peak (90%) and the CSS dot grid.
  - **Static look:** skeleton blocks, lines, circles and text use it, both before upgrade and after.
  - **Idle:** a soft teal glow drifts across every 2.8 s on a sine curve, with a Gaussian edge, while the field breathes −14% to 0 every 3.2 s.
  - **Lines are two rows of marks tall** (18 px by default, was 0.875em), as in the mockup, so no row is clipped in half. Blocks and circles centre their grid.
  - **Handoff:** the skeleton dissolve fields start on the same grid offset as the CSS, so marks don't jump when the handoff begins.
- **B. Region and skeleton handoff — done on `design/4b-handoff`.**
  - **Region:** content fades in over 700 ms while a 2 px blur clears, and rises 5 px over 910 ms. The handoff is 1.1 s by default, and an explicit `timing.duration` scales every part.
  - **Skeleton marks:** they leave from left to right in bands, each band over half the handoff. Marks dim, shrink 30% and drift up 3 px, and the skeleton's layer holds until they are gone. An explicit `dissolve()` keeps its documented fall and does not shrink.
  - **Out of scope:** ChartLoader, TableLoader and custom handoffs keep their shared clock (their drawing follows the content's progress); their slices change them.
  - **Reduced motion:** the handoff swaps at once. Decided 2026-11-20 by the owner: keep the instant handoff instead of the 240 ms fade an earlier spec draft asked for. The spec now says so, and the tests that pin the immediate handoff stay.
  - **Layout tests:** they now subtract the content layer's rise before comparing positions. A transform is not a layout shift, and CLS ignores it too.
- **C. ChartLoader — done on `design/4b-chart`.**
  - **Idle:** a faint field (about 5%) with a soft ridge line up to about 63% and a 26% shaded area under it. The ridge drifts on two slow sines, the field breathes, and a teal glow drifts across every 2.8 s, drawn as accent marks over the resting ones.
  - **Marks:** every mark is the same size, and the grid starts half a pitch in, like the CSS grid. The static field before upgrade sits at 15%.
  - **Handoff:** morph-wipe, 1.1 s. Columns finish gliding onto the data by 55%, turning teal, and the real chart draws in from 48% to the end.
  - **Painter colours:** both painters now default to the spec's slate and glow instead of `currentColor`. This also affects TextLoader and custom animations.
  - **Other variants:** `ridgeHeight` is the new ridge, so variants built on it (cycle, terrain and others) share it. Their own tuning is slice H.
- **D. TableLoader — done on `design/4b-table`.**
  - **Idle:** the default is now the spec's still bars under the drifting glow (`tableShimmer`). Each bar is two rows of uniform marks at the resting opacity, and the field breathes. Type-on is still available as a variant.
  - **Rows handoff:** rows start 80 ms apart and cells 28 ms apart, and rows settle 5 px, in 1.1 s. Without per-row targets the content fades and rises over 700 ms instead of 150 ms.
  - **Static outline:** slate at the resting opacity, styled from CSS, so the server markup and React parity are unchanged.
- **E. TextLoader — done on `design/4b-text`.**
  - **Idle:** each character changes about every 280 ms, offset slightly per character so they don't flip together, and cross-fades over 260 ms. Unlit glyph pixels show faintly, and the teal glow drifts across every 2.8 s.
  - **Lock handoff:** characters lock left to right across at most 460 ms (40 ms each), each easing from the reel into the real character over 300 ms, with no pop (`pop` 0). A 10-character lock takes 815 ms.
  - **Colours:** the glyphs draw in slate through the painter default (slice C).
- **F. TypingDots and default sizes — done on `design/4b-typing`.**
  - **Size:** TypingDots are 8 px slate dots, 6 px apart (the mockup's size), so they read as a status rather than a speck. They use `--dotquilt-dot-size` and `--dotquilt-dot-gap` with their own defaults.
  - **Motion:** a calm sine wave from 30% to 100% over 1.9 s, each dot 14% of a cycle behind, rising 1.5 px. The easing sits on the keyframes, so speed changes keep the phase.
  - **Other defaults:** skeleton lines are two rows tall (slice A), and charts keep 12rem. Their sizes already read well at the new mark size.
- **G. Alternative marks — done on `design/4b-marks`.**
  - **Option:** `mark` is `dot` (default), `dash` or `square` on every element that draws marks: attribute, property, `update()`, `renderStatic` and the React prop. A region has none. An unknown value draws dots and reports the option as invalid.
  - **CSS surfaces:** skeletons, lines, text lines and the chart's static field draw squares and dashes with CSS masks, so a strict CSP still works. Lines are two rows of the mark tall: 17 px for squares, 19 px for dashes. Static markup carries a mark's CSS only when it uses one, so default server output is unchanged.
  - **Painters and handoff:** the SVG and Canvas painters draw rounded rectangles. The dissolve leaves as the same shapes, on the same grid. Chart and table fields use the mark's own pitch across and down.
  - **TypingDots and TextLoader:** squares are 90% of the dot size; dashes are 80% of it tall and 2.7 times as wide (the mockup). TextLoader's squares make a pixel font.
  - **Size:** the mark rules add about 1.5 KB gzip across the nine external stylesheets. The owner raised the legacy catalog SSR gate (24 loaders with every external stylesheet) from 8 KB to 9 KB; the page then measured 8.36 KB. The refresh cue took it to about 9.2 KB, and the owner raised the gate to 9.5 KB (2026-11-19).
  - **Follow-ups:**
    - ~~On charts, dashes stay horizontal.~~ Done (2026-11-20): a mark command takes an optional `angle` (radians, clockwise), which both painters draw and captures keep. With dashes, the chart idle turns the marks on its ridge to its slope (the shaded area stays level; bars and scatter have no line), and the handoff turns the marks that land on the line to its direction.
    - Squares and dashes have a fixed size, so `--dotquilt-dot-size` and `--dotquilt-dot-gap` change dots only. That is the spec ("The size and gap properties apply to dots only"), not a gap.
- **I. Feature parity restored — 2026-11-19, at the owner's request ("make sure we have all the functionality we had before").**
  - **Animations:** the six variants slice H dropped are back: chart idles `scan`, `terrain` and `cycle` (moves between line, bars and scatter), and text `scrambleCharacters`, `scrambleWords` and `printText`. They follow the spec's rule that every mark is the same size, with shape coming from opacity. The kept recipes draw exactly as before (all 144 snapshot cases unchanged).
  - **Pointer lift:** `pointer-response="lift"` on skeletons again lights the marks around the pointer, now as a glow that follows it, for as long as the placeholder shows. After the redesign it only brightened the drifting glow band, and only during the first seconds.
  - **Playground and docs:** every option the old playground had is back: pointer lift, every animation with its own sliders (written into the code and the link), the handoff length, lines/rows/dots, text samples (including international text), table cell styles. The docs list `pointerResponse` and every animation's options; the gallery has examples for each restored feature.
- **H. Prune old variants — done on `design/4b-prune`.** Each built-in recipe was kept, changed or dropped:
  - **Kept as defaults** (already reworked in A–F): `pulse`, `dissolve`, `ridge`, `morphWipe`, `tableShimmer`, `rows`, `scramble`, `lock`.
  - **Kept as options:**
    - `bars` and `scatter`: they match those chart types; now uniform marks under the shared glow.
    - `typeOn`: still bars that grow.
    - `labelPulse`: a calmer text idle than the scramble.
    - `fade`: a plain text handoff.
  - **Dropped:**
    - `scan`, `terrain` and `cycle`: novelty silhouettes; the spec says "No novelty".
    - `scrambleCharacters` and `scrambleWords`: the default scramble now changes characters one at a time.
    - `printText`: its clip print is covered by `lock`.
  - **Tests:** the M4 text-scramble suite went with its variants, and the other tests use the kept recipes.

Mapping the spec's marks onto the runtime (an open detail in the spec):
- **Colours:** the base colour comes from `light-dark()`, so it follows the page's `color-scheme`.
- **One resting opacity:** CSS can't switch a number between light and dark, so both themes use 37%. The dark mark is #A3AFC2, which at 37% on the dark surface matches the spec's #8E99AB at 44%. The glow peaks at 90% in both themes.

**Phases 4c and 4d — done (2026-11-19).** The Astro + Starlight site is live on dotquilt.dev: homepage, docs, examples and playground (see the plan below).

**Phase 4e — in progress (2026-11-20).** Visual QA and an accessibility pass over every page, at 1440 px and 390 px, light and dark:
- **Fixed:**
  - `faint` text was 2.8–3.4:1. The token is now #687080 / #8A94A2, so every text colour meets AA on `bg`, `surface` and `subtle` (design/SPEC.md).
  - The homepage and playground sliders, and the playground's option menus, had no accessible name: each label named its `<output>`, the first form control inside it.
  - At 320 px (WCAG reflow), "Copy page" pushed the LoadingRegion page sideways, and the TableLoader preview cut off its Due column; the preview table now scrolls sideways in its card when it can't fit.
  - Phones: the dark-mode menu button was an inverted bright disc; code in table cells broke mid-name; the license kept its 80-column line breaks.
- **Checked and fine:** visible focus on every tab stop, headings and landmarks, page language, unique ids, named regions, nothing looping under reduced motion, and tap targets (the small ones pass WCAG 2.5.8 by spacing).
- **Kept as tests** (`tests/site/accessibility.spec.ts`, and the 320 px check in `site.spec.ts`): AA text contrast on every page in both themes, a name on every form control, visible focus, and no sideways scroll or cut-off text at 320 px.
- **Left:** your sign-off against the spec, and a screen-reader run on a real device. Pixel baselines for pages wait until the site's look settles, since you deferred site polish.

**Phase 2 — done (2026-11-18).**

Fixed, each with a regression test that fails on the old code:
- **Layout under app `display` rules:** regions and TextLoader overlay their layers inside their own grid; TableLoader and TypingDots no longer rely on the host's display.
- **Page-wide invalidation:** changes to unrelated elements now cost zero layout reads (before: 60–1,200 per loader); ancestor changes cost a small, bounded check.
- **Per-frame work:** the owner and motion restriction are cached, and media queries are reused.
- **Frame loop:** one throwing client no longer stops all animation.
- **Small bugs:**
  - `state = undefined`
  - TableLoader NaN pointer at zero size
  - the renderer not switching when the idle animation changes
  - #35 stale pointer on touch
- **Simple reveals:** they are no longer cut short by content updates.
- **React hydration snapshot:** it no longer copies another root's attributes.

Pre-existing legacy failures, the same on the pre-Phase-2 code (they need triage while porting):
- M4: 12
- table-options: 8
- table-parts: 5
- shared-wrapper: 16
- motion-review: does not start; its server needs table fixtures that only `prepare-table` creates, which runs later.
- next: its build stops because Next 16.4.2 has a published security advisory. The suite needs a Next upgrade before it can run.

All other legacy suites pass: native (packed), react, chart-production, table, presets, coordination, api, copies and layout.

Not done yet:
- React style de-duplication (one stylesheet per instance). Done in Phase 3, see below.
- Hiding pending SSR content before upgrade. Tried and reverted: the legacy React suite requires pending server content to stay visible and usable without JavaScript. Now decision 11.

**Phase 3 — done (2026-11-18).**

Done, with no behaviour change; the e2e, unit and legacy suites are the safety net:
- **Shared Chart/Table base.** `internal/dense-loader.ts` holds the shared behaviour. `chart.ts` and `table.ts` keep only their family-specific hooks: defaults, projection, surface and extra attributes.
- **Named handoff types.**
  - `HandoffSource`, `HandoffRequest` and `RunningHandoff` replace the positional tuples (`work[5]`, `work[4][1]`, 9-argument factories).
  - `IdleFrame` and `HandoffFrame` replace the 6- and 10-argument paint calls.
- **React in plain JSX.** The custom-element names are declared in `src/jsx.d.ts`, which `tsc` does not emit. The server-rendered markup is byte-identical across all components and style policies.
- **Consistent option errors and `update()`.** Decided with the owner on 2026-11-18. This one changes behaviour on purpose.
  - A scalar option with a disallowed value reports `invalid-option`, and the field is the property name (`speed`, `pointerResponse`, `rowHeight`, `state`, `motion` and so on), on every element. These codes are gone: `invalid-number`, `invalid-pointer-response`, `invalid-count`, `invalid-state`, `invalid-motion`, `invalid-speed`, and attribute names as fields.
  - TextLoader now reports an invalid `speed` and `pointerResponse` the same way as the other elements.
  - `update()` applies only the element's own options and reports any other key as `unknown-option`. Before, the skeleton family, Chart and Table stored unknown keys as expandos.
  - Structured and limit problems keep their own codes, for example `invalid-binding`, `invalid-style-policy`, `line-limit` and `typing-limit`.

Following decisions 2 and 5 (decided 2026-11-18, see the decisions list):
- **Renderer proof removed.** Done on `refactor/renderer-proof`.
  - The four benchmark-only modules in `src/internal/dense/` (`painter`, `view`, `projection`, `recipes`, 768 lines) and the `usePainterForProof` hook are deleted.
  - The M2 proof suite (`tests/browser/m2.spec.ts` with its `/m2` pages) and the renderer benchmark (`scripts/bench`, `tests/bench`, the trace manifests) go with them. They only ever ran the proof candidates, never the shipped painters.
  - A new test runs both shipped painters, SVG and Canvas: the 4,096-dot cap, invalid and late dots, and releasing every reservation.
  - The `/m2/catalog` page stays: the renderer and layout tests use it with the real loaders.
- **Cross-copy layer removed.** Done on `refactor/one-copy`.
  - **Registration:** only the exact class this copy defined counts as registered. A second copy of the library, even the same version, gets `registration-conflict` with a message saying to load one copy. The build-identity brand and the build step that wrote it are deleted.
  - **Private symbols:** the animation, appearance, handoff and style-refresh symbols are now module-private. A binding made by another copy is reported as `invalid-binding`.
  - **One budget:** the four dot budgets (SVG painter, Canvas painter, skeleton handoff and TextLoader) are one module, `internal/ledger.ts`.
  - **Five global keys stay:** the budget, the frame loop, the surface reader, pointer position and painter capture. They are only inspection points for tests, not a protocol between copies.
  - **Counts:** distinct `Symbol.for` keys go from 12 to 5 and `Reflect` calls from 48 to 32. The 84-test copies suite is deleted, and the two tests that expected sharing now expect a second copy to be refused.
  - **Early registration has to share the app's module graph.** The React fixture's early script used to be a separate bundle, which is a second copy. It now builds with the client as ES modules sharing one chunk. Apps that register in a separate early script need the same setup.

- **Typed table layout.** `staticTableLayout()` is a typed export of `@dotquilt-internal/core/table`. It replaces the `Symbol.for('dotquilt.table.static.v1')` hook that React read off the `TableLoader` class. The dead `react/src/internal/table-static` build is deleted. React's server markup is byte-identical.

- **Export surface.** Decided with the owner on 2026-11-18.
  - The ten stylesheet entries in each package's export map are now one `./styles/*.css` pattern onto the top-level `dist/*.css` files. The public paths are unchanged.
  - Core goes from 24 to 15 entries, React from 18 to 9.
  - The JavaScript entries stay as they are. Each one keeps imports selective or keeps server code apart.
  - `scripts/package-exports.test.ts` checks that every stylesheet resolves and that the pattern cannot reach anything else.

- **React style de-duplication.** Done on `refactor/react-style-dedup`.
  - In the default inline policy, each React loader rendered its own copy of its pre-upgrade `<style>`; a page with 50 skeletons had 50 copies. Now each component's CSS renders as `<style href precedence>`, and React keeps one copy per document, on React 19.0 and 19.3 alike.
  - Each component has its own precedence, so React never merges two components' CSS into one element. Every stylesheet's text stays exactly the exported string, and CSP hashes of `react*Styles` still match.
  - **Nonce policy:** unchanged, one `<style nonce>` per loader. React 19.0 cannot put a nonce on a shared stylesheet. React 19.3 only does when the app also passes a style nonce to its render call, which the adapter can't check.
  - **External policy:** unchanged, one `<link>` per loader. The browser fetches the file once. A `<link precedence>` would suspend rendering until the file loads, which can blank a Suspense fallback built from loaders.

**Test rework — done on `test/rework-suites` (2026-11-18).**

The legacy runner took about 14 minutes and always failed 41 tests. Those tests were stale: they waited for SVG `<circle>` elements that the Canvas renderer no longer draws, or ran on build artifacts nothing produces any more. The triage found one real bug: TableLoader's painter was offset from the content box. That is fixed on PR #41.

Where things stand now:
- **`bun run verify`:** about 3.8 min. It includes 791 browser tests, which run in parallel against the workspace build. Every ported suite is a project in `playwright.config.ts`.
  - Coordination, presets, table, shared-wrapper, api, copies, react and m4 were ported with their tests intact, apart from the deletions below.
  - Their previously failing tests now pass, because they read the Canvas paint.
  - Layout runs in parallel too. A late external stylesheet is now held deterministically by its own test (see the follow-up below).
- **`scripts/pack-smoke.test.ts`:** the packed file list, manifests, Node and Bun imports of every export, consumer types on TS 7 and 5.7, the dist import graph, the dense-renderer leak and the `'use client'` directives. `packages/react/test/table-parity.test.ts` checks native/React static table parity.
- **`bun run test:legacy`:** under a minute. It reruns the React suite on React 19.0 (the oldest supported version, which takes a different nonce hydration path) and checks catalog SSR under Node and Bun.

Deleted:
- **Packed rerun:** the packed rerun of `tests/browser`.
- **Next suite:** it can't build because of a Next security advisory. Uncovered now: new owners keeping the document's nonce or stylesheet after a soft client navigation.
- **Stale checks:** chart-production, table-options and motion-review, each replaced by fast tests.
- **Outdated variants:** React 19.1 and 19.2, which take the same path as 19.0.
- **Hash and evidence tests:** tests that only pinned bundle hashes or wrote evidence files.

Follow-ups:
- ~~With an external stylesheet arriving late, layout shifted by a 0.94 score under CPU load.~~ Done: a real bug, not test timing. Upgraded hosts rendered their shadow tree unstyled until its `<link>` loaded, which happens on slow networks, uncached stylesheets and busy main threads. They now keep their static presentation until the stylesheet applies (`:state(unstyled)`).
- `prototypes/m4-owner-review` read the old m4 prepare output and no longer runs.

## TL;DR

- **The product works.** All nine components exist as native elements plus React wrappers with SSR output. The website (homepage, 9 reference pages, 24-recipe gallery, playground, guides, search) builds and runs. Most loading → reveal handoffs look good.
- **The code is not in git.** There are 6 commits, all docs. `packages/`, `apps/`, `tests/`, `scripts/`, every config and `bun.lock` are untracked. One disk problem and everything is gone. CI has never run.
- **The process went off the rails.** Weeks went into byte-golfing (e.g. ~10 rejected "studies" trying to get Region from 6,420 B to 6,144 B) and into "evidence packets":
  - `docs/implementation` is 335 MB, with 44 MB JSON files
  - `.artifacts/` is 16 GB
  - `AGENTS.md` is 91 KB of status log
  - there are 26 `record-*` scripts

  Real bugs that were found were deliberately left unfixed because the runtime was "frozen" (#35).
- **The fix is keep-and-refactor, not rewrite, for the runtime.** It is ~9.7k lines with a sound core model. The damage is in the plumbing, the tooling and the process.
- **Everything visual gets reworked from scratch, by owner decision (2026-11-18).** That covers the website, the docs, the playground/gallery and the components' default look. It is not a polish pass. The current site and visuals are reference material only.

## What is done

| Area | State |
| --- | --- |
| Native core | 9 custom elements, a shared loading controller (pending/refreshing/ready, focus/inert), dot painter (SVG + Canvas), presets, custom animation API, static/SSR helpers |
| React adapter | Thin wrappers for all 9, SSR markup, StrictMode/hydration handled deliberately |
| Website | Homepage, `/docs` Quickstart, 9 component pages with live handoff + settings + copyable code, 24-recipe gallery, playground, React/Next/SSR/CSP guides, local search |
| Build / typecheck / lint | Pass (`bun run build`, `check`, `lint`; Biome checks 493 files) |
| Unit tests | Core 77 pass. React SSR tests pass. Bench harness 24 pass. **Website 22/23: one fails** (`apps/website/lib/highlight-excerpt.test.ts`; the highlighter maps Shiki theme hex colours to CSS classes, which is fragile) |
| Browser tests | About 430 Playwright tests across 22 configs (about 2,600 runs across engines and React/Next versions). Not run here: each needs a `prepare:*` step, a packed tarball and 30+ minutes |
| `verify:packed` | Passes |
| Size budgets | Per the project's own records: about 10 size groups fail and `verify:m4` cannot pass by design |

## Visual check (production build, run locally)

These findings describe the current site, which will be replaced (see Phase 4). They are kept here so the rebuild avoids the same mistakes. Finding 1 also exposes a component robustness bug that is fixed in Phase 2 regardless.

What works:
- homepage hero reveal ("ready." from dots)
- chart ridge → line handoff
- text scramble → reveal
- skeleton block/line/circle/text, LoadingRegion and TypingDots pages
- gallery start/refresh/reveal
- playground
- no horizontal overflow at 375 px

Problems found:
1. **TableLoader page is visibly broken.** In pending state the dot table draws *below* the preview box, over the buttons and text, and the box stays empty. This also happens on mobile.
   - Root cause: [apps/website/app/catalog.css:63](apps/website/app/catalog.css:63) sets `display:block` on the loader. That overrides the component's own `:host{display:grid}` overlay, so the hidden static SVG (170 px) pushes the live Canvas/SVG down.
   - Two bugs in one: a site CSS bug, and a fragile component that breaks when a consumer sets `display`.
   - None of the ~240 reference-page browser tests caught it.
2. **Placeholders are too faint on the dark theme.** Skeleton text and block dots are near-invisible. TypingDots is a 14×16 px grey speck in a ~180 px empty box.
3. **The playground placeholder sits in the wrong place.** Skeleton lines appear at the bottom of the preview box while the real content starts at the top.
4. **Homepage table specimen:** the revealed table renders in a smaller font than the "Your table" reference next to it.
5. **Docs copy leaks internal jargon and stale claims.** For example, the Quickstart says "Get the frozen core and React tarballs from your reviewed local build" and "Gallery, local search … follow", although both exist ([content/docs/index.mdx:18,53-55](apps/website/content/docs/index.mdx:18)).

## Bugs in the code (ranked)

Confirmed by me in source:

1. **Document-wide invalidation storm.** [services.ts:29-52](packages/core/src/internal/services.ts:29) watches `class`, `style` and `hidden` on the *whole document* (`subtree:true`) and notifies every loader. TextLoader then re-measures glyphs and Chart/Table refresh and release bitmaps. Any app that animates inline styles (framer-motion, a progress bar) makes every loader do layout work every frame.
2. **One throwing callback kills all animation.** The shared frame loop has no per-callback `try/catch` ([frames.ts:15-20](packages/core/src/internal/frames.ts:15)), so one error stops the loop for the whole document.
3. **Errors are reported once per element, forever.** The `#issues` set is never cleared ([element.ts:21,151](packages/core/src/internal/element.ts:21)). A repeated failure is silent.
4. **`el.state = undefined` writes the string `"undefined"`.** That is read back as pending ([loading-controller.ts:103](packages/core/src/internal/loading-controller.ts:103)).
5. **Hard-coded 4 s motion window** ([time.ts](packages/core/src/internal/time.ts)). Idle motion freezes after 4 s. ~~Loads longer than about 3 s skipped the handoff entirely.~~ Fixed 2026-11-19 (decision 3): the handoff ignores the window.

Reported by the reviewers (high/medium confidence, not all re-verified):

6. **Pending SSR content is visible before JS.** `renderStatic({kind:'region'})` emits only `:host` rules, which match nothing in light DOM. Pending content is visible and exposed to screen readers until upgrade. The native no-JS test passes only because its fixture adds `hidden inert` itself (`tests/browser/server.ts:218`). *Phase 2 update:* this is a deliberate trade-off rather than a plain bug. The legacy React suite requires pending content to stay usable when JavaScript is off or fails. See decision 11.
7. **Heavy per-frame work.** Chart, Table and Text do ancestor walks plus a fresh `matchMedia()` per element per frame. The micro-optimisation effort went to attribute-string caching instead.
8. **Handoffs get cut short.**
   - Any content mutation or slotchange in a region ends the handoff as `geometry-changed`; React follow-up effects trigger this.
   - A font finishing loading refreshes the region.
   - A resize mid-handoff is reported as `animation-failed`.
9. **Stale pointer position after a capability change** (GitHub #35). Found, reproduced and left unfixed because of the freeze.
10. **React: hydration snapshot can read another element.** It scans the whole document for a `useId` match ([packages/react/src/static.tsx:89-120](packages/react/src/static.tsx:89), confirmed). `useId` is only unique per root, so with multiple roots it can copy another loader's `aria-hidden`/`inert`. The scan is also O(n²) across instances.
11. **React: a full family `<style>` per instance.** 30 skeleton lines produce 30 identical style tags, which also break consumer `:first-child`/`+` selectors.
12. **React: errors are swallowed and mislabelled** as `field:'registration'`, and re-fired on every render.
13. **Smaller bugs:**
    - Table's pointer handler lacks Chart's zero-size guard (NaN reaches the painter).
    - The Chart/Table runner never swaps when the idle binding changes.
    - With declarative shadow DOM, the region never renders.
    - TextLoader inherits `role="group"`.
    - The `motion` attribute on any ancestor `div` pauses loaders (name collision).
14. **TextLoader's effect only works for ≤256 printable ASCII characters, single-line, LTR.** Anything else falls back. That is a hard limit for international content.

## What is not tested properly

- **No fast feedback loop.**
  - `bun run test` builds the whole Next site first.
  - Browser suites need a packed tarball and a `prepare:*` script, and most configs read `.artifacts/*.json` at load.
  - All configs use `workers: 1`.
- **No DOM-level unit tests for the controller.** The core unit tests are pure logic (option parsing, preset freezing, hashed golden fixtures). Focus, controller, observer and scheduler behaviour is covered only by the heavy Playwright suites.
- **Brittle tests that protect nothing user-visible:**
  - `paint-cost.spec.ts` proxies the global `String` and asserts exactly 51 conversions; `frame-cost.spec.ts` patches `Set.prototype[Symbol.iterator]`.
  - About 14 imports of private `dist/internal/*` files.
  - sha256 golden fixtures with no regeneration script and no readable diff.
  - Bundle-hash assertions inside browser tests.
  - Byte budgets with 1–5 B of headroom.
- **Red by design.** `verify:m4` cannot pass, 12 known website failures are left un-annotated, and timing gates have failed for weeks.
- **Untested:**
  - real visual layout (the TableLoader bug above)
  - external DOM churn cost
  - handoff truncation
  - error dedupe
  - multiple React roots
  - style duplication
  - frame-loop exception isolation
- **The good parts are worth keeping:** `tests/browser/native.spec.ts` (focus, event order, reduced motion, CSP), the website specs (`getByRole`-heavy, 320 px, forced colours), `tests/react/adapter.spec.ts` (hydration keeps input/focus), and the packed-type consumer tests.

## What needs rework

**Tooling and process (highest leverage):**
- **The website build refuses to run if any runtime file changes.** [apps/website/scripts/prepare.ts](apps/website/scripts/prepare.ts) hashes 303 "frozen" files, plus tarballs at absolute `/Users/...` paths. Fixing any bug breaks `dev` and `build`. It cannot build on another machine or in CI.
- **The website build can run before or during the package build.** `apps/website/turbo.json` overrides `build.dependsOn` to `[]`.
- **CI was never committed and would fail if it were.**
  - `.github/workflows/quality.yml` has a 15-minute timeout, while `test:m4` alone takes about 8 minutes.
  - The budget gate fails by design.
  - It hard-codes `/private/tmp`, which only exists on macOS.
- **Toolchain mismatch.** Bun is pinned to 1.4.3 but this machine has 1.4.0. With 1–5 B of headroom, size gates can flip between minifier versions.
- **Clutter to delete or archive:**
  - about 43 one-off evidence scripts
  - 5 orphan Playwright configs
  - 13 changesets for never-released packages
  - 72 MB of `.impeccable` screenshots inside the app
- **`AGENTS.md` is a 91 KB status log** that every agent session loads. It encodes the freeze/authorisation rules that blocked bug fixes.

**Runtime (keep and refactor):**
- **Keep:**
  - the loading controller (state machine and focus logic are sound)
  - element base classes
  - region, typing, the skeleton family
  - static/server helpers (after fixing the region CSS)
  - preset capture
  - recipe math
- **Rewrite:**
  - The `services.ts` invalidation model: notify only affected elements, never release bitmaps on unrelated changes.
  - Positional-tuple protocols: `work[5]`, `work[4][1]`, 9-argument prepare functions, numeric expandos on SVG nodes. Replace them with named types such as `HandoffPlan`.
  - The cross-copy `Symbol.for`/`Reflect` layer: about 13 symbols, 61 `Reflect.*` calls and four separate dot ledgers, all to let two copies of the library share a page. That is a niche case that shaped the whole design.
  - Chart and Table, which are about 80% identical: give them a shared base.
  - Remove ~770 lines of benchmark-only code from `src/` (`dense/painter.ts`, `view.ts`, `projection.ts`, `recipes.ts`, `usePainterForProof`).
  - Decide Canvas vs SVG instead of shipping both with a 400-line admission system.
- **API consistency:**
  - `update()` validates keys on some elements and blindly sets them on others.
  - An invalid `speed` reports three different error codes.
  - `pointerResponse` and `pointer-response` are both used.
  - 25 subpath exports is a lot for a v1.

**React adapter:**
- Replace the document scan with a ref-scoped hydration path.
- Dedupe styles (React 19 `<style href precedence>` or one global stylesheet).
- Write it in normal JSX.
- Replace the `Symbol.for('dotquilt.table.static.v1')` cross-package hack with a typed export.
- Delete the dead `internal/table-static` build.
- Add client tests that run without tarballs.

**Website, docs and visuals: rebuild, don't fix.** The owner dislikes the website, the docs and almost every visual part, so these are redone from scratch rather than polished. The problems below are things the new build must not repeat, not a fix list:
- **Duplicated gallery examples.** The 7 `table-shimmer-*.tsx` files differ by one line. The `projectTable` helper is copied into ~10 files; it belongs in the library.
- **"Complete files" built from minified template strings.** The new site should show real, type-checked example projects instead.
- **Overlapping systems.** There are three workbenches, two URL-settings schemas, three navigations, three themes, and Tailwind is imported twice.
- **Process jargon in user-facing copy.**
- **A resilience layer built around exotic failure cases.** It includes a CSS-fetch admission gate and a ~4k-line test suite for failed-JS recovery.
- **Weak defaults and layout.** Components break when the host's `display` is overridden, and placeholder contrast on dark backgrounds is poor.

## Plan

### Phase 0 — make it safe (½–1 day)
1. Commit the code on a branch and push it to the private repo. Exclude `.artifacts/`, and move `docs/implementation/**` evidence out of the repo (or into one compressed archive outside git) so 44 MB JSONs never enter history.
2. Replace `AGENTS.md` with a one-page guide: what the project is, how to run it, the coding rules. Drop the freeze/authorisation/evidence rules.
3. Delete the freeze gate in the website `prepare` (keep only the CSS copy) and restore `dependsOn: ["^build"]`. The old site then keeps building as a reference until the new one replaces it.
4. Install Bun 1.4.3, or relax `engines`.

### Phase 1 — a healthy dev loop and CI (2–4 days)
1. Set up three commands:
   - `bun run test`: unit tests only, seconds
   - `bun run test:e2e`: Chromium, one Playwright config with projects (native, react, next), one global setup, `workers > 1`
   - `bun run verify`: everything, all three engines
2. Organise tests by component, not by milestone.
3. Delete the evidence scripts, orphan configs and micro-cost specs. Turn sha256 goldens into readable invariants (dot counts, bounds, finite values) or diffable snapshots with a regeneration script. This also makes Phase 4's visual redesign of the recipes cheap.
4. Don't port the old website's test suites; they die with the old site.
   - Retire `tests/website`, `playwright.website*.config.ts` and `apps/website/lib/*.test.ts`, including the failing highlighter test.
   - Keep at most a build smoke test until Phase 4 replaces the site.
5. Replace the budget/baseline machinery with one size check with realistic headroom. The budgets themselves need your decision; see below.
6. Add DOM-level unit tests (happy-dom) for the controller and the React adapter.
7. Add a visual-regression check that renders each component on plain fixture pages, not the website, so it survives the site rebuild.
   - It takes one screenshot per component in pending and ready state, light and dark.
   - It would have caught the TableLoader bug.
8. Set up GitHub Actions: lint, types, unit, build, pack smoke, Chromium e2e, visual check.

### Phase 2 — fix real bugs (about 1 week)
In order:
1. TableLoader/Chart layout: make components robust when a consumer sets `display` on the host, using an internal wrapper instead of relying on `:host{display:grid}`
2. invalidation storm
3. per-frame work
4. SSR pending content hiding (blocked on decision 11)
5. frame-loop isolation and error dedupe
6. React document scan and style dedupe
7. #35 stale pointer
8. handoff truncation
9. small bugs (`state=undefined`, Table NaN, runner swap)

Each fix comes with a regression test.

### Phase 3 — de-golf the code (1–2 weeks, behind the tests from Phase 1)
- named handoff types
- shared Chart/Table base
- remove the cross-copy symbol layer
- move bench code out of `src`
- one renderer per element
- React in plain JSX
- consistent `update()`, error codes and attribute names
- trim the export surface

### Phase 4 — rework every visual part from scratch (3–5 weeks)
This is a rebuild, not a polish pass. The current site, docs and default visuals serve only as an inventory of what exists. None of their design, structure or code is carried over by default.

**4a. Design direction first (starts now, in parallel with Phases 0–3).** No code until a direction is chosen.
- Define what Dotquilt should look and feel like: brand character, typography, colour (light and dark), layout language and motion personality.
- Produce 2–3 clearly different directions as static mockups or prototypes. Each covers both the website and the components' default look. You pick one.
- Write the chosen direction down as a short design spec with tokens. That spec, not taste in the moment, is what later work is reviewed against.

**4b. Components' default look (after Phase 3, so the renderer is settled).**
- New design tokens for dot size, gap, colour, opacity and contrast minimums in light and dark. Placeholders must be clearly visible on any background.
- Rework each idle and reveal recipe against the direction: skeleton pulse/dissolve, text scramble/reveal, chart idles and convergence, table shimmer/type-on, typing dots, region handoff. Keep, change or drop each one deliberately.
- Default sizes that read well. For example, TypingDots should not render as a speck.
- The Phase 1 visual-regression fixtures become the review surface for these changes.

**4c. Docs, rewritten from zero.**
- New information architecture: Getting started → Components → Guides (React/Next, SSR, CSP, custom animations) → API reference.
- Plain-language copy written for users, with no milestone or process language.
- API tables generated from the TypeScript types, not hand-maintained.
- Every example is a real runnable project in the repo, type-checked and smoke-tested in CI. Copyable code comes from those files, not from template strings.

**4d. Website, rebuilt from scratch.**
- Build it as a new app (e.g. `apps/site`) beside the old one.
- Pages: homepage, docs, gallery, playground.
- One layout system, one theme system, one URL-settings schema and one playground/preview component reused everywhere.
- Gallery variants are generated from data rather than as copy-pasted files.
- Stack: Astro + Starlight (decision 8).
- **Homepage — redesigned 2026-11-19 (owner's pick on the design decision page: "The field becomes the page").** The first screen is the handoff itself: beside the headline, a field of marks rises into a solid teal chart line, and three metric cards hand over from square marks. Below it: the component family as live tiles, the handoff with its timeline, make-it-yours, the details list, a three-step start and a closing field. The design record is `apps/site/DESIGN.md` (with `PRODUCT.md` and the surface brief in `apps/site/.impeccable/`).
- **Examples — done 2026-11-19.** `/examples/`: the live analytics dashboard, then 15 recipes generated from one data list (`apps/site/src/components/examples/recipes.ts`), filterable by component. Each loads in view, opens its React and HTML code beside it, and links into the playground with the same settings.
- **Playground — done 2026-11-19.** `/playground/`: every component, mark, chart variant, idle and handoff animation, colour, dot size, spacing, pace and request time, with a live stage (Start loading / Reveal) and the React, HTML and CSS to match. Settings live in the URL, so a setup is a shareable link. It stays free.
- **Pricing — owner decision 2026-11-19: a free core and a one-time Pro bundle.** Free stays everything in the library: the nine components, every animation, the React adapter, the docs, the examples and the standard playground, with fixes. Pro will be complete application screens with every loading state, additional motion packs and playground export tools, sold one-time with 12 months of updates (the approved commercial policy's template-first path). The page shows Pro as coming later, with no price or checkout, until the policy's demand and terms gates pass. New pro loaders beyond the nine would need a policy amendment; existing components never move behind payment.
- Skip the exotic failure handling (CSS-fetch gates, failed-JS retry) unless it serves real users.
- ~~Delete `apps/website` and its tests when the new site reaches parity.~~ Retired early on 2026-11-19 (decision 9).

**4e. Visual QA before ship.**
- Screenshot tests per page and per component at desktop and phone width, light and dark.
- An accessibility pass: keyboard, contrast, reduced motion, screen reader on the main flows.
- Your own sign-off against the 4a spec.

**Sequencing.**
- 4a starts immediately.
- 4b waits for Phase 3.
- 4c and 4d wait for the API to settle in Phase 3; they can overlap with 4b.

### Phase 5 — ship an alpha
- ~~pick the npm name~~ `dotquilt` and `@dotquilt/react` (decision 16)
- publish `0.x`
- deploy the site behind protection
- get feedback

Before the alpha, from the product research (2026-11-19, [docs/planning/product-strategy-2026-11.md](docs/planning/product-strategy-2026-11.md)):
- **Anti-flicker timing** on LoadingRegion: a `delay` before the placeholder shows, and a minimum display time. Element Plus and react-placeholder have both; fast responses flash a placeholder today.
- **A size diet.** Entries measured 6.4–16 KB gzip, against about 2.2 KB for react-loading-skeleton. Target −30%, then lower the budgets. Native gzip up front, against the sizes before step 1:
  - Step 1 (#81): each loader loads only its own styles.
  - Step 2 (#85): the region's morph loads when its placeholder first shows.
  - Step 3 (2026-11-20): only a region hands a skeleton or TypingDots over, so the skeleton's dissolve and the morph's reading of CSS-drawn marks are the region's code now. The dissolve loads with the region, so handoffs behave exactly as before.
  - Where it stands: SkeletonBlock 10.0 → 7.0 KB (−30%), SkeletonLine and SkeletonCircle −29%, SkeletonText −28%, TypingDots 7.5 → 5.2 KB (−31%), LoadingRegion 14.5 → 11.7 KB (−19%; step 3 moved about 1.9 KB into it, and its budget went back up to that size plus 15%). Left: TextLoader (−5%), ChartLoader and TableLoader (unchanged).
  - CI's Bun (1.4.3, pinned) measures the budgets; an older local Bun can read 100–900 B differently.
  - Stopped (owner, 2026-11-20). TextLoader, ChartLoader and TableLoader stay near their sizes before step 1: TextLoader is a full loading controller (about 11 KB of its 43 KB minified), and chart and table are mostly the canvas renderer. Loading TextLoader's default reveal lazily would save about 1.2 KB (−8%) and was not taken. Moving the server-only stylesheets out of the browser bundles saved 50–130 B and grew the React bundles, so it was dropped.
- **ViewTransition compatibility.** React 19.3 made `<ViewTransition>` stable; document and test the handoff alongside it.
- **README, changelog and a publish dry run**, a Next.js example project, and React fast tests (already in `test:e2e`). The Next.js example is `examples/next` (2026-11-20): Next 16.4 with the React adapter, built by `bun run build` and checked by `tests/next` (placeholders in the server HTML, hydration without errors, a handoff after a client-side navigation).
- **Agent-ready docs:** `/llms.txt`, per-page Markdown and "Copy page".

Performance qualification on real devices comes after there are users, against budgets you choose, not before.

### Phase 6 — grow, then Pro (proposed 2026-11-19)
The full reasoning, with sources, is in the product strategy and `docs/research/2026-11/`.

**Growth (free):**
- **A shadcn registry** (`npx shadcn add dotquilt/...`). The `shadcn` package has 18.9M weekly downloads.
- **Thin, typed Vue, Svelte and Angular wrappers.** NumberFlow shows a custom element plus wrappers can reach millions of weekly downloads.
- **An AI pack:**
  - a streaming-text placeholder;
  - a tool-result region (chart, table or text placeholder for a pending tool call);
  - a status indicator for thinking, searching, working and error.

  No library shapes tool results today.
- **Auto-skeletons:** `LoadingRegion auto` measures the last rendered content, plus a CLI or Vite plugin that snapshots real components. boneyard-js reached 143k weekly downloads in seven months with this, without accessibility or CSP rigour.
- **A presets gallery and a Tailwind preset.**
- **A "What a placeholder has to get right" page.** Accessibility is a claim no competitor can make.

**Pro (after the commercial policy's 10/5/3 gates):**
- **Dotquilt Screens:** 8–12 complete app screens with every state, in React and HTML.
- **A Pro motion collection** of new animations.
- **Playground Pro:** saved presets and token/Tailwind export.
- **A Figma kit.**
- **Delivery:** a private repo and a token-gated registry, with no runtime keys.

**Later:**
- React Native;
- a devtools overlay;
- testing utilities;
- a Builder/OEM license.

## Decisions only you can make

1. ~~**Size budgets.**~~ **Decided 2026-11-19 by the owner: a gzip budget per entry, at its size then plus about 15% headroom.** `scripts/size-budgets.json` holds a native and a React budget for each of the ten entries; `bun run size` (in `verify` and CI) fails when one goes over. Raising a budget is a deliberate change in a PR that says why.
2. ~~**Renderer.**~~ **Decided 2026-11-18 (delegated to the agent): Canvas for ChartLoader and TableLoader, SVG for everything else.**
   - **Why Canvas stays:** the archived M2 study measured 6.5–9.9 ms of main-thread rendering per frame (p95) for SVG against 1.3–1.8 ms for Canvas, with ten dense loaders drawing 1,106 dots on a desktop. On a phone several times slower, the SVG cost alone fills a 16.7 ms frame. Loaders animate while the page is busiest: hydrating and receiving data.
   - **Cost for basic loaders:** none. Only the chart and table entries import Canvas.
   - **Rejected, SVG only:** it would save about 490 lines (the managed painter and its resource budget), but every user's device would pay for it on every load.
   - **What goes instead:** the 768 lines of benchmark-only proof code in `src/` and its comparison hook. The proof answered its question.
   - **Kept:** the SVG fallback for bitmaps that can't be allocated, lost contexts and dot CSS that Canvas can't honour. Revisit those conditions with the mark-styling API in Phase 4.
3. ~~**4-second motion cap.**~~ **Decided 2026-11-19 by the owner: keep the cap on idle motion, and always animate the reveal.** The idle glow still stops after 4 seconds, so a long load never loops indefinitely. The handoff runs however long the load took: it is about a second long and happens because the data arrived. Reduced motion, a pause or focus inside the content still skip it.
4. ~~**TextLoader international text.**~~ **Decided 2026-11-19 by the owner: ASCII-only is fine for v1, documented.** The character effect covers printable ASCII on one line, up to 256 characters; anything else shows a plain field of marks and fades the value in. That fallback used to draw its marks in a transparent colour, so it showed nothing; fixed with this decision. Wider support can follow the alpha.
5. ~~**Multiple library copies on one page.**~~ **Decided 2026-11-18 (delegated to the agent): one copy per page.** A second copy reports a registration error instead of sharing.
   - **The registry is global:** each tag can be defined once per document, so a second copy never owns its own elements. "Support" was glue: about 13 global symbols, ~56 `Reflect` calls, four dot ledgers and an 84-test suite.
   - **Only one case was supported:** registration already rejects a copy of another version. What remained was the same version bundled twice, which bundlers deduplicate and micro-frontends avoid by sharing the dependency.
   - **Same as peers:** React fails with a duplicate copy, and Lit warns about one in development.
   - **Timing:** nothing is published, so dropping it now breaks no one. After 1.0 it would be a breaking change.
6. ~~**Process.**~~ **Decided 2026-11-20 by the owner: keep working as now**, with normal commits, PRs and tests. The old evidence, receipt and "owner authorisation" machinery stays retired.
7. ~~**Visual direction.**~~ **Decided 2026-11-18:** "System, refined" (see design/SPEC.md). Dots stay as the core idea, with dot/dash/square as mark options.
8. ~~**Website stack.**~~ **Decided 2026-11-19 by the owner: Astro + Starlight.** It is static and light, and it brings docs navigation, an on-page table of contents and a theme switch. Pages show the native loaders directly, with React only where an example needs it. A runnable Next.js example project covers the React adapter's SSR and hydration instead of the site.
9. ~~**Old site retirement.**~~ **Decided 2026-11-19 by the owner: retire it now.** `apps/website` and its workspace, scripts and dependencies are deleted, so the old animation variants it used can be pruned (Phase 4b slice H). It stays in git history as reference; the new site is Phase 4c–4d.
10. ~~**How often errors repeat.**~~ **Decided 2026-11-19 by the owner: (b) for configuration errors and (c) for runtime failures.** Done: a loader remembers the invalid value a configuration error was reported for and clears it when the field holds a valid value; failures while loading (`animation-failed`, `invalid-geometry`, `missing-placeholder`, `missing-content`, `focus-fallback-unavailable`) clear when the owner starts a new state or cycle, for the owner and every loader inside it. A loader with no owner keeps once per element for failures. Today each loader reports a given problem once in its lifetime ("bounded diagnostics"), and legacy tests pin that. So a problem that recurs after being fixed stays silent, which weakens telemetry. Options:
    - (a) keep once per element;
    - (b) report again after the field was set to a valid value in between;
    - (c) once per loading cycle.

    I recommend (b) for configuration errors and (c) for runtime failures.
11. ~~**Pending server content before JavaScript.**~~ **Decided 2026-11-19 by the owner: (a) keep it visible and usable by default, with (d) documented** (the server-rendering guide shows how to render it `hidden`/`inert`). Today a server-rendered pending region shows its placeholder *and* its content until the runtime upgrades it. If JavaScript is off or fails to load, the content stays visible and usable. The cost is that, while JavaScript loads, people see both and screen readers announce content that is not ready. Hiding it with CSS until upgrade (tried in Phase 2) leaves it hidden forever when JavaScript never runs. Options:
    - (a) keep content visible and usable (today; the legacy React tests pin this);
    - (b) hide it only while scripting is on (`@media (scripting: enabled)`), accepting that a failed bundle hides it;
    - (c) (b) plus a CSS-only timeout that reveals it again if the element never upgrades;
    - (d) leave it to the app, and document `hidden`/`inert` on pending server content.

    I recommend (a) as the default, with (d) documented for apps that would rather hide.
12. **Business model and license (from the 2026-11-19 research).** Confirm "MIT core, promised to stay free, plus a one-time Dotquilt Pro bundle", as already planned. The research weighed six alternatives and found none better for a loader library.
13. **Pro pricing:** Solo $149 / Team (10) $449 / Company $999 with about 50% renewal, or the earlier guess of $99 / $299.
14. **The seller and the country.** This decides the merchant of record: Polar, Paddle, or Stripe Managed Payments. Lemon Squeezy closed to new sellers on 2026-11-16.
15. **A Pro waitlist** by email (needs a privacy page and a mail provider), or GitHub Releases only.
16. ~~**The npm name.**~~ **Decided 2026-11-20 by the owner: "dotquilt".** The packages are `dotquilt` (the native elements) and `@dotquilt/react`; both names and the `@dotquilt` scope were free on npm that day. Publishing 0.1.0 is its own go-ahead: until then both packages stay `"private": true`. A "Dotquilt" trademark is the owner's own step, with the commercial setup.
17. **Pro v1 scope** (which screens first), and **who runs the 10 discovery conversations**.
