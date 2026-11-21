# Dotquilt with Nuxt

A small Nuxt project using `@dotquilt/vue`:

- The components render on the server too, so their placeholders are in the first HTML, before any JavaScript runs. Hydration leaves them as they are; the elements register after mount.
- Each component loads its own data (`app/components`) and passes `state` to its loader. The API routes in `server/api` wait 900 ms, so the placeholders show for a moment.
- `/revenue` is reached through a client-side `<NuxtLink>`: its chart and table loaders start fresh on a page Nuxt swaps in without a document load.

## Run it

From the repository root:

```sh
bun install
bun run build
bun run --cwd examples/nuxt dev
```

Then open http://127.0.0.1:4361.

`tests/nuxt` checks the server HTML, hydration without warnings, the handoffs, events, a client-side navigation and the layout without JavaScript (`bun run test:e2e --project=nuxt-chromium`, after `bun run build`). `nuxt build` type-checks the templates with vue-tsc. The root `tsc` run skips this folder.

`app/docs/` holds the Vue code the docs site's component pages show, and `/docs` runs it; keep it in step with the React versions in `examples/site/react/`.
