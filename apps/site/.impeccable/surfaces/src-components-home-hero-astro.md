---
version: 2
slug: "src-components-home-hero-astro"
primary_target: "src/components/home/Hero.astro"
related_targets: ["src/content/docs/index.mdx", "src/components/home/Screen.astro", "src/components/home/screen.ts", "src/components/home/Page.astro", "src/components/home/app.css", "src/components/home/hold.css", "src/components/home/HoldButton.astro", "src/components/site/Header.astro"]
---

# Homepage: one real screen, loading

Mode: Persuade. Structure: the owner's pick, a "combination of variants A and C" from the preview pages. A ("One real screen, loading") gives the first screen and the example screens; C ("You are the network") gives the hold-to-load controls and the last sections. It replaces the earlier comp-led field hero ("The field becomes the page"), which is gone. SPEC.md's homepage line records the new pick.

The page: `src/content/docs/index.mdx` → Starlight's Hero (overridden by `Hero.astro`, which renders `Screen.astro` on `/` only) → `Page.astro` for every section below. The site footer is unchanged.

## First screen

| Ingredient | Built as |
| --- | --- |
| Headline "Loading states / that hand over." | h1, Manrope 500, clamp(44px, 5.4vw, 72px), line-height 1; clamp(40px, 9vw, 60px) below 960px. The copy column is `calc(--h1 * 6.62)` wide. |
| Lead | p, 18.75px / 1.5 `muted`, max 26rem |
| Actions "Get started" / "See the components" | `home-button primary` and `home-button`, 52px tall, 24px padding, 1rem, 14px apart |
| Meta line | "Nine native web components and a React adapter. Free and MIT licensed." 0.8125rem `faint` |
| Field | a real `dotquilt-skeleton-block` at `motion="paused"`, 2.8px / 19.6px in `--dq-ink`, filling the stage behind the frame under a radial mask strongest at the top right |
| App frame "Revenue" | `.va-frame`: 16px radius, `line` hairline, `--dq-shadow-lg`, at most 1040px wide, bleeding 24px past the window's right edge. Bar: workspace initial, title, Range track (7 / 30 / 90 days). |
| KPI strip ×3 | real `dotquilt-text-loader mark="square"`, value 1.75rem tabular; delta in `positive` / `negative` on the label's line |
| Chart | `dotquilt-region` with a `dotquilt-chart-loader variant="line"` placeholder handing over to a 2.4px `accent` line and a ringed end node |
| Table "Largest invoices" | column heads in a separate `aria-hidden` header table outside the region (same colgroup); inside, one `dotquilt-table-loader` row per data row and the real table with a zero-height thead for screen readers. Only rows load. |
| Foot | "Example data" tag and live status; Network track (Fast / Slow / Offline); a 30px pause / play key (`aria-pressed`) at the end |

Signature: the frame is a real screen that loads, beside the headline, over the product's own field of marks. Teal appears only on the arrived chart line and the primary action.

## Motion

Before paint, with motion allowed, the frame's loaders start pending. The frame fades in and rises 14px; the field fades in. First load: figures lock at 560 / 700 / 840ms, the chart hands over at 1060ms, rows at 1300ms. It rests about 4.2 s, then loads the next range from its placeholders (30 → 90 → 7 days), in a loop. The loop waits while the pointer is over the frame, keyboard focus is inside, it is off screen, the tab is hidden, the network is Offline, or it is paused. Range and network stay live; there is no "Load again" button. Reduced motion shows the frame loaded with no loop and no pause key. The header's wordmark arrival rests on this page (the first screen is the one focal motion) and the visit counts as arrived.

## Below the first screen

In order: Inbox, Invoices, Activity (app frames from A), Family, Handoff, Playground (C), Details (A's ruled rows with C-style hold proofs), Get started, Closing (C).

- Every example section: copy and controls LEFT, live result RIGHT (`.va-split`), never alternating; stacked with controls first below 56rem.
- Hold to load: press and hold (pointer, Space or Enter) keeps a demo loading, letting go delivers (`HoldButton.astro`, `hold.ts`, `hold.css`); DM Mono readout "Arrived after 1.4 s" and "Loaders rest after four seconds.". App-like controls (filters, pages, chips) load with a natural delay a hold can take over.
- Inbox: hold sends the next quick reply and keeps the customer typing. Invoices: Show filter and hold on the left, pager in the frame foot, five rows' height kept. Activity: hold to refresh (state "refreshing"); the feed has a fixed height and scrolls inside, keeping 12 items.
- Handoff: speed 1× / ½× / ⅓× (1.1 / 2.2 / 3.3 s) plus hold, with a three-phase timeline.
- Details: first three proofs live and held (Calm, Out of reach, Reduced motion), last three code.

## Responsive

≥960px: two columns, the stage bleeding right. <960px: copy, then the frame full width below. Frame container queries hide the network label (<720px), drop the Invoice and Project columns (<560px), stack the KPI strip (<460px) and widen the status column (<340px). Below 40rem every control is at least 44px.

## Not to literalize

The preview pages' alternating section sides, the page-wide tempo dial and the "Load again" button: none of them ship.
