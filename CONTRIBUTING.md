# Contributing to Dotquilt

Thanks for helping. Issues and pull requests are welcome: bug reports with a small reproduction help most.

## Setup

You need [Bun](https://bun.sh) (the version in `.bun-version`) and Node 24 or later.

```bash
bun install
```

```bash
bunx playwright install chromium
```

```bash
bun run build
```

The docs site runs at http://127.0.0.1:4330:

```bash
bun run --cwd apps/site dev
```

## Checks

| Command | What it does |
| --- | --- |
| `bun run lint` | Biome; `bun run format` fixes formatting |
| `bun run check` | Type checks |
| `bun run test` | Unit tests, including the published file list and imports in Node and Bun (a few seconds) |
| `bun run test:e2e` | Browser tests in Chromium against the workspace build (run `bun run build` first); `bun run test:e2e:all` adds Firefox and WebKit |
| `bun run size` | Gzip size per entry against its budget in `scripts/size-budgets.json` |
| `bun run verify` | Everything CI runs |

## Making a change

- **Packages.** `packages/core` stays framework-independent; React belongs in `packages/react`. Keep each component importable on its own.
- **Bug fixes** come with a test that fails without the fix. Prefer tests of what a user sees (states, focus, layout) over tests of private internals.
- **The release requirements** are accessibility (focus, inert content, reduced motion, forced colours), server-rendering safety, cleanup of listeners and observers, and selective imports.
- **Size.** If an entry grows past its budget, say why in the pull request; budgets are raised only on purpose.
- **Changesets.** A change to a published package needs a changeset: run `bunx changeset` and describe it for users.
- **Visuals** follow [design/SPEC.md](design/SPEC.md) and the tokens in [design/tokens.css](design/tokens.css).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
