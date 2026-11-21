# Add Dotquilt loading states to this project

You are adding Dotquilt to this codebase. Dotquilt is a set of loading placeholders that hold the shape of the content while it loads, then hand over to it: when the data arrives, the placeholder's marks travel to the content's real shape, and the content wipes in as they leave.

Work in four phases. **Change no files until the user has answered your questions at the end of phase 2.**

- `dotquilt`: native Web Components with no runtime dependencies, for any framework or none.
- `@dotquilt/react`: React 19 components with server rendering. Peer dependencies: `react` and `react-dom` 19.
- `@dotquilt/vue`: Vue 3 components with server rendering (Nuxt too). Peer dependency: `vue` 3.5 or later.
- `@dotquilt/svelte`: Svelte 5 components with server rendering (SvelteKit too). Peer dependency: `svelte` 5.
- `@dotquilt/angular`: standalone Angular components with server rendering (Angular SSR). Peer dependency: `@angular/core` 22.

## Phase 1: Learn Dotquilt

Read the documentation first: https://dotquilt.dev/llms-full.txt has every page as Markdown (https://dotquilt.dev/llms.txt is the index). Prefer it over memory: Dotquilt is new, and your training data may not know it. You need the exact text, so if your web tool summarises pages, download the file instead (for example with `curl`). If you can't fetch URLs at all, use the reference at the end of this prompt, and once the packages are installed, their TypeScript types.

## Phase 2: Analyse the project, then ask

Read the code; don't guess. Find:

1. **Stack.** Framework and version (Next.js App Router or Pages Router, Remix or React Router, Vite with React, Astro, Vue, Svelte, Angular, plain HTML), React version, TypeScript, the package manager (from the lockfile), and the workspace layout in a monorepo.
2. **Rendering.** Where code runs: server components, server rendering, static export or a client-only app. Where the `'use client'` boundaries are.
3. **Data loading.** How data arrives: `fetch` in effects, TanStack Query, SWR, Apollo or urql, RTK Query, server actions, route loaders, Suspense. Which states each one exposes: the first load, a background refetch, pagination that keeps the previous page, errors.
4. **Every place that waits for content.** Search for `isLoading`, `isPending`, `isFetching`, `loading`, `status === 'loading'`, Suspense `fallback`, `loading.tsx` or `loading.js`, `Skeleton`, `Spinner`, `Loader`, `animate-pulse`, `shimmer`, "Loading…" text, placeholder libraries (react-loading-skeleton, MUI, shadcn/ui, Chakra or Ant Design skeletons) and "is typing" indicators. For each: the file and line, what content it stands in for (a paragraph, a list, a card, an avatar, an image, a number, a table, a chart, a chat reply), its size, and how often people see it.
5. **What to leave alone.** Spinners in buttons and form submissions, upload progress and route-change indicators show that an action is running, not the shape of content. They stay as they are.
6. **Styling and theme.** The CSS approach (Tailwind, CSS Modules, CSS-in-JS, plain CSS), the design tokens or brand colours, and how dark mode works (a media query, a class or a data attribute).
7. **Constraints.** A Content Security Policy (in headers, middleware or a meta tag): does `style-src` allow inline styles, use a nonce, or hashes? Tests that cover loading states (unit, component, end-to-end, visual snapshots).
8. **Gaps.** Places that never leave their loading state when a request fails, and places with no error message. Note them; fixing them means changing data code, so they are follow-ups unless the user asks.

Then reply with:

- **Findings:** the stack in a few lines, and a table of the waiting places: `# | file | stands in for | today | data source | proposed placeholder | priority`.
- **Plan:** the steps of phase 3, filled in for this project.
- **Questions:** only what the code didn't answer, each with your recommended default. Typical ones:
  1. Which places: all of them, or the highest-priority few first?
  2. Replace an existing skeleton library, or leave it where it is?
  3. Marks: `dot` (the default), `dash` (suits text lines and table rows) or `square` (crisp at small sizes)?
  4. Colours: Dotquilt's neutral slate with a teal glow, or the app's own tokens (name the ones you'd use)?
  5. Fast responses: skip the placeholder for answers under about 150 ms (`delay`), and keep a shown one for at least about 500 ms (`minDisplay`)?
  6. The nonce source, if a Content Security Policy needs one.
  7. React below 19, Vue 2, Svelte 4 or Angular below 22: upgrade, or use the native elements?

**Stop here and wait for the answers.**

## Phase 3: Implement, in this order

1. **Install** with the project's package manager: `dotquilt`, plus the framework's package (`@dotquilt/react` for React 19, `@dotquilt/vue` for Vue 3.5, `@dotquilt/svelte` for Svelte 5, `@dotquilt/angular` for Angular 22), version 0.2.0 or later (upgrade an older install). Check the installed versions and peer dependencies.
2. **Set up once, globally.**
   - **Theme**, if the user wants the app's colours: set `--dotquilt-color` (the resting marks) and `--dotquilt-accent-color` (the glow and the chart's handoff) in global CSS, for light and dark, from the app's tokens, under the app's own dark-mode selector.
   - **Dark mode:** Dotquilt's default colours use `light-dark()`, which follows the page's `color-scheme`. If the app has a dark mode but never sets `color-scheme` (common when dark mode is only a media query or a class), set it to match (`color-scheme: light dark`, or `dark` under the app's dark selector), or set both colour properties for each mode as above. Otherwise the marks stay light in dark mode. If the theme switches with a class while the page is open, call `refreshStyles(document)` from `dotquilt` after the switch: ChartLoader and TableLoader draw on a canvas and read their colours once.
   - **Content Security Policy**, if styles need a nonce or hashes: pass the same `stylePolicy` to every Dotquilt component (`{ mode: 'inline', nonce }`, or `{ mode: 'external', href }` with the stylesheets the package ships). A small wrapper that supplies it is fine.
   - **Native elements only:** call each `register…()` once in the client entry, before the elements are used. The framework packages' components register themselves.
3. **Convert the highest-priority place first,** end to end, and check it in the browser before repeating the pattern.
4. **Convert the rest, one place at a time,** in priority order. For each:
   - **Wrap only the part that loads** in a `LoadingRegion` (`<dotquilt-region>`) with an `aria-label` naming what loads. Keep headings, card frames, toolbars and table headers outside the region: they are already there and should stay still. A `TextLoader` holds a single value and is its own region, with no wrapper.
   - **Map the existing state; don't change how data is fetched:**
     - the first load, with nothing to show yet: `state="pending"`;
     - a newer copy of data already on screen (a background refetch, the next page while the previous one stays, a refresh button): `state="refreshing"`, which keeps the content visible and usable;
     - data, an empty result or an error: `state="ready"`. For an error, also pass `timing={{ duration: 0 }}` so the app's error message replaces the placeholder at once.
     - `cycle`: a string that names the current request (an id, the query key, a page number), so a stale answer can't settle a newer one.
   - **Pick the placeholder by the content's shape, and give it the content's size,** so nothing moves when the content arrives:

     | Content | Placeholder |
     | --- | --- |
     | Paragraphs, lists of text | `SkeletonText` with about as many `lines` as the text, or one `SkeletonLine` per line with widths like the real ones |
     | An avatar | `SkeletonCircle` at the avatar's size |
     | An image, media or a card | `SkeletonBlock` at the content's height or aspect ratio |
     | A number or a short label | `TextLoader` with a `mask` in the value's shape, such as `$00,000` |
     | A line, bar or scatter chart | `ChartLoader` with its `variant`, at the chart's height, and a `targetProvider` that returns where the real line, bars or points will be |
     | A table's rows | `TableLoader` with the real table's `rows`, `rowHeight` and `columns` (`text`, `number`, `badge` or `date`, with width shares; `number` cells end-align, so use it only for end-aligned figures) |
     | A reply being written | `TypingDots` in the reply bubble |

     Measure the real content in the browser and match it: give `SkeletonText` the text's line height (a `gap` and `margin-block` from `1lh`, as the Skeleton page shows).
   - **Tables:** a region can't sit inside a `<table>` (the HTML parser moves it out, and hydration breaks), and `TableLoader` draws rows, not a header. To keep the column headers still while only the rows load, put the header in its own `<table aria-hidden="true">` above the region, give both tables the same `<colgroup>` widths with `table-layout: fixed`, and name the columns for screen readers in the table inside the region with a visually hidden `<thead>` (the project's `sr-only` or visually-hidden class): the handoff draws no marks for text that can't be seen. For a table built from CSS grid, keep the header row outside the region. Don't wrap the whole table, header included, in one region: the header would wipe in with the rows.
   - **Refreshing regions** draw a thin row of marks just above their top edge, across their full width. Leave room above a region that sits right under a toolbar or button (a margin, or `--dotquilt-refresh-gap`), so the row doesn't cross it.
   - **TextLoader** takes its value as one string child (`{formatted}`, not `$` followed by `{value}`), and its `aria-label` names the value.
   - **Share a placeholder** that appears twice, such as in a region and in a route's `loading.tsx`, as one small component, so both stay the same shape.
   - **Remove what it replaces** for that place: the spinner or skeleton markup, and CSS, imports or packages left unused, if the user agreed.
5. **Follow the framework's rules.**
   - **Next.js App Router:** the components are client components that also render on the server. Keep the state in a client component of your own. Render the same `state` on the server and in the first client render (no `typeof window` branches), and never load Dotquilt with `dynamic(..., { ssr: false })`. Functions such as `targetProvider` can't cross from a Server Component, so keep them in client components.
   - **Suspense fallbacks and `loading.tsx`:** a placeholder can be the fallback on its own, without a region. On its own it is decoration, hidden from assistive technology, so keep the page's own words nearby if the wait matters.
   - **Vue and Nuxt:** use `@dotquilt/vue`; no configuration. Put the placeholder in the region's `#placeholder` slot; events are `@handoff-end` and the like. Load data after mount or with `useFetch(…, { server: false })`, and render the same `state` on the server and in the first client render.
   - **Svelte and SvelteKit:** use `@dotquilt/svelte`. The placeholder is a `placeholder` snippet; events are callback props such as `onHandoffEnd`. Give a `TextLoader` a `mask`: a snippet's text isn't known on the server.
   - **Angular:** use `@dotquilt/angular` and add the components to each component's `imports` (no `CUSTOM_ELEMENTS_SCHEMA`). Mark the placeholder element with `dotquiltPlaceholder`; outputs are `(handoffEnd)` and the like. With Angular SSR and `provideClientHydration()`, the placeholders are in the server HTML; the styles use the app's `CSP_NONCE`.
   - **Plain HTML, or a framework version without a package:** use the native elements. Register them before they render, set `state` as an attribute or call `region.update({ state, cycle })`, and pass objects such as `columns` as properties. In Vue templates set `compilerOptions.isCustomElement`; in Angular templates add `CUSTOM_ELEMENTS_SCHEMA`.
   - **React below 19:** `@dotquilt/react` needs React 19. Use the native elements through refs, or upgrade if the user chose to.
   - **Import only what a page uses:** a framework package (or a single entry such as `@dotquilt/vue/region`; Angular has one entry, and its build keeps only what you use); for native elements, `dotquilt/region`, `dotquilt/skeleton`, `dotquilt/text`, `dotquilt/chart`, `dotquilt/table` and `dotquilt/typing`.
6. **Keep it accessible.** Every region has an `aria-label`. Keep the app's own messages: errors in `role="alert"`, and a `role="status"` line outside the region where the wait matters. Don't add `aria-busy` or your own reduced-motion checks around Dotquilt: the region already keeps pending content out of reach and follows the visitor's motion settings.

## Phase 4: Verify, then report

1. Run the project's type check, linter, tests and build. Fix what the change broke. Update snapshots only where a loading state changed on purpose, and say which.
2. Run the app and check each converted place: the placeholder shows at the content's size, the content arrives without the layout jumping, the handoff plays, and an error swaps in at once. Check light and dark, a narrow window, and reduced motion (the content then swaps in without the animation).
3. With server rendering: the first HTML already holds the placeholder, and the browser console shows no hydration warnings.
4. Report: what changed in each place (file, before and after), anything skipped and why, suggested follow-ups, and how to undo it (the packages and files touched).

## Rules

- **Change presentation only.** Read the data layer's state; don't change requests, query keys, caching, retries or error handling.
- **Leave action indicators alone:** button spinners, submit and upload progress, route-change bars.
- **Follow the project's conventions** for file layout, naming, formatting and component patterns. Don't add a state library or rewrite components.
- **One place at a time;** the project builds after each.
- **Don't invent APIs.** If unsure, read the docs or the package's types.

## Reference

Use this only if you can't read the docs.

- **React:** `<LoadingRegion aria-label="…" state={…} cycle={…} placeholder={<SkeletonText lines={3} />} delay={150} minDisplay={500} timing={{ duration: 0 }}>{content}</LoadingRegion>`.
- **Vue:** `<LoadingRegion aria-label="…" :state="…" :cycle="…"><template #placeholder><SkeletonText :lines="3" /></template>…content…</LoadingRegion>`.
- **Svelte:** `<LoadingRegion aria-label="…" state={…} cycle={…}>{#snippet placeholder()}<SkeletonText lines={3} />{/snippet}…content…</LoadingRegion>`.
- **Angular:** `<dotquilt-region aria-label="…" [state]="…" [cycle]="…"><div dotquiltPlaceholder><dotquilt-skeleton-text [lines]="3" /></div>…content…</dotquilt-region>`.
- **Skeletons:** `SkeletonText` (`lines`), `SkeletonLine`, `SkeletonCircle`, `SkeletonBlock`; size them with CSS like any element.
- **TextLoader:** `<TextLoader aria-label="Revenue" mask="$00,000" state={…} cycle={…}>{formatted}</TextLoader>`, with the value as one string. The character effect covers printable ASCII on one line; other text falls back to a plain field of marks.
- **ChartLoader:** `<ChartLoader variant="line" targetProvider={({ width, height }) => data ? { kind: 'line', points: [{ x, y }, …], baseline: height } : null} style={{ height: 160 }} />`; `kind: 'bar'` takes `bars` (rectangles) and a `baseline`, `kind: 'scatter'` takes `points`.
- **TableLoader:** `<TableLoader rows={5} rowHeight={40} columns={[{ kind: 'text', width: 2 }, { kind: 'number' }, { kind: 'badge' }]} />`.
- **TypingDots:** `<TypingDots />`.
- **Native:** `<dotquilt-region state="pending" aria-label="…"><dotquilt-skeleton-text slot="placeholder" lines="3"></dotquilt-skeleton-text>…content…</dotquilt-region>`, then `region.update({ state: 'ready', cycle })`.
- **States:** `pending` shows the placeholder and keeps the content hidden and inert; `refreshing` keeps the content visible with a thin row of marks above it; `ready` hands over in about a second.
- **Every component:** `mark` (`dot`, `dash`, `square`), `motion` (`system` or `paused`), `stylePolicy`.
- **Theme properties:** `--dotquilt-color`, `--dotquilt-accent-color`, `--dotquilt-dot-size`, `--dotquilt-dot-gap`, `--dotquilt-radius`, `--dotquilt-refresh-gap`. The defaults use `light-dark()`, so the page's `color-scheme` decides light or dark.
