# Dot Loaders research overview

Research observed on 2026-10-16. The findings inform the [Wayfinder map](https://github.com/b4rb13/dot-loaders/issues/1); they do not close the owner's product or architecture decisions. The [roadmap](roadmap.md) describes the proposed implementation stages.

## Evidence

| Investigation | Result and evidence |
| --- | --- |
| [Audit the existing loader package for safe reuse](https://github.com/b4rb13/dot-loaders/issues/2) | [Source audit at its research commit](https://github.com/b4rb13/dot-loaders/blob/d2de58757923d661a3577d145abcf427c22bc194/docs/research/source-audit.md) |
| [Investigate Number Flow and native component constraints](https://github.com/b4rb13/dot-loaders/issues/3) | [Upstream and standards findings at their research commit](https://github.com/b4rb13/dot-loaders/blob/47997546cb32a152c3f6eaec66a84d32cc38e207/docs/research/native-architecture.md) |
| [Verify the stack and private distribution path](https://github.com/b4rb13/dot-loaders/issues/4) | [Registry, release and platform findings](https://github.com/b4rb13/dot-loaders/blob/b547233dd72465dabb6d4a7d5dc17f6ee2ca9e7b/docs/research/stack-release.md) |

Each evidence file contains its method, primary citations, limitations and proposed next decisions. Research branches are intentionally separate and never merged into implementation. Follow the evidence links even when the branch-only files are absent from this checkout.

## Existing work worth preserving

The audit found reusable drawing/noise/batching algorithms, geometry-driven chart and table surfaces, text handoff behavior, motion preferences and deterministic test cases. The source snapshot is `m37_web` commit `5f940c1059ebfe08f734a90714c5da51f77b66f5`; the inspected package was clean. It is currently a private React workspace package exporting TypeScript source, rather than a standalone native-element distribution. [Source audit](https://github.com/b4rb13/dot-loaders/blob/d2de58757923d661a3577d145abcf427c22bc194/docs/research/source-audit.md).

Four findings deserve early validation:

- The default scheduler imports `motion/react`, including through some apparently renderer-only import paths. Separating React components from file directories alone would not isolate the runtime.
- Default batching eagerly reserves typed-array capacity per canvas. Source-derived arithmetic gives 252 KiB of typed-array payload for a default seven-color batch, before other allocations. This is not a measured heap result; composed text lines and many primitives need actual benchmarking.
- Theme scoping, singleton resource ownership, extension fault handling and reconnect/adoption behavior need public contracts. A public package will encounter more embedding environments than its current consumer.
- Existing accessibility and motion work is useful, but text-mask focus, international text, forced colors, no-JavaScript fallback and real screen-reader behavior need explicit decisions and browser/manual evidence.

These are migration risks, not reasons to discard the inherited work. Existing tests were inspected rather than executed, and no performance or conformance result is claimed. Details and source-line references live in the [source audit](https://github.com/b4rb13/dot-loaders/blob/d2de58757923d661a3577d145abcf427c22bc194/docs/research/source-audit.md).

## Architectural direction to evaluate

Number Flow demonstrates native element/runtime boundaries, a separate React adapter, selective exports, server-rendered fallbacks and explicit styling/CSP handling. Its current repository uses pnpm and Astro, so its tooling is a reference rather than the requested project template. Upstream was pinned to commit `c5906cf35c86583e756a6b91e043291c10b416e0`. [Upstream findings and pinned source links](https://github.com/b4rb13/dot-loaders/blob/47997546cb32a152c3f6eaec66a84d32cc38e207/docs/research/native-architecture.md).

The proposed product boundaries are a native core, a thin React adapter, and one Next.js website combining marketing, docs, examples and a playground. Keep Tailwind and framework tooling out of consumer runtime requirements. Evaluate DOM/CSS, SVG and canvas on equivalent representative visuals before selecting rendering boundaries; Web Components do not dictate a renderer. Resolve server-safe imports, static fallback, content ownership, registration/version conflicts and CSP alongside the first lifecycle contract. [Architecture proposals and validation spikes](https://github.com/b4rb13/dot-loaders/blob/47997546cb32a152c3f6eaec66a84d32cc38e207/docs/research/native-architecture.md).

## Dated stable stack snapshot

The stack investigation checked npm's stable dist-tags and matching official releases. Recheck before installation and commit exact toolchain versions plus a lockfile; no dependencies were installed in this planning stage.

| Required technology | Observed stable version | Intended role |
| --- | --- | --- |
| Bun | 1.4.3 | Workspace package manager and scripts |
| Turborepo | 2.11.8 | Workspace task graph and build caching |
| React / React DOM | 19.3.1 | Adapter and website |
| Next.js | 16.4.2 | Website |
| Tailwind CSS | 4.3.3 | Website styling |
| TypeScript | 7.0.2 | Types and checks |

Primary registry/release links, engine constraints and additional tooling versions are in the [stack investigation](https://github.com/b4rb13/dot-loaders/blob/b547233dd72465dabb6d4a7d5dc17f6ee2ca9e7b/docs/research/stack-release.md). Compatibility ranges still require a clean build and packed-consumer test; they are not proof that the entire stack works together.

The lean proposal uses tsdown as the initial compiled-library/declaration candidate, Changesets for release intent and changelogs, Bun tests for pure logic, Playwright for real-browser checks, and package validation against actual tarballs. Local MDX in Next.js is the initial documentation candidate. Use a supported Node version where release/build tools require it; a Bun-managed workspace does not require a Bun server runtime. Tool acceptance remains part of the specification decisions. [Tooling evidence](https://github.com/b4rb13/dot-loaders/blob/b547233dd72465dabb6d4a7d5dc17f6ee2ca9e7b/docs/research/stack-release.md).

## Private development and later launch

GitHub authentication was verified as `b4rb13`, and the created repository was verified private. Vercel account access includes `b4rb13's Team`, slug `b4rb13-s-team`, ID `team_xolUVv45aLTX2E7u8rGFxFWC`. No Vercel project or deployment was created during planning.

Repository privacy, npm package visibility and website access are separate controls. Before a private alpha, verify the Vercel plan, GitHub integration and preview protection against an unauthenticated browser. Before npm publication, verify namespace ownership, package contents, source rights and the current publishing workflow. An intended MIT license does not itself establish permission to relicense existing source. These are explicit release decisions in the map. [Distribution and platform evidence](https://github.com/b4rb13/dot-loaders/blob/b547233dd72465dabb6d4a7d5dc17f6ee2ca9e7b/docs/research/stack-release.md).

## What the research does not establish

No production code was extracted, no runtime built, no source tests run, no browser prototype executed and no npm publication attempted. Size, frame-time, heap, accessibility and SSR guarantees require the later acceptance work. The next frontier is [Define the v1 loading experiences and readiness contract](https://github.com/b4rb13/dot-loaders/issues/5), followed by the dependent architecture and API choices.
