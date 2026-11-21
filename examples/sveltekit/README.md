# Dotquilt with SvelteKit

A small SvelteKit project using `@dotquilt/svelte`:

- The components render on the server too, so their placeholders are in the first HTML, before any JavaScript runs. Hydration leaves them as they are; the elements register after mount.
- Each component loads its own data (`src/lib`) and passes `state` to its loader. The API routes in `src/routes/api` wait 900 ms, so the placeholders show for a moment.
- `/revenue` is reached through a client-side link: its chart and table loaders start fresh on a page SvelteKit swaps in without a document load.

## Run it

From the repository root:

```sh
bun install
bun run build
bun run --cwd examples/sveltekit dev
```

Then open http://127.0.0.1:4362.

`tests/sveltekit` checks the server HTML, that hydration keeps the server's elements, the handoffs, events, a client-side navigation and the layout without JavaScript (`bun run test:e2e --project=sveltekit-chromium`, after `bun run build`). The build runs `svelte-check` first. The root `tsc` run skips this folder.

`src/lib/docs/` holds the Svelte code the docs site's component pages show, and `/docs` runs it; keep it in step with the React versions in `examples/site/react/`.
