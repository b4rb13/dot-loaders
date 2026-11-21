# Dotquilt with Angular

A small Angular SSR project using `@dotquilt/angular`:

- Pages render on the server per request (`app.routes.server.ts`), so the placeholders are in the first HTML, before any JavaScript runs. `provideClientHydration()` hydrates them; the elements register after rendering.
- Each component loads its own data in `afterNextRender` and passes `state` to its loader. The API routes in `src/server.ts` wait 900 ms, so the placeholders show for a moment.
- `/revenue` is reached through a `routerLink`: its chart and table loaders start fresh on a page the router swaps in without a document load.

## Run it

Angular 22's tools need Node 24.15 or later. From the repository root:

```sh
bun install
bun run build
bun run --cwd examples/angular dev
```

Then open http://127.0.0.1:4363.

`tests/angular` checks the server HTML, hydration without errors, the handoffs, outputs, a client-side navigation and the layout without JavaScript (`bun run test:e2e --project=angular-chromium`, after `bun run build`). `ng build` type-checks the templates strictly. The root `tsc` run skips this folder.
