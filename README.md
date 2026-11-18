# Dotquilt

Dot-based loading components for the web. Placeholder dots animate while your data loads, then hand off to your real content: a skeleton dissolves into text, dots converge into a chart, rows type into a table.

- **Native core** (`packages/core`): framework-free Web Components with nine elements:
  - SkeletonBlock, SkeletonLine, SkeletonCircle, SkeletonText
  - TextLoader, ChartLoader, TableLoader
  - TypingDots
  - LoadingRegion
- **React adapter** (`packages/react`): thin React 19 wrappers with server-rendered markup.
- **Website** (`apps/website`): a legacy docs/playground site, scheduled to be rebuilt from scratch.

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
bun run dev:website
```

The site runs at http://127.0.0.1:4210.

## Guides

- [Native quickstart](docs/implementation/native-quickstart.md)
- [React quickstart](docs/implementation/react-quickstart.md)
- [Testing private tarballs](docs/implementation/private-testing.md)
- [npm account setup](docs/implementation/npm-setup.md)
- [Product brief](docs/product-brief.md) and [vocabulary](GLOSSARY.md)

These guides predate the November 2026 cleanup and may still mention milestone history.

## License

MIT
