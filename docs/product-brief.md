# Dot Loaders product brief

## Destination

Produce a launch-ready v1 specification and a phased implementation roadmap for a standalone loading-experience library and its website. Resolve product, architecture, distribution, quality, and launch decisions before implementing the package.

## Confirmed requirements

- Build a reusable public-library product, independent of any specific consumer application.
- Preserve the existing loader work as a research and migration source; do not modify `m37_web`.
- Use native Web Components as the core approach, informed by Number Flow's architecture. React integration must not make the core depend on React.
- Plan a Bun-managed Turborepo with React, Next.js, and Tailwind for the website. Verify current stable versions and pin exact versions at implementation time.
- Provide demos, documentation, accessible behavior, extensive customization, optimized rendering, professional code organization, and a versioned release process.
- Develop privately under `b4rb13/dot-loaders` and eventually deploy the website to Vercel's `b4rb13's Team`.
- Plan an MIT-licensed free core and optional paid templates, presets, and tooling.
- Complete the specification and roadmap first; implement in subsequent sessions.
- Focus v1 on composable primitives and dot text, chart, and table loaders; defer library-specific integrations and paid tooling.

## Product promise to validate

Help interface builders replace static skeletons with restrained, composable dot-based loading surfaces that reserve layout and hand off cleanly to real content. Animation must remain optional; loading semantics and content access must work without it.

## Working assumptions

- `dot-loaders` is the repository and working product name, not a verified npm namespace or final brand.
- Start with vanilla HTML and React consumers. Other frameworks can consume custom elements; official adapters need a separate support decision.
- The website can combine marketing, docs, examples, and a playground in one Next.js app, avoiding multiple deployments unless isolation is justified.
- No account system, payment processing, database, or telemetry service is required for the initial free library.
- Source-code reuse rights still need a provenance review before copied source receives the intended public license.

These assumptions are proposals, not closed architecture decisions. Their owning tickets hold the eventual decisions.
