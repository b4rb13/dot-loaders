# Private React / SSR integration

M3 wraps the implemented SkeletonBlock/LoadingRegion native slice. It does not deliver the remaining M4 catalog, select an M2 renderer or qualify a public release. See the [adapter README](../../packages/react/README.md) for component composition, properties/events/refs, styling, motion and CSP.

## Local packed consumers

Use Bun 1.4.3 and Node 24 with the repository's frozen lockfile. The artifacts use matching provisional versions and private names, identified by SHA-256. They are not registry packages or reserved public names.

```sh
bun run build
bun run verify:packed
bun run verify:react-packed
bun run verify:react-ssr
bun run prepare:next
```

The React verifier installs actual tarballs outside the workspace into clean current/floor/intermediate React consumers. It checks TypeScript 5.7/current in Bundler/NodeNext modes, imports/rendering in Node and Bun, peer/runtime identity, all compiled entry points, root selectivity and complete CSS-mode increment accounting. `.artifacts/m3/packed-react-report.json` records installation directories, exact package versions, tarballs and hashes. The Next preparation script builds independent production App Router consumers from that exact pair.

For a separate local Bun app, copy the two reviewed tarballs into an app-owned `vendor/` directory and declare both files. Bun's private local install also needs an explicit test-only override for the adapter's exact native dependency:

```json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "@dotquilt-internal/core": "file:./vendor/dotquilt-internal-core-0.0.0.tgz",
    "@dotquilt-internal/react": "file:./vendor/dotquilt-internal-react-0.0.0.tgz",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  "overrides": {
    "@dotquilt-internal/core": "file:./vendor/dotquilt-internal-core-0.0.0.tgz"
  }
}
```

Then install normally with scripts disabled. The published-manifest dependency remains the exact native version; only the private consumer substitutes a local artifact. The verifier proves both library imports resolve to one native installation. No credentials or npm publication are needed. Sharing outside the current machine remains a separate reviewed distribution step.

## Runnable integration fixtures

```sh
bun run test:react
bun run test:next
```

To inspect the clean raw-React SSR fixtures after verification, start `bun tests/react/server.ts` and open `http://127.0.0.1:4191/?state=pending&mode=nonce`. The fixture also supports `mode=external`, `mode=hash`, `line=floor`, `line=minor1`, `line=minor2`, `early`, `delay` and `fail`. These are test controls, not package API. Native registration stays selective even from the adapter root export.

For a production Next fixture, run `bun scripts/start-next.ts current` (port 4192) or `bun scripts/start-next.ts floor` (4193) after preparation. Home streams an application-owned detail; Other tests client navigation after native registration; `/budget` renders the complete 24-surface/six-region output fixture. The application—not Dotquilt—owns data readiness, status messages and the working server recovery route.

`tests/fixtures/m3-next/app/layout.tsx` creates a document-lifetime CSP context from request data; `proxy.ts` supplies a unique request nonce and real CSP headers. The context persists across client navigation, so later RSC response nonces cannot replace the current document's authorization. Use client components for callbacks, DOM refs/targets and custom animation definitions; RSC props carry serializable application data.

The selected path is static-first enhancement without library-owned DSD. Available server content stays readable if scripts fail; client-only/unready data must not be represented as available server content. Supply a persistent explanation and server recovery route for data unavailable without JavaScript. Enhancement preserves current content, input state and handlers; replacement establishes native focus/inert ownership before hiding it.

## Evidence and limits

[Current M3 evidence](m3/progress.md) records the exact pair, checks, fixes and qualification boundaries. Raw non-style markup excludes stylesheet elements and matched application content; complete document accounting retains every stylesheet/link/nonce/wrapper and all cold additional stylesheet responses. Next Flight/bootstrap transport is measured separately from raw React SSR. Warm SSR timings are local observations, not physical reference qualification.

Both packages remain private with fail-closed prepublish hooks. React and ReactDOM are adapter peers; native has no framework dependency. The Changesets fixed group coordinates future versions without enabling publication. No deployment, registry write or visibility change is part of M3.
