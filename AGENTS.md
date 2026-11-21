# Project instructions

Dotquilt is a set of dot-based loading components. Placeholder dots animate while content loads, then hand off to the real content.

| Path | What it is |
| --- | --- |
| `packages/core` | Native Web Components runtime, framework-free. 9 elements: SkeletonBlock/Line/Circle/Text, TextLoader, ChartLoader, TableLoader, TypingDots, LoadingRegion. |
| `packages/react` | Thin React 19 adapter over the same runtime, with SSR markup. |
| `packages/vue` | Thin Vue 3 adapter (`@dotquilt/vue`), with SSR markup; tested in `examples/nuxt`. |
| `apps/site` | Docs site: Astro + Starlight. Pages in `src/content/docs`, live previews in `src/components/Preview.astro`. |
| `tests/`, `scripts/` | Browser/SSR/size tests and tooling. Many scripts are legacy and slated for deletion in Phase 1. |
| `design/` | Design directions and specs for the visual rework. |

## Current plan

Follow `AUDIT.md` (2026-11-18). It holds the audit findings, the phases and the open owner decisions.

- **Runtime:** keep and refactor. Fix real bugs with regression tests, then simplify the size-golfed code. Readability beats saving bytes.
- **Website, docs and every visual part:** rebuilt from scratch to `design/SPEC.md` (Phase 4). The docs site is `apps/site`, Astro + Starlight (decision 8), themed from `design/tokens.css`.
- **Open decisions:** listed at the end of `AUDIT.md`. Don't act as if one is decided until the owner answers it.

## Commands

Use Bun (pinned in `.bun-version`) and Node 24+.

- **Install:** `bun install`, then `bunx playwright install chromium` once for browser tests.
- **Build everything:** `bun run build` (Turbo builds the packages).
- **Types:** `bun run check`
- **Lint:** `bun run lint` (Biome); `bun run format` to fix.
- **Unit tests:** `bun run test` (a few seconds). This includes `scripts/pack-smoke.test.ts`, which covers the published file list, imports in Node and Bun, consumer types on TypeScript 7 and 5.7, and the dist import graph. Snapshot changes: `bun test --update-snapshots`, then review the `.snap` diff.
- **Browser tests:** `bun run test:e2e` runs Chromium against the workspace build, in parallel. Run `bun run build` first. Filter with `--project=<name>-chromium`.
  - `tests/e2e/` covers every component's pending/ready behaviour, layout containment and screenshots. Screenshot baselines live in `tests/e2e/__screenshots__/`; CI skips pixel comparisons.
  - `tests/browser/` holds the detailed native runtime tests.
  - `tests/<suite>/`: coordination, presets, table, shared-wrapper, api, layout, react and m4. Each has its own fixture server, listed in `playwright.config.ts`.
  - `tests/next/` runs against `examples/next`, a Next.js App Router project that `bun run build` builds (server rendering, hydration and a client-side navigation).
  - `bun run test:e2e:all` adds Firefox and WebKit.
- **Legacy suites:** `bun run test:legacy` (under a minute). Only two checks need packed tarballs: the React suite rerun on React 19.0, the oldest supported version, and catalog SSR under Node and Bun. Run them before a release or when touching the React adapter's hydration or nonce handling.
- **Release dry run:** `bun run release:check` (after `bun run build`) shows the planned versions, the tarball contents and what still blocks publishing. Nothing is published.
- **Sizes:** `bun run size` prints gzip sizes per entry and fails when one is over its budget in `scripts/size-budgets.json` (about 15% headroom). Raise a budget only on purpose, in a PR that says why.
- **Docs site:** `bun run --cwd apps/site dev` (http://127.0.0.1:4330; Astro runs it in the background, `bunx astro dev stop` ends it). `bun run build` builds it; `tests/site` checks the built pages.
- **Everything CI runs:** `bun run verify`. CI itself runs only what a change needs: docs-only changes skip it, site-only changes run the checks and the site's browser tests, and anything else runs the checks plus every browser test in three parallel shards. A merge to main reruns the checks only.

## Rules

- **Public repository and release.** The repository is public (owner, 2026-11-20): keep it clean, with no secrets, private notes, stray branches or large artifacts. Don't publish to npm, deploy, or change visibility unless the owner asks for that specific action. A merge to `main` deploys dotquilt.dev.
- **Package boundaries.** Core stays framework-independent. React, Next.js and Tailwind belong only in the adapter or a future site.
- **Release requirements.** These are real requirements, not polish:
  - accessibility: focus, inert content, reduced motion, forced colors
  - SSR safety
  - cleanup of listeners and observers
  - selective imports
- **Bug fixes.** Every fix comes with a test that fails without it. Prefer tests of user-visible behavior (states, focus, layout, screenshots) over tests that pin hashes, byte counts or private internals.
- **Records.** Don't write evidence packets, receipts or long status logs. Normal commits, PRs and GitHub issues are the record. Keep this file short.
- **Large artifacts.** Never commit large generated artifacts. `.artifacts/` is ignored. Historical evidence lives outside the repo in `../dot-loaders-archive/`.
- **m37 is read-only.** `/Users/derenikkhachatryan/WebstormProjects/m37-projects/m37_web` is read-only reference material. Never edit it, install there or run mutating scripts there.
- **Issue tracker.** GitHub issues; see `.agents/issue-tracker.md`.
