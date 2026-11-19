# Dotquilt as a product: strategy and plan

Written 2026-11-19 from six research reports covering 45+ products: UI kits, motion libraries, open-core component vendors, loader competitors, licensing models and the best developer websites. The full reports, with a source link for every price and number, are in [`docs/research/2026-11/`](../research/2026-11/). This is research, not legal or tax advice.

## The recommendation in one page

1. **Keep the core MIT, and promise it in writing.** All nine components, every animation, the React adapter, the docs and the standard playground stay free. That includes accessibility, SSR and theming.
   - **Why:** competitors are free and MIT. react-loading-skeleton has 1.63M downloads a week and react-content-loader 1.04M. Company policies block AGPL, non-commercial and source-available packages, Google among them. Every vendor that left a permissive license kept rewriting its terms: Handsontable in 2019, tldraw three times in two years, GSAP until it was sold.
   - **The license is still a free choice.** Nothing is published yet.
2. **Earn money with Dotquilt Pro: concrete, assembled things, paid once.**
   - **What sells is source code people can drop in.** Motion's founder reports that paywalled example source drives Motion+ sales, while feature releases caused no bumps, and that "people pay for concrete things".
   - **Every kit that sells is assembled value:** Aceternity, Magic UI, shadcnblocks, React Bits, Untitled UI and Tailwind Plus.
   - **Pro v1 is "Dotquilt Screens":** complete app screens (dashboard, data table, inbox/chat, settings, analytics, AI assistant). Each screen has every state: loading, refreshing, empty, error, partial and ready. They come in React and plain HTML, wired to real fetch patterns.
   - **Pro also adds:**
     - a Pro motion collection (new animations, never existing ones);
     - playground presets and export;
     - a Figma kit.
3. **Price it like the market, without subscriptions.**
   - One-time, with seat tiers and 12 months of updates; you keep every version you received.
   - Proposed launch prices: **Solo $149, Team (10) $449, Company $999**, with renewal at about 50%.
   - The market range for individuals is $129–$399: React Bits $129–349, Magic UI $199, Aceternity $199, Chakra Pro $299, Untitled UI $349, Motion+ $399.
   - Use subscriptions only for things that run on our servers, if we ever host any.
4. **Enforce by delivery, never at runtime.**
   - Pro is delivered per customer: a private GitHub repo invite, a token-gated shadcn-style registry, and a download.
   - The library has no license keys, watermarks or telemetry. A license fault must never blank someone's loading state. tldraw stops rendering after 5 s without a key, and Handsontable shows a blocking modal; we do neither.
5. **Sell through Polar or Paddle**, both 5% + 50¢. Polar includes license keys, file delivery and GitHub repo invites. **Lemon Squeezy is out:** it closed new sign-ups on 2026-11-16.
6. **Distribution matters more than Pro.** Revenue scales with the free funnel: FullCalendar Premium is downloaded at about 7.6% of its core's rate. So the next engineering work is mostly free-side growth:
   - a shadcn registry;
   - Vue, Svelte and Angular wrappers;
   - AI tool-result placeholders;
   - a smaller bundle;
   - anti-flicker timing;
   - auto-generated skeletons.
7. **Before charging anything, pass the gates you already approved** (policy of 2026-10-16):
   - 10 qualified conversations;
   - 5 independent prospects with the same problem;
   - 3 written, non-binding statements of purchase interest at a disclosed test price;
   - a pilot budget and a cost model.

**Decisions only you can make** are listed at the end.

---

## What the market says

### Who earns money, and how

| Product | Free part (license) | What's paid | Model and price (2026-11-19) | Delivery | Lesson for Dotquilt |
| --- | --- | --- | --- | --- | --- |
| **Motion / Motion+** | Motion, MIT | Example source, UI components, AI kit | $399 one-time per developer; yearly seats for teams | Token-gated private package and repo | Closest analogue: MIT core plus paid concrete source |
| **Aceternity UI Pro** | 100+ components | 200+ blocks, templates | $199 lifetime; Team (10) $1,590 | shadcn CLI with key, MCP | Assembled blocks sell; avoid its upsell banners in docs |
| **Magic UI Pro** | 150+ components, MIT | Sections, templates | $199 lifetime | Private shadcn registry | Same model; avoid "Limited Time Offer" blocks |
| **React Bits Pro** | 100+ components (MIT + Commons Clause) | New collection: 255 components, app UI, templates | $129 / $249 / $349 | License-gated registry, MCP | Pro is a **new collection**, not a paywall on existing work |
| **shadcnblocks** | Free blocks | 2,866 blocks, Figma kit | $149 / $299 / $399 lifetime | shadcn CLI key, MCP | 5,420 paying customers: volume plus agent-ready delivery |
| **shadcn/studio** | 57 blocks | 1,100+ blocks | $99–$849 | shadcn CLI, MCP | Cheap entry tier |
| **Untitled UI React** | Base components, MIT | 5k components, 250 pages | Solo $349 to Enterprise $8,999 | CLI key; repo for Enterprise | Seat bands scale price with company size |
| **Tailwind Plus** | Tailwind CSS, MIT | 500+ blocks, templates | $299 / $979 one-time | Members site | **Warning:** revenue down about 80% as AI cut docs traffic; closed to new customers on 2026-09-09 |
| **Chakra UI Pro** | Chakra UI, MIT | 330 blocks, templates | $299 / $899 | CLI with API key | Same model |
| **Flowbite Pro** | MIT | Blocks, dashboards, Figma | $299 dev, $169 Figma | Download | Sells Figma separately |
| **Preline Pro** | MIT + fair use | 780 blocks, templates | $249 / $459 | Magic-link account | Adds an MCP subscription in 2027 |
| **daisyUI** | MIT | Templates, Figma, MCP | $19–$69 templates; $22/mo MCP | Store | Donations negligible ($968/yr) |
| **Cult UI** | MIT | Cult Pro (going open source) | — | — | **Warning:** about 416 buyers in 3 years |
| **React Flow Pro** | MIT | Pro examples, support | Subscription from $169/mo | Pro platform | Works because flows are mission-critical; "sponsors didn't pay the bills" |
| **MUI X** | Core MIT | Advanced grid, charts, pickers | $299/dev/yr or $657 perpetual | Public npm + key + watermark | Grids are mission-critical; loaders aren't |
| **AG Grid** | Community MIT | Enterprise features | $999/dev perpetual + 1 yr updates | Key, watermark | £16M revenue (2022); built on a huge free funnel |
| **FullCalendar** | MIT | Timeline and resource views | from $480 | Key | Premium only ~7.6% of core downloads |
| **Web Awesome** | Web Components, MIT | Pro components, themes, Figma | $228/seat/yr | Account | Closest *technical* analogue; written "free stays free" promise |
| **Font Awesome** | Free icons | More icons, tools | $48–$192/yr | Private npm | Subscription for assets |
| **Tiptap** | MIT editor | Cloud platform, AI | from $49/mo | Private registry | Open-sourced its small paid extensions in 2025: small add-ons don't sell |
| **Sidekiq** | LGPL | Pro / Enterprise features | $995/yr per organisation | Private gem server | Flat per-organisation price; "closer to 10M than 1M" |
| **Highcharts** | Personal use only | Any commercial use | from $366/seat | Credits link, audits | Works for an incumbent; not for a newcomer |
| **amCharts** | Free with logo | Logo removal | $180 perpetual | Honour system | Watermarks don't fit a loader: it shows for a moment |
| **Handsontable** | Non-commercial key | Commercial use | Quote | Blocking modal | Left MIT in 2019; growth stalled |
| **tldraw** | Watermark, then key | Production use | Not public | Stops rendering after 5 s | Three license redesigns in two years |
| **Syncfusion / Kendo / DevExpress** | Community tiers | Suites | $650–$2,300/dev/yr | Keys, banners | Enterprise suites; not our league |
| **GSAP** | Custom no-charge license | (was Club plugins) | Now free (Webflow) | — | 16 years of a custom license; "95%+" never paid |
| **Remotion** | Free ≤3 people | Company license; source kits | $25/seat/mo; kits $300–$600 one-time | Telemetry; private repo | Size-gating works only without substitutes; its **source kits** fit us |
| **FormKit Pro** | MIT (+AutoAnimate) | Pro inputs | $149 one-time per project | Key + telemetry | Price point; but no keys or telemetry for us |
| **LottieFiles / Rive / Spline** | MIT runtimes | Editors, AI, hosting | $9–$120 per seat/mo | SaaS | Charge for the tool, never the runtime |
| **Anime.js / react-spring** | MIT | Sponsors | ~$700–$7,600/yr | — | Donations don't pay, even at millions of downloads |
| **Theatre.js** | Apache / AGPL | Never launched | VC seed | — | Went dark before monetising |

### Competitors in loaders

| Library | Weekly downloads | What it does well | What it lacks next to Dotquilt |
| --- | --- | --- | --- |
| react-loading-skeleton | 1.63M | Sizes itself from text; ~2.2 KB | Grey pulse only; no handoff; last release 2024 |
| react-content-loader | 1.04M | SVG presets; React Native | No handoff, no a11y beyond basics |
| **boneyard-js** | 143k (new in 2026) | **Generates skeletons from your real DOM**; six frameworks | No reduced motion, no inert, breaks strict CSP |
| ngx-skeleton-loader | 299k | Angular, progressbar semantics | Angular only |
| UI-kit skeletons (MUI, Chakra, Mantine, shadcn, antd) | — | Built in | Plain grey blocks; only Radix makes pending content inert; none handle forced colours |
| assistant-ui Dot Matrix | (3.36M for the package) | Dot-matrix status with 20 states | Indicator-sized; no whole-region skeletons |

**Nobody makes chart- or table-shaped placeholders, and nobody hands off with a shaped transition.** React 19.3's stable `<ViewTransition>` cross-fades a Suspense fallback for free, so Dotquilt's handoff has to be visibly more and work alongside it. Nobody sells skeleton code profitably: the best-selling content loader on CodeCanyon is $5 with 272 sales. That confirms Pro must sell screens and tools, not loaders.

---

## License: options weighed

| Model | Adoption | Revenue potential | Enforcement | Verdict |
| --- | --- | --- | --- | --- |
| **A. MIT core + commercial Pro bundle** | Best | Low to moderate, from Pro's own value | Honour system plus per-customer delivery | **Recommended** |
| A′. MIT core + Pro runtime components with key and watermark (MUI X) | Good, with friction | Moderate, for mission-critical parts only | Medium | Conflicts with the policy; loaders aren't mission-critical |
| B. Source-available, free for small companies (Remotion, PolyForm Small Business) | Poor: legal review everywhere | Moderate in theory | Needs telemetry | No: substitutes are one `npm install` away |
| C. GPL/AGPL + commercial | Poor: banned at many companies | Low for loaders | Medium | No |
| D. Free with watermark (tldraw, amCharts) | Medium | Low: a loader is visible for a moment | Medium | No: hurts customers' users and the brand |
| E. FSL / BSL / Fair Source | Moderate penalty | About none: only stops clones | Low | No: doesn't earn money |
| F. PolyForm Noncommercial | Very poor | Low | Medium | No |

**The Pro license, in plain words** (a draft outline; counsel should finalise it):
- **Seats:** Solo is one developer; Team is up to 10; Company covers one organisation.
- **What buyers can do:** use Pro in unlimited end products, including commercial work, SaaS and client work. The client keeps the delivered product.
- **What buyers can't do:** redistribute Pro files on their own, build competing kits, templates or loader libraries, or put Pro into site builders or AI generators. That last case needs a separate Builder license, added later if there's demand. AI-assisted rewrites still count as derivatives.
- **Versions and updates:** buyers keep every version they received; updates run for 12 months.
- **Support:** 30 days of setup help.
- **Refunds:** a 14-day refund.
- **Trust:** no audits, no telemetry.

**Also:** register "Dotquilt" as a trademark. MIT doesn't protect the name.

---

## The Pro offer

Each part follows the evidence of what sells. Everything Pro is a **new collection**; nothing free moves behind payment.

| Part | What's in it | Why |
| --- | --- | --- |
| **Screens** (the core of Pro) | 8–12 complete screens: analytics dashboard, data table with filters, inbox/chat, AI assistant with streaming and tool results, settings, billing, activity feed, onboarding. Every state (loading, refreshing, partial, empty, error, ready), with real fetch, TanStack Query, SWR and Suspense patterns. React (Next.js) and HTML. | "Concrete things" sell (Motion Examples, Remotion kits, Tailwind Plus) |
| **Motion pack** | New idles and handoffs in the same calm style, for example morph-to-text, stagger-by-reading-order and an ink-spread reveal | React Bits sells Pro as a new collection |
| **Playground Pro** | Save presets, team presets, export to design tokens / CSS / Tailwind theme, and StackBlitz export | Tools sell when they save time; React Bits uses free tools as acquisition, so keep basic export free |
| **Figma kit** | Placeholders and states as Figma components | Flowbite and Untitled UI sell Figma; Obra's kit made about €10k in 40 days |
| **Support** | 30 days of setup help; Team and Company get priority issues | React Flow Pro |

**Delivery:**
- A private GitHub repo invite, so buyers get source and history.
- A token-gated shadcn-style registry (`npx shadcn add @dotquilt-pro/dashboard`) plus an MCP server, so AI agents can install screens. The kits that are growing all do this.
- A zip download.
- Builds never depend on our registry; it is only for fetching.

**What it takes:**

| Target revenue | At $149 per sale | At $449 per sale |
| --- | --- | --- |
| $10k a year | about 72 sales | about 24 sales |
| $50k a year | about 360 sales | about 118 sales |

These are the volumes each target needs; they don't predict demand. Aceternity's founder reported about $40k a month at his peak, and Cult UI made about 416 sales in three years, so the range is wide. The 10/5/3 gates are the honest test.

---

## Website, docs and playground

The full benchmark of 21 sites is in [`06-websites.md`](../research/2026-11/06-websites.md). These are the 15 patterns to adopt, in priority order:

1. **The hero is the product, running, with Replay and Pause.** Pause covers WCAG 2.2.2 for looping content. (React Flow, Linear)
2. **Option chips that drive the live component and rewrite the code together.** (Sonner)
3. **An install line with copy and package-manager tabs**, in the hero and on every docs page. (Motion, shadcn)
4. **An "every component, in context" grid**: scenes, not specimens. (Animate UI, Radix)
5. **"Load again" on every preview**, so the handoff is seen more than once. (Resend, Sonner)
6. **The shadcn docs page anatomy:** Copy page, an HTML/React switch, preview, install, usage, examples, API, then Accessibility and SSR sections.
7. **The playground** as a realistic canvas, with presets, labeled controls, live code and a copy link. (Paper Shaders)
8. **"What a placeholder has to get right"**: an accessibility section with live toggles. Few competitors can claim this. (Radix)
9. **A spec-sheet row** instead of vanity stats: KB per component, zero dependencies, SSR, reduced motion, MIT. (React Flow, Remotion)
10. **A closing fork, "Choose where to start": free or Pro.** (Motion)
11. **Honest "Pro" pills inside the gallery and playground**; API docs stay public. Never banners, modals, countdowns or struck-through prices. (React Flow, Motion)
12. **A pricing page with two columns**, the promise "Components that are free today stay free", and a licensing FAQ. (Motion+, Raycast, Remotion)
13. **A latest-releases strip** and a changelog page. (React Flow, Linear)
14. **Agent-ready docs:** `/llms.txt`, per-page Markdown, "Copy page", and "Copy prompt" on examples. (Liveblocks, shadcn, Clerk)
15. **Restraint as performance:** no hero video, lazy demos, and a page-weight budget. (Linear, Sonner; Aceternity loads 250 requests as the counter-example)

**Site map:** Home, Docs, Examples, Playground, Pricing, Changelog and License. Add a Showcase only once there are real users. The nav says "Pricing", not "Pro".

---

## Product roadmap

### Done today (2026-11-19, PRs #66, #67 and #68)
- **Your decisions 1, 4, 10 and 11 are built:**
  - size budgets per entry;
  - a visible fallback for non-ASCII TextLoader text;
  - errors that repeat once per load;
  - pending server content kept visible and documented.
- **Font loads no longer cut reveals short.**
- **Feature parity with the old version:**
  - the six pruned animations are back: chart `scan`, `terrain` and `cycle` (the chart that changes type), and text `scrambleCharacters`, `scrambleWords` and `printText`;
  - skeleton hover lift works again, as a glow that follows the pointer;
  - the playground has every option again: pointer, every animation with sliders, handoff length, lines/rows/dots, international text and table cell styles;
  - the docs list them all;
  - the gallery has examples for each.

### Next, before an alpha (P0)

| Item | Why |
| --- | --- |
| **Anti-flicker timing** on LoadingRegion: `delay` (don't show a placeholder for fast responses) and a minimum display time | Competitors have it (Element Plus, react-placeholder). Fast responses currently flash a placeholder |
| **Size diet** | We measure 6.4–16 KB gzip per entry against about 2.2 KB for react-loading-skeleton. Target −30% |
| **ViewTransition compatibility**, documented and tested | React 19.3 made it stable. Position the handoff as "more than ViewTransition, and works with it" |
| **The npm name**, then README, changelog, publish dry run | Needed for Phase 5 |
| **A Next.js example project and React fast tests** | Covers SSR and hydration after the old Next suite was dropped |
| **`/llms.txt` and "Copy page"** | Agent-ready docs |

### Growth (P1, free)

| Item | Why |
| --- | --- |
| **shadcn registry** (`npx shadcn add dotquilt/...`) | The `shadcn` package has 18.9M weekly downloads; AI UI is consolidating there |
| **Vue, Svelte and Angular wrappers** (thin, typed) | NumberFlow (3.5M/wk) proves a custom element plus wrappers wins distribution |
| **AI pack:** a streaming-text placeholder, a tool-result region (chart, table or text placeholder for a pending tool call), and a status indicator (thinking, searching, working, error) | The clearest open gap in the market. Text shimmer is the dominant AI idiom; nobody shapes tool results |
| **Auto-skeleton:** `LoadingRegion auto` measures the last rendered content, plus a CLI or Vite plugin that snapshots real components | boneyard-js grew to 143k/wk in seven months on exactly this, and it lacks our accessibility and CSP rigour |
| **Presets gallery** (`definePreset` recipes) and a Tailwind preset | Competitors ship presets and a builder |
| **Accessibility as marketing:** a "What a placeholder has to get right" page | A unique, verifiable claim |

### Pro (P2, after the 10/5/3 gates)
- Screens collection v1 (8 screens), the motion pack, Playground Pro and the Figma kit.
- Polar or Paddle checkout, the private repo and registry, and the license page.

### Later
- React Native.
- A devtools overlay showing loading states, cycles and time to ready.
- Testing utilities (await handoffs in Playwright and Jest).
- A Builder/OEM license.

---

## Decisions only you can make

1. **Business model.** Approve "MIT core + one-time Pro bundle", which is the current plan, confirmed by the research. The alternatives are weighed above.
2. **Pro pricing.** Solo $149 / Team (10) $449 / Company $999 with about 50% renewal, or the earlier guess of $99 / $299.
3. **The seller and the country.** This decides the merchant of record: Polar, Paddle, or Stripe Managed Payments (which covers only about 37 countries).
4. **A Pro waitlist** by email (needs a privacy page and a mail provider), or point people to GitHub Releases.
5. **The npm name and trademark registration.**
6. **Pro v1 scope:** which 8 screens first.
7. **Who runs the 10 conversations** for the demand gate, and with whom.
