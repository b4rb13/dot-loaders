# Dotquilt

Composable loading experiences built on native Web Components, with a thin React 19 adapter. The private documentation/playground website is now in M5 development.

**Current status:** the owner approved the [M4 visual review and feature freeze](docs/implementation/m4/feature-freeze.md) on 2026-10-19. All nine native/React/static catalog exports and the declared motion/API scope are implemented. M2 optimization is paused and the current runtime is frozen; [M5 website/docs/playground #19](https://github.com/b4rb13/dot-loaders/issues/19) is active. The [deferred issue index](docs/implementation/m2/deferred-work.md) retains every remaining size/performance/qualification category; M2/M4 remain open, renderers provisional and npm publishing disabled. Earlier checkpoint descriptions below retain their historical scope.

The launch specification is approved. **M1 is complete for the private native SkeletonBlock/LoadingRegion slice** ([resolution](https://github.com/b4rb13/dot-loaders/issues/15#issuecomment-6221959345)): 196 browser checks passed, two explicit platform skips, all applicable slice size gates and an exact clean repack. **M2 remains open (optimization paused)** under [Dense rendering and engine proof](https://github.com/b4rb13/dot-loaders/issues/16): private equivalent SVG/Canvas/DOM candidates, representative rich handoffs and whole-render paired traces. A [bounded optimization pass](docs/implementation/m2/progress.md) lowers local busy-work p95 while retaining remaining timing misses; renderer choice remains provisional. M3 adds the private SkeletonBlock/LoadingRegion React adapter and production Next/SSR integration under [#17](https://github.com/b4rb13/dot-loaders/issues/17); see its [exact scoped evidence](docs/implementation/m3/progress.md). Later historical observations keep their scope; current website progress is in [M5](docs/implementation/m5/progress.md), while final release qualification remains open. M2 remains open. No npm publication or website deployment has occurred.

**M4 is in progress** under [#18](https://github.com/b4rb13/dot-loaders/issues/18). The private native/React/static catalog now includes skeleton shapes, multiline, typing, TextLoader, ChartLoader and an initial TableLoader with type-on/shimmer, seven cell treatments, semantic glyph convergence and registered actual-row reveal. The [TableLoader size checkpoint](docs/implementation/m4/table-size-progress.md) records its shared native/React static layout, passing adapter budget and remaining native download failures; it is not accepted as launch-ready. The [reviewed chart-size checkpoint](docs/implementation/m4/chart-size-progress.md) retains the earlier passing optional-chart pair and exact existing-entry growth approval, without changing any ceiling or rewriting history. The current visual review and feature freeze are approved; new-entry size baselines, numerical and full environment/reference qualification remain held. M2 and M4 stay open, renderers provisional and npm publishing disabled.

- [TableLoader usage and typed animations](docs/implementation/m4/table-quickstart.md)
- [ChartLoader usage and typed animations](docs/implementation/m4/chart-quickstart.md)
- [TextLoader usage and typed animations](docs/implementation/m4/text-quickstart.md)
- [Private M4 catalog usage and current limits](docs/implementation/m4/catalog-quickstart.md)
- [React/Next quickstart and reproduction](docs/implementation/react-quickstart.md)
- [M3 React/SSR evidence and qualification boundaries](docs/implementation/m3/progress.md)
- [Whole-render trace and sampling harness](docs/implementation/m2/trace-harness.md)
- [M2 dense-rendering proof and current gaps](docs/implementation/m2/progress.md)
- [Native quickstart and reproduction](docs/implementation/native-quickstart.md)
- [M1 evidence, limits and remaining work](docs/implementation/m1-progress.md)
- [Requirement-to-test review](docs/implementation/m1-gap-review.md)
- [Core architecture measurements and approved budget amendment](docs/implementation/m1-core-architecture-review.md)
- [npm account setup and publication guards](docs/implementation/npm-setup.md)
- [Private tarball testing with friends](docs/implementation/private-testing.md)
- [Approved first implementation handoff](docs/planning/first-implementation-handoff.md)
- [Product brief](docs/product-brief.md), [roadmap](docs/roadmap.md), [vocabulary](GLOSSARY.md)
- [Completed Wayfinder map](https://github.com/b4rb13/dot-loaders/issues/1)
- [Completed M1 implementation task](https://github.com/b4rb13/dot-loaders/issues/15)

Use pinned Bun 1.4.3 and Node 24, then `bun install --frozen-lockfile --ignore-scripts`. `bun run verify` builds, checks types/style/contracts, verifies the private tarball/external consumers/size and runs browser checks. It intentionally fails while a required functional/size gate fails. Trace smoke verifies collection, not performance qualification; full paired sampling runs separately and retains its numeric findings. See the quickstarts for browser installation and individual checks. `bun run verify:m3` additionally checks packed React/CSS/SSR, production Next integration and exact pair reproduction. `bun run verify:m4` adds the incremental catalog fixtures and its fail-closed size gate; the previous skeleton growth is owner approved, and current failing native/default/optional/adapter budgets remain held under their unchanged ceilings. `verify:chart-options` enforces complete optional chart closures; `verify:table-options` independently enforces complete selectable/custom table closures. Table download failures keep the expanded M4 size gate red; full selectable/custom closure acceptance remains held. Independent regression comparisons retain both the reviewed pair and the historical reference. See the latest M4 progress/evidence for unfinished catalog and qualification gates.

`packages/core` contains the implemented native slice and private experimental M2 internal modules, under provisional local name `@dotquilt-internal/core` and `private: true`. Core has no runtime dependencies. `packages/react` wraps the implemented native slice with exact version matching and external React peers. Next production fixtures live under tests; Tailwind/website stay in M5. Changesets coordinates the two private library versions; no publication/deployment workflow is configured.

The complete approved v1 core and motion repertoire are MIT. Optional paid expansion remains separate future work. m37 is strictly read-only reference material: M1 copies no source files and changes no consumers. Research branches stay unmerged; existing prototypes remain references.

## Local website

`bun run dev:website` starts the private website: Dot Gallery home at `/`, Quickstart at `/docs` and the playground at `/playground`. Use `bun run build:website` and `bun run --cwd apps/website start` to inspect the production build at http://127.0.0.1:4210. Website work verifies the runtime freeze without rebuilding packages. Focused checks: `bun run check:website`, `bun run test:website`, `bun run test:website:browser` and `bun run verify:website:examples`. The complete examples use reviewed local tarballs; no public npm install is claimed. The [homepage evidence](docs/implementation/m5/homepage-progress.md) records its scoped review and remaining qualification.
