# Dotquilt

Dot-based loading components for the web. Placeholder marks wait where your content will be, then hand over to it when the data arrives: a number locks into place, marks glide onto a chart, rows settle into a table.

- **Native core** (`packages/core`): framework-free Web Components with nine elements:
  - SkeletonBlock, SkeletonLine, SkeletonCircle, SkeletonText
  - TextLoader, ChartLoader, TableLoader
  - TypingDots
  - LoadingRegion
- **React adapter** (`packages/react`): thin React 19 wrappers with server-rendered markup.
- **Docs site** (`apps/site`): Astro + Starlight, themed to the design spec.

**Status:** private, pre-alpha, not published to npm. See [AUDIT.md](AUDIT.md) for the current state, known bugs and the phased plan.

## Getting started

```bash
bun install
```

```bash
bun run build
```

```bash
bun run test
```

```bash
bun run test:e2e
```

```bash
bun run --cwd apps/site dev
```

The docs site runs at http://127.0.0.1:4330.

## Docs and plans

- **Docs, examples and the playground:** [dotquilt.dev](https://dotquilt.dev)
- **The current state, known issues and the plan:** [AUDIT.md](AUDIT.md)
- **The product strategy and the research behind it:** `docs/planning/` and `docs/research/`
- **Working in this repository:** [AGENTS.md](AGENTS.md)

## License

MIT
