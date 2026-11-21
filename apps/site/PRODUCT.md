# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Front-end developers and design engineers building data-heavy product screens (dashboards, tables, charts, chat, admin) in React, Vue, Svelte, Angular or plain HTML. They meet Dotquilt while choosing how their app should look while data loads, and judge it by how it behaves inside a real screen.

## Product Purpose

Dotquilt is a set of loading placeholders drawn from small marks. While data loads, each placeholder holds the shape of the content it stands for; when the data arrives, it hands over to the real content instead of vanishing. The app owns the request and the state; Dotquilt owns only the decoration and the handoff. Success: a page that settles into place rather than jumping.

## Positioning

The handoff. Placeholders turn into the real content: marks glide onto the chart's real line, table rows settle in one after another, numbers lock into place character by character, skeleton marks drift away as content rises. Generic skeleton libraries shimmer and disappear; Dotquilt choreographs the arrival.

## Operating Context

- Nine native web components (SkeletonBlock, SkeletonLine, SkeletonCircle, SkeletonText, TextLoader, ChartLoader, TableLoader, TypingDots, LoadingRegion) and typed packages for React 19, Vue 3, Svelte 5 and Angular 22.
- Server rendering, strict Content Security Policy (nonce, hashes, external stylesheets), reduced motion, pause, forced colours and focus handling are built in.
- A custom animation authoring API; three mark shapes (dot, dash, square).
- The docs site (Astro + Starlight) lives at https://dotquilt.dev, deployed from main on Vercel.

## Capabilities and Constraints

- The whole library is free and MIT licensed. Dotquilt Pro (application screens, motion packs, playground export tools; one-time purchase) is coming later with no price, checkout or sign-up shown until the commercial gates pass.
- The packages are `dotquilt` (the native elements), `@dotquilt/react` (owner decision, 2026-11-20), and `@dotquilt/vue`, `@dotquilt/svelte` and `@dotquilt/angular` (owner decision, 2026-11-21).
- Idle motion stops after four seconds; the handoff (about 1.1 s) always plays unless reduced motion, a pause or focus prevents it.
- Undecided: the npm name, size budgets, ASCII-only TextLoader, how often errors repeat, pending server content before JavaScript.

## Brand Commitments

- design/SPEC.md "System, refined" is locked by the owner: cool greys, one muted teal accent used sparingly (primary actions, the current page, the idle glow, charts), Manrope and DM Mono, soft shapes and gentle elevation, long eased motion, no metaphors, textures, mascots or display fonts. Tokens: design/tokens.css.
- Logo: "Quilt", an ink tile of four marks with one lit in the glow colour, beside the lowercase wordmark "dotquilt".
- Copy is plain and user-facing: no milestones, freezes or provisional wording.

## Evidence on Hand

- The live components themselves, which demonstrate every claim on the page.
- Docs, guides and type-checked examples in examples/site.
- No customers, testimonials, benchmarks, download counts or press exist. Never fabricate them.

## Product Principles

- Show the handoff, don't describe it.
- Calm over flashy: motion is long, eased and brief, and every loader can be stilled.
- The app owns the data; Dotquilt owns only the decoration.
- Free means free: nothing that ships free moves behind payment.

## Accessibility & Inclusion

Reduced motion, a page-wide pause, forced colours, focus kept during handoffs, and content hidden from assistive technology while pending are release requirements, not polish.
