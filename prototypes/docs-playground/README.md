# Dotquilt documentation directions

Isolated decision prototype for [Choose the documentation and playground experience](https://github.com/b4rb13/dot-loaders/issues/11). It is not the production website or library implementation. On 2026-10-16 the owner approved **Guide for Docs, Workbench for the dedicated Playground, and Gallery for examples browsing**, with shared page structure and complete single-column mobile behavior. The comparison remains isolated decision evidence; no prototype code is promoted into the production website.

## Review

Open `index.html` directly, or serve this directory on localhost. The current review server is [http://127.0.0.1:4177/](http://127.0.0.1:4177/); it serves only this prototype directory and is not deployed.

The single HTML file uses no dependencies, external assets or remote services. Production remains planned as the approved Next.js/React/Tailwind application. Demo rendering here is a small simulation, with no m37 imports or source extraction. It does not establish package performance, compatibility, SSR or accessibility conformance.

| Direction | Named axis | Benefit | Cost |
| --- | --- | --- | --- |
| Guide | Reading-led, sequential documentation | Helps new users understand composition before exploring configuration | More vertical travel between preview, settings and code |
| Workbench | Tool-led, concurrent preview and inspector | Faster repeated customization with code close to the controls | Denser page, less room for explanatory reading |
| Gallery | Example-led, choose a composition first | Makes useful starting points easy to browse | Adds a selection step and needs room for recipes |

All three use the same three representative recipes, application simulation and configuration generator. The picker uses the prototype skill's supplied markup, styles and reference wiring. Use its buttons, 1–3, or left/right arrows to switch; R remounts the current direction. Input controls keep their own keys. This picker is review chrome, not proposed product navigation.

## Working interactions

- Main Home / Docs / Playground navigation, anchored sections and filtered topic search.
- React / Web Components selection changes illustrative code without resetting a running preview.
- SkeletonText, TextLoader and ChartLoader recipe selection; skeleton line count and loading color.
- Initial load, refresh, replacement, ready, app-owned error/empty outcomes and persistent pending simulation.
- Reduced-motion preview, system preference restriction and persistent local pause. Decorative motion stops after the four-second window while readiness remains pending.
- Light/dark theme, settings reset, copyable illustrative snippets and URL configuration. Clipboard denial has a selected-text dialog fallback.
- Mobile topic disclosure, single-column layout and collapsed code on initial narrow-screen load. Browser Back restores view navigation.

The copied npm scope is deliberately a placeholder, and all snippets are labelled illustrative/unverified. No installation command claims a real published package. Simulation controls are separate from component settings; no fictional fetch/error API is attributed to the library.

## Observed checks — 2026-10-16

Manual checks used the Codex in-app browser, its default desktop viewport and explicit 390 px / 320 px responsive viewports. These are browser resizing checks, not physical-device or screen-reader certification.

- Each direction rendered; no horizontal page overflow was observed at desktop, 390 px and 320 px.
- Initial pending hid content; refresh retained visible content; error/empty content became ready immediately.
- Changing integration during pending preserved pending presentation and changed the generated code.
- Keyboard changes to the line slider updated the configuration and snippet without switching prototype direction.
- Reduced-motion preview produced a static placeholder. A separate run with reduced motion off began animating, then became static after four seconds while still pending.
- Search filtered to a matching topic. Escape closed its dialog.
- Playground navigation changed view, and a separate browser Back check restored Docs.
- Theme switching and persisted pause across reload worked. Chart selection updated its title/snippet and disabled its irrelevant line-count control. Empty outcomes became ready.
- Copy link and copy-code controls displayed successful feedback. A clipboard-denial fallback exists but was not exercised through a forced browser permission change.
- No application warnings/errors were captured in the browser log during the final desktop checks. This is not a complete browser compatibility audit.

Saved review screenshots:

- `guide-desktop.jpg`, `workbench-desktop.jpg`, `gallery-desktop.jpg`
- `guide-mobile.jpg`, `workbench-mobile.jpg`, `gallery-mobile.jpg`

The prototype intentionally does not include the complete nine-export catalog, a documentation engine, full-text indexing, published version archives, actual package installation, a source editor, CSP/SSR verification, billing, telemetry or a deployment. Those remain decisions or implementation work within their owning scope.

The owner approved the [complete documentation contract](https://github.com/b4rb13/dot-loaders/issues/11#issuecomment-6216480125) on 2026-10-16, including its three clarifications, six validation gates and 33 acceptance scenarios. The ticket is closed; the isolated model remains decision evidence. Its incomplete content, generator and motion are not production conformance evidence. Wayfinder planning does not promote this HTML into production code. Keep review evidence through resolution; agree how to retain it before later cleanup.

## Hook triage — 2026-10-16

Removed the unused Inter preference so this isolated comparison uses its intended system font stack. Retained the geometric bar-chart silhouette; the organic-contour rule is suppressed only for this prototype file, with its rationale recorded through Impeccable's CLI. The manual detector also reported advisory dialog border/shadow combinations; those were left unchanged and unsuppressed for the ongoing visual review. No layout direction was selected by this maintenance pass.

## Motion scope

The owner explicitly requested the richer idle, pointer/hover and content-reveal character of m37/loaders. This layout model's basic breathing animation is not the final motion design. [Define the loading motion repertoire and pointer interaction](https://github.com/b4rb13/dot-loaders/issues/14) will select the family effects and any public interaction controls through separate prototype review, within the already accepted readiness, four-second motion, accessibility and performance rules. The documentation contract must demonstrate the actual selected package behavior once it exists.
