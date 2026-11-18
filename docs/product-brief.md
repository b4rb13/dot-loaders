# Dotquilt product brief

Dotquilt provides composable loading surfaces with distinctive idle motion and coordinated handoff to application-owned content. It is a public-library product: a framework-independent native Web Component core, a thin React adapter and one documentation/demo/playground website.

## Planning status and authority

The owner approved the individual product contracts and the complete launch specification/first implementation handoff (Q1–Q11) on 2026-10-16 in [Approve the launch specification and implementation sequence](https://github.com/b4rb13/dot-loaders/issues/13). The planning destination is complete. M1 is complete for the approved private native slice; see [current evidence](implementation/m1-progress.md). Full release qualification has not started. The [Wayfinder map](https://github.com/b4rb13/dot-loaders/issues/1) indexes decisions; their linked resolution comments remain authoritative within their scope.

Use the [complete launch review and exact decision index](planning/launch-specification-review.md), [implementation roadmap](roadmap.md) and [first implementation handoff](planning/first-implementation-handoff.md). This brief summarizes those decisions; it does not replace their detailed APIs, limits, validation gates or acceptance scenarios. Historical [research](research-overview.md) and local prototypes are design evidence, not shipping conformance.

## Complete free v1

The MIT product includes nine exports across the agreed six families: SkeletonBlock, SkeletonLine, SkeletonCircle, SkeletonText, TextLoader, ChartLoader, TableLoader, TypingDots and LoadingRegion. Native and React consumers receive the same loading semantics and complete approved motion repertoire. Required documentation, essential customization and maintenance fixes remain free.

- **Application-owned readiness and content.** Explicit pending/refreshing/ready state and cycle identity coordinate mounted original content. Refresh preserves useful visible interactive content; replacement hides/inerts content with safe focus handling. Zero, empty and error outcomes are valid. Apps own requests, stale-result guards, cancellation and outcome selection. Ready content access never waits for decoration.
- **Native engine with thin integration.** Framework-independent core, selective explicit registration, application-owned light-DOM content, internal Shadow DOM decoration, pure static/server helpers and progressive enhancement. React forwards the same contract. Next.js and Tailwind belong to the website; no chart/grid/data-fetching runtime enters core. Renderer and declarative Shadow DOM choices require their agreed evidence before commitment.
- **Rich, extensible motion.** Skeleton pulse/dissolve; text scramble and lock/settle/reveal with alternate recipes; six chart idle variants and final-data line/bar/scatter convergence/wipe; table type-on and actual row reveal; typing wave and coordinated region handoff. Idle and handoff bindings are independent, with typed version-1 custom animation definitions/options and bounded engine capabilities. Explicit content targets preserve identity/styles. Fine-pointer decorative lift is opt-in and restricted by lifecycle and preferences. The engine owns timing, cancellation, resources and terminal content access for built-ins and custom recipes alike.
- **Accessible and static behavior.** Preserve focus and semantics, honor reduced motion and persistent pause, stop automatic motion within the inclusive four-second window, and provide forced-colors/zoom/international-text/static/no-JavaScript behavior. The application owns meaningful status/outcome announcements. Actual browser and screen-reader evidence is required.
- **Measured quality.** Selective compiled JS, declarations and CSS; no framework runtime in native closure; bounded rendering/scheduling/geometry/allocation/cleanup; supported SSR and real-header CSP delivery. Numeric budgets, reference hardware, sampling, compatibility floors and allowed exceptions are exactly those in the owning resolutions. No broad waiver of safety, content, focus, identity, stale-work or discarded-instance cleanup.

## Website and learning experience

One Next.js/React/Tailwind app combines marketing, Guide documentation, Workbench playground and Gallery examples. It demonstrates complete idle-to-content motion, native/React integration, customization, realistic fallback/error/refresh scenarios, accessible controls and mobile behavior. Shareable state is versioned and allowlisted; generated code is complete and runnable. Search, version navigation, migration content and example maintenance follow the approved documentation contract. Installation and essential learning require no paid account.

## Identity, distribution and source isolation

The product is **Dotquilt**; the private repository remains `b4rb13/dot-loaders`. Intended package names are `@<verified-owner>/dotquilt` and `@<verified-owner>/dotquilt-react`; the owner reports creating npm account `b4rb13`, with authenticated identity/scope verification and security setup still pending ([setup register](implementation/npm-setup.md)). Native tags, CSS properties and events use the accepted Dotquilt namespace. Verify compatible current stable tooling and pin versions at implementation time while retaining accepted support floors.

Develop with Bun and Turborepo using private reviewed tarballs first. Native/React packages use coordinated versioning and compiled artifact checks. Public source, npm publication and public website exposure each need their own concrete authorization and technical prerequisites; npm provenance/bootstrap requirements still apply. The eventual website target is personal Vercel `b4rb13's Team`, with access and actual protection reverified before use. A private repository does not make a website private.

The owner confirmed ownership of the inherited m37 loaders. Relevant source files still need scoped provenance/notice review before any later copying. `/Users/derenikkhachatryan/WebstormProjects/m37-projects/m37_web` stays strictly read-only, including consumers. The first implementation task copies no source files; it authors the initial native slice using read-only behavior references. Research branches stay unmerged and prototypes remain references.

## Delivery and later expansion

Start with a complete packed SkeletonBlock/LoadingRegion native flow; prove dense rendering and React/SSR in parallel, then complete catalog/site coverage, protected alpha, qualified release candidate and separately authorized public launch. Begin evidence, accessibility, packaging, benchmarks and docs with the first slice. Record every mandatory requirement and environment cell; unverified evidence is never a pass. No calendar launch promise precedes measured costs and access checks.

The owner controls account/access/budget and product/release decisions; the implementing maintainer performs authorized work and retains evidence. Routine compliant engineering choices are delegated. Genuine policy conflicts use a focused linked amendment and block only affected work.

Additional adapters/integrations and genuinely new collections are later growth. The complete v1 repertoire cannot be moved behind payment. A template-first optional paid experiment requires the approved demand thresholds, bounded pilot approval and pre-sale licensing/delivery/update/support/retirement safeguards. Paid work is independent of free v1 delivery; this planning effort creates no commerce or outreach authorization.
