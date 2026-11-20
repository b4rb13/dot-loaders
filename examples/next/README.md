# Dotquilt with Next.js

A small Next.js App Router project using `@dotquilt/react`:

- `app/page.tsx` is a Server Component. The client components it renders (`team-list.tsx`, `revenue-total.tsx`) render on the server too, so their placeholders are in the first HTML, before any JavaScript runs.
- Each client component loads its own data and passes `state` to its loader. The API routes in `app/api` wait 900 ms, so the placeholders show for a moment.
- `/revenue` is reached through a client-side `<Link>`: its chart loader starts fresh on a page Next swaps in without a document load.

## Run it

From the repository root:

```sh
bun install
bun run build
bun run --cwd examples/next dev
```

Then open http://127.0.0.1:4360.

`tests/next` checks the same three things in a browser (`bun run test:e2e --project=next-chromium`, after `bun run build`). The root `tsc` run skips this folder: `next build` type-checks it.
