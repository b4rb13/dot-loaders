# 01 · UI kits and component libraries with paid tiers

Research slice for the Dotquilt monetization decision. Researched 2026-11-19. Every fact has a source link. Unless noted otherwise, all prices are in USD and were read on **2026-11-19**. "(unverified)" means I could not confirm it on an official page. Vendor pages often disagree with themselves; where they do, both figures are given.

Method: official pricing, license, docs and home pages (WebFetch, curl, and a real browser for JS-rendered pages), the GitHub REST API for stars and licenses, and the npm downloads API for weekly downloads (week 2026-11-11 to 2026-11-17). I did not sign up, log in or buy anything.

---

## Comparison table

| Product | Free part and license | Paid model | Price (read 2026-11-19 unless noted) | Delivery of paid part | What's paid |
|---|---|---|---|---|---|
| React Flow Pro (xyflow) | Library, MIT | Monthly subscription for organizations; Enterprise is annual and quoted | Starter $169/mo, Professional $289/mo, Enterprise by quote. A second page says "from €129". | Downloadable Vite apps from the Pro platform | 16 Pro examples, 2 templates, prioritized issues, email support, permission to remove the attribution label |
| Aceternity UI Pro | 100+ components under a custom "Aceternity License" (MIT not stated on official pages) | One-time payment | 1-year $169, Lifetime $199, Team (10) $1,590 | Site, plus the shadcn CLI `@aceternity-pro` with a dashboard API key, plus MCP | 200+ blocks, 15+ templates, landing pages, interactions |
| Magic UI Pro | 150+ components, MIT | One-time payment | Individual lifetime $199 (no team price shown) | Private shadcn registry `@magicui-pro` with a Bearer token | 50+ sections, 9+ templates |
| shadcn/ui | Everything, MIT | None. The author works at Vercel. | – | – | – (the registry auth spec enables paid third parties) |
| shadcnblocks | Free blocks behind a login | One-time payment, lifetime | Pro $149, Premium $299, Elite $399 (Black Friday $89 / $179 / $239) | shadcn CLI with an API key, MCP, IDE extension | 2,866 blocks, templates, Figma kit, page builder |
| shadcn/studio | Community tier: 57 blocks, theme generator | One-time payment, lifetime | Basic $99, Pro $199, Team (15) $449, Enterprise $849 | shadcn CLI, MCP, IDE extension | 1,100+ blocks, templates, Figma, AI theme generation |
| Tailwind Plus | Tailwind CSS and Headless UI, MIT | One-time payment, lifetime. **Closed to new customers since 2026-09-09.** | Personal $299, Team (25) $979 (archived 2026-08-02) | Copy from the members site, download templates | 500+ UI blocks, templates, Catalyst UI kit |
| Chakra UI Pro | Chakra UI, MIT | One-time payment (lifetime for Personal) | Personal $299 (was $349), Team $899 (was $999) | License key; `chakra blocks add` with `CHAKRA_UI_PRO_API_KEY` | 330+ blocks, templates |
| Flowbite Pro | Flowbite, icons and illustrations, MIT | One-time payment | Developer $299, Designer (Figma) $169; Team $999 / $499 (10 members) | Download link by email; MCP | Blocks, dashboards, Figma, React pro |
| Preline Pro | Preline UI, dual "MIT" + "Preline UI Fair Use License" | One-time payment, plus an MCP subscription after 2027-01-01 | Pro (1 dev) $249, Team (15) $459, Enterprise custom | Magic-link account: copy blocks, download templates | 780+ blocks, 21 templates, AI prompts, animated icons, MCP |
| daisyUI | Library, MIT | Separate store items, plus an MCP subscription | Templates $19–$69+, Figma from $49, Blueprint MCP $22/mo, $45/quarter or $600 lifetime | Store downloads; license key for MCP | Templates, Figma library, AI MCP, swag |
| React Bits Pro | 100+ components, **MIT + Commons Clause** | One-time payment (license mentions annual plans) | Starter $129, Pro $249, Ultimate $349 | License-gated shadcn registry, `npx react-bits-pro init`, MCP | New collection: 255 components, 400 blocks, 300 app UI, 18 templates, Agent Kit |
| Untitled UI React | Base components, MIT | One-time payment, per seat band | Solo $349, Studio (8) $999, Business (20) $2,499, Enterprise $8,999 | `npx untitledui login` stores a key; Enterprise gets a GitHub repo | 5k+ components, 250+ pages, Figma sync |
| Cult UI / Cult Pro | 154 components, MIT | Cult Pro (lifetime/annual) **is going open source**; money now comes from AI SDK Agents | Not shown | Templates via GitHub | – |
| Origin UI → coss ui | MIT | None (built for Cal.com) | – | – | – |
| Animata | MIT | None | – | – | – |
| MUI X (adjacent) | MUI Core, MIT | Per developer per year, or perpetual | Pro $299, Premium $599, Enterprise $1,399 per developer per year | Public npm package plus a license key that removes the watermark | Advanced Data Grid, Charts, Pickers and more |
| Nuxt UI Pro (adjacent) | – | **Merged into free MIT Nuxt UI v4** after NuxtLabs joined Vercel | – | – | – |

---

## 1. React Flow / xyflow (React Flow Pro)

**Free vs paid and licenses**
- The core library is MIT. The Pro page says React Flow is "open-source MIT-licensed software, and it will be forever." ([reactflow.dev/pro](https://reactflow.dev/pro)) GitHub reports the license as MIT ([github.com/xyflow/xyflow](https://github.com/xyflow/xyflow)).
- xyflow calls its model a "thin-crust open-core model": the library, docs, discussions and Discord are MIT and free; the paid "crust" is subscriber support and Pro examples ([xyflow.com/open-source](https://xyflow.com/open-source)).
- Paid content: 16 Pro examples (Auto Layout, Collaborative, Undo and Redo, Helper Lines, Server Side Image Creation and others) and 2 templates (Workflow Editor, AI Workflow) ([reactflow.dev/pro/content](https://reactflow.dev/pro/content)).
- Pro-examples license: no formal license text is published. The page only says "Download the pro examples and templates and use them anywhere" ([reactflow.dev/pro/content](https://reactflow.dev/pro/content)). The Pro page lists the FAQs "How can I use the Pro Examples in my work?" and "What happens when I unsubscribe?" but the answers were not in the fetched HTML ([reactflow.dev/pro](https://reactflow.dev/pro)).
- Attribution: a small "React Flow" label links to the pricing page. The docs say "Only remove this attribution, if you are subscribed to React Flow Pro." This is a request, not something the MIT license enforces ([remove-attribution docs](https://reactflow.dev/learn/troubleshooting/remove-attribution)).
- Free Pro access is offered "to non-commercial open source projects and students" ([xyflow.com/open-source](https://xyflow.com/open-source)).

**Pricing (2026-11-19)**
- Starter $169/month: all Pro content, prioritized GitHub issues, 1 team-member invite, an intro call. Professional $289/month: 5 invites and up to 1 hour/month of email support. Enterprise: custom quote, perpetual access to Pro content, 10 invites, voice/video support and procurement ([reactflow.dev/pro](https://reactflow.dev/pro)). The page has a Monthly/Yearly toggle, but no yearly price appeared in the fetched text.
- **Inconsistency:** the Pro content page says "Get full access to all pro examples with just one month with a Pro subscription — from €129" and "Subscribe for one, use them forever" ([reactflow.dev/pro/content](https://reactflow.dev/pro/content)). So €129 vs $169 is unresolved.

**Delivery**: downloadable Vite apps and guides on the Pro platform ([reactflow.dev/pro/content](https://reactflow.dev/pro/content)). The platform's code was open-sourced in December 2023, while the examples stayed closed (unverified; search snippet only, via [xyflow GitHub pro-platform](https://www.github.com/xyflow/pro-platform)).

**Funnel**
- The pitch targets organizations, not individuals: "the financial burden ... is placed on organizations who can afford to fund us" ([xyflow.com/open-source](https://xyflow.com/open-source)).
- The 2023 post says sponsors "didn't pay the bills - not even close". SaaS-style tiered plans made it easier for employees to pitch a purchase internally. The attribution label adds a moment of friction that points users to pricing. Subscribers said they pay for the whole library, not the add-ons ([xyflow.com/blog/asking-for-money-for-open-source](https://xyflow.com/blog/asking-for-money-for-open-source), 2023-02-27).

**Website** ([reactflow.dev](https://reactflow.dev/), checked in a browser on 2026-11-19)
- **The hero is a live React Flow canvas.** Nodes for "shape color", "shape type" and "zoom level" feed an "output" node that renders a shape. The homepage has 4 live flows.
- Sections: features, custom nodes, built-in components, a showcase ("Used in thousands of projects": Stripe Docs, DoubleLoop, Typeform), a changelog feed, and sibling libraries (Svelte Flow, Vue Flow).
- Other: separate Examples and Pro Examples pages, a playground (play.reactflow.dev), Discord in the header. No email capture.

**Traction**
- 39,080 GitHub stars (GitHub API, 2026-11-19).
- npm weekly downloads (2026-11-11 to 11-17): `@xyflow/react` 22,446,508 and `reactflow` 3,800,249 ([npm API](https://api.npmjs.org/downloads/point/last-week/@xyflow/react)). The homepage shows "26.50M weekly installs".
- Became "ramen profitable" within a few months of launching paid plans, but no revenue was disclosed ([blog, 2023-02-27](https://xyflow.com/blog/asking-for-money-for-open-source)).

**For Dotquilt:** the clearest example of "MIT core, paid crust". The niche matters, though. Node editors are built by companies that pay for support. A loading-placeholder library will see much less demand for support subscriptions.

---

## 2. Aceternity UI (and Aceternity UI Pro / All-Access)

**Free vs paid and licenses**
- Free: "100+ free components", "Free, forever", copy-paste and MCP access ([ui.aceternity.com/pricing](https://ui.aceternity.com/pricing)). The homepage counts 118+ components, 183+ blocks, 17 templates, 5 landing pages and 19 interactions. It also says "200+ production-ready components", so the counts disagree with each other ([ui.aceternity.com](https://ui.aceternity.com/)).
- License: a single "Aceternity License" applies to each item "bought or downloaded". Official pages don't name MIT; third-party directories claim the free part is MIT (unverified).
  - Allows unlimited end products for yourself or clients, and web apps that may be sold.
  - Forbids reselling "themes, templates, or derivative products ... on any marketplace", and forbids redistributing source files "regardless of modifications".
  - Team size is set at checkout ([ui.aceternity.com/licence](https://ui.aceternity.com/licence)).

**Pricing (2026-11-19, all one-time)** ([pricing](https://ui.aceternity.com/pricing))
- 1-Year License $169 (regular $249): one year of updates; "renew after a year" (renewal price not shown).
- Lifetime $199 (regular $299), marked "Most popular".
- Team $1,590 (regular $1,990): lifetime, up to 10 members.
- Refunds: none. You lose eligibility once you copy any component, download a template or use the MCP tool ([refunds](https://ui.aceternity.com/refunds)).

**Delivery**
- Free items: a public shadcn registry, `npx shadcn@latest add @aceternity/[component]`, plus MCP setup ([docs/cli](https://ui.aceternity.com/docs/cli)).
- Pro items: `npx shadcn@latest add @aceternity-pro [component]`. "If you want to use PRO components with the CLI, generate an `API KEY` in the dashboard and use it with the cli" (changelog, 2025-08-12, [ui.aceternity.com/changelog](https://ui.aceternity.com/changelog)).
- 2026 changelog entries add "Pages" (one CLI command per page, 2026-09-25) and "Interactions" ("install with the shadcn CLI, through MCP, or copy a ready-made prompt for your AI tool", 2026-10-25) ([changelog](https://ui.aceternity.com/changelog)).

**Funnel**
- Flashy free components spread on X and YouTube; Pro sells assembled blocks, templates and full landing pages.
- The founder's channels: Product Hunt, then Twitter/X, plus a Fireship video that spread it "in all directions" ([Starter Story, 2024-10-08](https://www.starterstory.com/stories/aceternity-ui)).
- Pro launched about 4 months after the free library, once the founder had about 20k Twitter followers ([Starter Story](https://www.starterstory.com/stories/aceternity-ui)).

**Website** ([ui.aceternity.com](https://ui.aceternity.com/))
- Hero: "The React component library for beautiful landing pages", with CTAs "Browse Components" and "Get All-Access", and a strip of animated interaction demos.
- Social proof: "Trusted by 120,000+ founders developers and creators" (the brand-facts page says 50,000+, [brand-facts](https://ui.aceternity.com/brand-facts)), a logo wall (Google, Microsoft and others), about 30 embedded X testimonials, and a row of featured YouTubers.
- An "AI agent / MCP" section, a closing upsell block, a FAQ, Discord in the footer. No email capture.

**Traction**
- Starter Story (2024-10-08): Pro "crossed $80k in revenue" about 2 months after launch. Last month: $40k from Pro and $30k from agency services. Typical range $60k–$100k per month for the whole business; 6-person team ([Starter Story](https://www.starterstory.com/stories/aceternity-ui)). These are founder-reported and not independently verified.

**For Dotquilt:** shows that a polished free library with viral visuals can support a one-time bundle of about $199. A Lifetime price only $30 above the 1-year price is an obvious anchor. The no-refund policy, inconsistent counts and fake "regular" prices are things to avoid.

---

## 3. Magic UI (and Magic UI Pro)

**Free vs paid and licenses**
- Free: "150+ free and open-source animated components", MIT ([magicui.design](https://magicui.design/); [GitHub](https://github.com/magicuidesign/magicui) says MIT).
- Pro: "50+ sections and 9+ templates" for landing pages ([pro.magicui.design](https://pro.magicui.design/)).
- Pro license (effective 2024-10-14), from [pro.magicui.design/license](https://pro.magicui.design/license):
  - Non-exclusive and non-transferable; covers landing pages and other products for personal or commercial use.
  - Forbids redistribution or resale "whether in their original form or a modified version".
  - Forbids competing with Magic UI, including "selling similar templates or products derived from the original templates".
  - Sets **$10,000 liquidated damages per instance** of unauthorized redistribution.
  - Sales are non-refundable.

**Pricing (2026-11-19)**: Individual lifetime $199, one-time, "lifetime updates for the original purchase price". No team tier is shown ([pro.magicui.design](https://pro.magicui.design/)). Indexed placeholder pages at `pro.magicui.design/preview/pricing-*` show unrelated prices; these are template demos, not real offers.

**Delivery**: a private shadcn registry. Put `MAGICUI_PRO_REGISTRY_TOKEN` in `.env.local`, register `@magicui-pro` at `https://pro.magicui.design/registry/{name}` with the header `Authorization: Bearer ${MAGICUI_PRO_REGISTRY_TOKEN}`, then run `npx shadcn@latest add @magicui-pro/hero-1` ([pro docs/installation](https://pro.magicui.design/docs/installation)).

**Funnel**
- Every free doc page has a top banner for Pro, "Pro" badges in the sidebar, and a "Limited Time Offer" block advertising lifetime access for $199 ([marquee docs](https://magicui.design/docs/components/marquee)).
- The homepage "Browse Templates" button goes to the Pro site ([magicui.design](https://magicui.design/)).

**Website**
- Component pages: Preview/Code tabs, a CLI/Manual install switch with pnpm/npm/yarn/bun selectors (`pnpm dlx shadcn@latest add @magicui/marquee`), an "Open in v0" button per example, a props table, a "Copy Page" button, and edit-on-GitHub links ([marquee docs](https://magicui.design/docs/components/marquee)).
- The Pro landing page: a template grid with live previews, an X testimonial wall, 5 YouTube testimonial videos, an **ROI calculator** (custom build at about $20,000 and 4 weeks vs Magic UI), and a FAQ ([pro.magicui.design](https://pro.magicui.design/)).
- The homepage shows a showcase of 21 customer sites with labels like "YC W23, raised $4M" ([magicui.design](https://magicui.design/)).

**Traction**: 23,363 GitHub stars (GitHub API, 2026-11-19). No revenue has been published; the founder's widely quoted figures are for a different app (Halo AI) ([search note](https://www.buzzsprout.com/2522779/episodes/18958462-dillion-verma-0-to-300k-mo-in-45-days-with-my-ai-app-just-copy-me)).

**For Dotquilt:** the cleanest delivery pattern for React users is a token-gated shadcn registry. The license's $10k penalty clause is hostile; don't copy it.

---

## 4. shadcn/ui and its paid ecosystem

### 4a. shadcn/ui (free)
- MIT; 128,521 stars ([GitHub](https://github.com/shadcn-ui/ui), API 2026-11-19). The `shadcn` CLI had 18,886,105 weekly npm downloads ([npm API](https://api.npmjs.org/downloads/point/last-week/shadcn)).
- No paid tier. The footer says "Built by shadcn at Vercel" ([ui.shadcn.com](https://ui.shadcn.com/)). A Vercel employer subsidizes the work rather than revenue.
- **The infrastructure the paid ecosystem runs on:**
  - The CLI supports authenticated registries in `components.json` (`"Authorization": "Bearer ${REGISTRY_TOKEN}"`, or custom headers like `X-License-Key`) and lists "premium or licensed components" as a use case ([registry authentication](https://ui.shadcn.com/docs/registry/authentication)).
  - A Registry Directory makes listed registries installable as `npx shadcn add @<registry>/<component>` ([directory](https://ui.shadcn.com/docs/directory)).
- Website: the hero is "The Foundation for your Design System", with live dashboards and cards in light and dark, and Blocks, Charts and Directory in the nav ([ui.shadcn.com](https://ui.shadcn.com/)).

### 4b. shadcnblocks.com (paid blocks)
- Pricing (2026-11-19, one-time, lifetime access and updates, single user): Pro $149, Premium $299, Elite $399. With a Black Friday code (40% off): $89 / $179 / $239. A Team tab exists but its price wasn't captured. You can upgrade between plans by paying the difference ([pricing](https://www.shadcnblocks.com/pricing)).
- License:
  - Standard covers 1 person; Team covers up to 10 employees and contractors. Unlimited end products are allowed.
  - Components must not be "the primary value of the product".
  - No themes, templates or starter kits, paid or free. No product that "directly competes with Shadcnblocks.com".
  - No AI generator trained on the components and no website builder.
  - "Derivative" explicitly includes "automated or AI-assisted transformation, restyling, renaming, or reformatting" ([license](https://www.shadcnblocks.com/license)).
- Delivery: shadcn CLI, Shadcn MCP, a VS Code/Cursor extension, and a page builder. Free blocks "only require a login" ([homepage](https://www.shadcnblocks.com/)).
- Traction (homepage, 2026-11-19): **"22162 free users", "5420 pro customers"**, "~10000 installs per day", established 2023 ([shadcnblocks.com](https://www.shadcnblocks.com/)). A third-party directory claims shadcnblocks acquired Kibo UI and "AI Elements" (unverified and doubtful, since AI Elements is a Vercel project; [everydev.ai](https://www.everydev.ai/developers/shadcnblocks)).

### 4c. shadcn/studio (paid blocks, theme generator)
- Pricing (2026-11-19, one-time, "lifetime access, unlimited projects"): Community free (57 blocks, live theme generator); Basic $99 (single seat); Pro $199 (single seat); Team $449 (15 seats); Enterprise $849 (unlimited seats).
- The page shows crossed-out prices of $219 / $359 / $719 / $1,299, a "30% OFF For Next 500 Users" banner, and an ROI line mentioning "$249", which matches no tier. Payments go through Polar ([pricing](https://shadcnstudio.com/pricing)).
- License (FAQ): commercial use in unlimited projects, including client work, SaaS and internal tools; "Reselling the source files as a competing product is not permitted" ([pricing](https://shadcnstudio.com/pricing)).

### 4d. Data point: Obra shadcn/ui Pro (a Figma kit, founder-published numbers)
- Free Figma Community kit as a lead magnet: about 45,000 duplicates, about 1,500/week. Paid tiers €199–€1,399 (at 50% off).
- First 40 days: **about 100 orders and about €10,000 revenue**, against costs of about €8.5k. 14-day no-questions refund policy; only 2–3 refunds. Stepped launch discounts (75% → 50% → 25% → full) "lock" the final price.
- Honor-system tiering: buyers pick the tier matching their Figma plan ([Obra blog, 2026-04-24](https://obra-studio-sveltekit.pages.dev/blog/2026/04/24/one-month-in-the-business-behind-obra-shadcn-ui-pro)).

**For Dotquilt:** shadcn made "copy-paste source + registry CLI + MCP" the default way developers expect to get UI. Paid block sites sell volume (thousands of blocks) at $99–$399 one-time. The Obra numbers are a realistic sobering baseline for a niche paid add-on: a big free funnel converts to small absolute revenue.

---

## 5. Tailwind Plus (formerly Tailwind UI) and Headless UI

**Status change:** On 2026-09-09 Tailwind Labs announced it is joining Shopify. In the post's words: "we're closing sign ups for new customers to focus on Tailwind CSS at Shopify"; "All existing customers will of course maintain their access to products like Tailwind Plus and ui.sh"; "Nothing changes with Tailwind CSS or any of our other open-source projects. Everything will always be MIT-licensed" ([tailwindcss.com/blog/tailwind-is-joining-shopify](https://tailwindcss.com/blog/tailwind-is-joining-shopify)). On 2026-11-19 `tailwindcss.com/plus`, `/plus/license` and `/plus/ui-blocks` all redirect (302) to `/plus/login` (observed with curl and a browser).

**Free vs paid and licenses**
- Free: Tailwind CSS (MIT, 98,645 stars) and Headless UI (MIT, 28,836 stars) (GitHub API, 2026-11-19; [headlessui](https://github.com/tailwindlabs/headlessui)).
- Paid (last public version, archived 2026-08-02): "500+ components", 13 site templates (Oatmeal, Radiant, Salient, Compass and others) and the Catalyst UI kit, in React, Vue and vanilla HTML. Interactivity comes from Headless UI or the "Elements" JS library ([archived /plus](https://web.archive.org/web/20260802182200/https://tailwindcss.com/plus)).
- License (archived 2026-08-06, [archived /plus/license](https://web.archive.org/web/20260806175804/https://tailwindcss.com/plus/license)). Personal covers one individual; Team covers up to 25 employees and contractors. Both allow:
  - unlimited end products, and unlimited clients;
  - products sold to end users, including paid SaaS;
  - open-source end products.
  - Both forbid:
    - end products that let users build their own sites (website builders);
    - redistribution "separately from an End Product, neither in code or as design assets";
    - sharing access;
    - anything "competitive or in conflict with the business of Tailwind Labs".
  - It lists concrete examples. Not allowed: a public repo of favourite components; a UI library, free or paid; converting a template to another framework; a Figma kit based on the designs; an admin panel tool like Laravel Nova; themes or starter kits.
  - Summary line: "use Tailwind Plus for anything you like as long as it doesn't compete with Tailwind Plus."

**Pricing (archived 2026-08-02; no longer sold to new customers)**: Personal $299 one-time "plus local taxes"; Teams $979 one-time, up to 25 people. Multiple team licenses are recommended for more than 25 seats. A discounted restricted license is available for students and for individuals earning under $30k/year. 30-day no-questions refund. No technical support ([archived /plus](https://web.archive.org/web/20260802182200/https://tailwindcss.com/plus)). The 2025 rebrand post says "No subscription pricing — it's still a one-time purchase with lifetime access" ([blog, 2025-03-04](https://tailwindcss.com/blog/tailwind-plus)).

**Delivery**: a members site where you browse and copy code in React, Vue or HTML, and download templates. Upgrade to Team from the Account menu ([archived /plus](https://web.archive.org/web/20260802182200/https://tailwindcss.com/plus)).

**Funnel**: the free framework's docs were the discovery channel. In January 2026 Adam Wathan said revenue was "down by almost 80 percent" while usage grew, and docs traffic "dropped by 40 percent in two years" because AI tools answer questions without a site visit. 3 of 4 engineers were laid off ([DevClass, 2026-01-08](https://www.devclass.com/ai-ml/2026/01/08/tailwind-labs-lays-off-75-percent-of-its-engineers-thanks-to-brutal-impact-of-ai/4079571)).

**Website (archived)**: a hero with "Explore templates / Browse UI blocks"; category grids with component counts; testimonials from named founders; pricing ("Get everything, forever"); a long, concrete licensing FAQ ([archived /plus](https://web.archive.org/web/20260802182200/https://tailwindcss.com/plus)).

**Traction**: the launch on 2020-02-26 made "$400,000 on the first day". In December 2020 the company was "reliably doing mid-seven figures per year", with Tailwind UI the "lion's share" ([Adam Wathan, 2020 year in review](https://www.adamwathan.me/journal/2020/12/29/2020-year-in-review)).

**For Dotquilt:** (1) Tailwind's license is the best template for a Pro license: clear, with allowed and disallowed examples. (2) It is also the strongest warning. One-time sales depend on a constant stream of new visitors, and AI assistants cut the docs-to-pricing path. Plan for agents to be the consumers: MCP, llms.txt, registry access.

---

## 6. Chakra UI (Chakra UI Pro)

**Free vs paid and licenses**
- Chakra UI is MIT; 40,735 stars (GitHub API). The homepage shows "8M downloads per month", 40.7K stars and 7.3K Discord members, and asks for donations via Open Collective/Patreon ([chakra-ui.com](https://chakra-ui.com/)).
- Pro license (effective 2024-11-11, [pro.chakra-ui.com/legal/license](https://pro.chakra-ui.com/legal/license)):
  - Standard covers one person; Team covers employees and contractors. Unlimited end products, including SaaS and client work where ownership transfers.
  - Open-source end products are OK, but a public repo of the blocks is not.
  - Forbids themes, templates and starter kits; "Replicating Chakra UI Pro and offering it for sale or free"; and Figma/Sketch kits for distribution.
  - "We do not offer refunds."

**Pricing (2026-11-19, one-time)**: Personal $299 (was $349), "Lifetime access with a single payment"; Team $899 (was $999), all employees and contractors. 330+ blocks. No Figma file ([pro.chakra-ui.com/pricing](https://pro.chakra-ui.com/pricing)).

**Delivery**: a license key arrives by email and is activated at `/activate` ([pricing](https://pro.chakra-ui.com/pricing)). The official CLI says "To use Pro blocks, you need a Chakra UI Pro subscription and API key", then `chakra blocks add` with `CHAKRA_UI_PRO_API_KEY` ([chakra-ui.com/docs/get-started/cli](https://chakra-ui.com/docs/get-started/cli)). The docs say "subscription" while the pricing says one-time: an inconsistency.

**Funnel and website**: a Pro banner on the open-source homepage ("Explore Templates") ([chakra-ui.com](https://chakra-ui.com/)). The Pro landing page has a **theme panel** (accent colour, font family, radius) next to the sample blocks, which appears to restyle them live (unverified), plus a changelog ([pro.chakra-ui.com](https://pro.chakra-ui.com/)).

**For Dotquilt:** the CLI-with-API-key pattern works without shadcn. The live theme panel on the sales page is worth copying: let visitors restyle Pro screens before buying.

---

## 7. Flowbite (Flowbite Pro)

**Free vs paid and licenses**
- Free: "open-source library of over 600+ UI components, sections, and pages". Flowbite Icons and Illustrations are "Free and open-source under the MIT License" ([flowbite.com](https://flowbite.com/), read in a browser). GitHub reports MIT ([themesberg/flowbite](https://github.com/themesberg/flowbite)).
- Pro FAQ ([flowbite.com/pro](https://flowbite.com/pro/), read in a browser): unlimited projects (personal, SaaS, clients) "As long as you don't build a product that will directly compete with Flowbite either as a UI kit, theme, or template". No themes, templates, UI kits or page builders. Open source is OK if it isn't an alternative UI library.

**Pricing (2026-11-19, one-time)**
- Developer edition $299, Designer (Figma) edition $169. Team licenses: Developer $999, Designer $499, "as many as 10 team members".
- 30-day full refund.
- Student and nonprofit discounts. "we never offer discounts not even for Black Friday because want to protect the purchase value for all of our customers."
- Support duration "1 year (renewable)"; updates "from roadmap" ([flowbite.com/pro](https://flowbite.com/pro/)).

**Delivery**: "you will get two emails: one for the invoice, and another one with the download files". Team licenses share one account. Checkout via Paddle. Pro also lists an MCP server (Cursor, Windsurf, Claude Code) and a custom GPT ([flowbite.com/pro](https://flowbite.com/pro/)).

**Funnel**: a huge ecosystem of free framework ports (React, Vue, Svelte, Angular and about 20 integration guides) feeds the "Upgrade to Flowbite Pro" section. The Figma kit is a separate entry product ([flowbite.com](https://flowbite.com/)). A public roadmap with checkmarks sells "future value". Framework versions were sold as **pre-orders at 25% off**.

**Website**: stats band ("9,388 Stars on Github", "40,383,700 Downloads on NPM", "29,000+ Figma duplicates", "100 Discord members online"), a long component index (68 components), a testimonials grid, a Figma preview, and a feature-comparison matrix across Community, Developer and Designer ([flowbite.com](https://flowbite.com/)).

**Traction**: 9,388 stars; `flowbite` 808,965 weekly npm downloads (npm API, 2026-11-11 to 11-17).

**For Dotquilt:** a "never discount" stance and a 30-day refund build trust. A separate design-only (Figma) SKU is cheap to offer if you already have the designs.

---

## 8. Preline (Preline Pro)

**Free vs paid and licenses**
- Free: "free 640+ components", 189 blocks, 5 templates, a Figma design system; "Unlimited Projects, Unlimited Developers" ([preline.co/pricing](https://preline.co/pricing/)).
- The free license is dual: "MIT" plus the "Preline UI Fair Use License". The latter forbids products that "directly compete with Preline UI", but **allows selling templates, themes and page builders** with attribution and a clear distinction from the original ([LICENSE](https://github.com/htmlstreamofficial/preline/blob/main/LICENSE)). GitHub shows the license as NOASSERTION.
- Pro FAQ: client and e-commerce projects OK. No themes, templates, UI kits or "generators". **"Preline Pro is not licensed for open source projects."** ([pricing FAQ](https://preline.co/pricing/))

**Pricing (2026-11-19, one-time, lifetime, free updates)** ([preline.co/pricing](https://preline.co/pricing/))
- Pro $249: single developer, 780+ blocks, 21 templates (207 pages), 51 AI demos, 100 animated icons, AI prompts.
- Team $459: up to 15 developers.
- Enterprise: custom; single project, redistribution allowed.
- **Preline MCP** is "Included free through January 1, 2027"; after that "an active Preline MCP subscription is required" because it is "a hosted AI service that requires ongoing infrastructure".
- No refunds, except edge cases, and only if you haven't created an account.

**Delivery**: "an email with a magic link to create an account". The account lets you view and copy blocks and their AI prompts, and download template demos and animated SVGs ([pricing FAQ](https://preline.co/pricing/)).

**Funnel**: a generous free tier ("we offer a generous selection of free ... Use these resources to test the workflow") instead of refunds ([pricing FAQ](https://preline.co/pricing/)).

**Traction**: 6,534 stars; `preline` 83,566 weekly npm downloads (APIs, 2026-11-19).

**For Dotquilt:** a hybrid is emerging. Code is sold one-time, and hosted AI services are sold as a subscription. "Enterprise = redistribution rights" is a useful extra tier.

---

## 9. daisyUI (how it earns money)

**Free vs paid and licenses**: daisyUI is MIT, 42,897 stars (GitHub API); `daisyui` had 1,469,648 weekly npm downloads (npm API).

**Revenue lines (2026-11-19)**
- **Official store**, priced per item: Blink template from $39, Scalo from $69, daisyUI Charts from $39, Nexus Dashboard from $69, HTML Dashboard $29, Auth $19, Figma Library from $49, Blog from $29, Online Store from $49, Documentation $29. There is a filter by framework (HTML, React, Vue, Svelte, Astro and others) and a newsletter signup for a discount code ([daisyui.com/store](https://daisyui.com/store/)).
- **Blueprint MCP** (a subscription for AI agents): $22/month (2 clients), $45/quarter (5 clients), $600 lifetime (20 clients). The license key is emailed and added to the MCP server; no refunds ([daisyui.com/blueprint](https://daisyui.com/blueprint/)).
- **Sponsors**: GitHub Sponsors links on the homepage ([daisyui.com](https://daisyui.com/)). Open Collective is small: $12,450 total raised, "estimated annual budget" $968 ([opencollective.com/daisyui](https://opencollective.com/daisyui)).
- Swag (T-shirts) is linked from the homepage ([daisyui.com](https://daisyui.com/)).

**Website**: an install snippet in the hero; about 30 themes switchable from the nav; a theme generator; "88% fewer class names" before/after code comparison; a logo row and about 40 X testimonials; a newsletter field ([daisyui.com](https://daisyui.com/)).

**For Dotquilt:** à-la-carte $19–$69 products are a low-commitment way to start and to test what sells. Donations are negligible. The paid AI layer is priced as a subscription.

---

## 10. React Bits (and React Bits Pro)

**Free vs paid and licenses**
- The free library's LICENSE is **"MIT + Commons Clause"**. You may use it commercially "so long as you do not sell, sublicense, or redistribute the components themselves". The same applies to the free creative tools and their exports: no selling "a sound, texture, background, or template pack" ([LICENSE.md](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md)).
- **Inconsistency:** the Pro comparison page calls the free part "MIT (free for anything)" ([compare page](https://pro.reactbits.dev/compare/react-bits-pro-vs-free-react-bits)).
- Pro is "a new, separate collection, not a paywall on existing components" (the founder, [Motion interview, 2026-01-08](https://motion.dev/magazine/interview-david-haz-creator-of-react-bits)).
- Pro license ([pro.reactbits.dev/license](https://pro.reactbits.dev/license)):
  - One developer per purchase. Unlimited personal, commercial and client projects; clients need no license.
  - SaaS is OK if it doesn't expose the product "in source or reusable form".
  - No template packs, UI kits or component libraries. No public repos, gists or starter kits. No sharing of keys or registry credentials.
  - **No use as AI training data, or exposure to unlicensed agents**, while use with your own AI coding tools is allowed.
  - Sales generally final; "Annual subscriptions" get no pro-rated refunds.

**Pricing (2026-11-19)** ([pro.reactbits.dev](https://pro.reactbits.dev/))
- One-time: Starter $129 (255 components); Pro $249 (adds 400 blocks, 300 app UI blocks, Agent Kit, live theming, Landing Builder beta); Ultimate $349 (adds 18 landing templates and priority email support), marked "Most popular".
- There is a Lifetime/Annual toggle, but no annual price was shown.
- Team: email for 3+ seats (unverified; from a search snippet of [pro.reactbits.dev](https://pro.reactbits.dev/), and the FAQ answer was not in the fetched HTML). Checkout via Polar.

**Delivery**: "shadcn registry CLI (license-gated)", `npx react-bits-pro init`, a hosted MCP server and a SKILL.md ([compare page](https://pro.reactbits.dev/compare/react-bits-pro-vs-free-react-bits); [pro.reactbits.dev](https://pro.reactbits.dev/)).

**Funnel (very relevant to Dotquilt)**
- Every free component page has a **live "Customize" panel** with preset, colour, effect, trigger, ease, stagger, duration, loop and mask controls. It also offers JS/TS × CSS/Tailwind variants, a props table and a dependencies list. Directly beneath sits an in-context upsell: "More text animations in Pro … View all 32", with named Pro previews ([split-text page](https://reactbits.dev/text-animations/split-text), read in a browser).
- **Free creative tools** act as traffic magnets: Background Studio ("export the code, a 4K image or a looping video"), Center Stage, Shape Magic, Texture Lab and Sound Lab ([reactbits.dev/tools](https://reactbits.dev/tools)).
- The Pro site has many SEO landing pages ("best for agencies / indie hackers / AI coding agents", "vs Magic UI", "vs Aceternity") ([search results listing pro.reactbits.dev pages](https://pro.reactbits.dev/compare/react-bits-pro-vs-aceternity-ui)).

**Website**: the hero line is "React components for creative developers". The page background is itself a tunable component ("starting with this page's background") ([reactbits.dev](https://reactbits.dev/)).

**Traction**
- 52,277 GitHub stars (GitHub API, 2026-11-19), up from "30k" in the 2026-01-08 interview ([Motion](https://motion.dev/magazine/interview-david-haz-creator-of-react-bits)).
- Pro launched on Product Hunt on 2026-02-11 (unverified, search snippet: [producthunt.com/products/react-bits-pro](https://www.producthunt.com/products/react-bits-pro)).
- A TrustMRR listing shows revenue figures, but the snippet was garbled (unverified).

**For Dotquilt:** the closest analogue to Dotquilt's plan, and the best playground pattern to copy: a per-component customize panel plus an inline Pro teaser. It also shows that "export tools" work best as a **free** acquisition channel, not as the paid product.

---

## 11. Untitled UI React (extra)

**Free vs paid and licenses**: base components are "licensed under the MIT license". The free tier is "Free to use in commercial projects for one user", with no lifetime updates ([untitledui.com/react](https://www.untitledui.com/react)). GitHub reports MIT ([untitleduico/react](https://github.com/untitleduico/react)).

**Pricing (2026-11-19, one-time, "Pay once, use forever in unlimited projects")** ([untitledui.com/pricing](https://www.untitledui.com/pricing))
- React: PRO Solo $349 (was $499, 1 user); Studio $999 (was $1,299, up to 8); Business $2,499 (was $2,999, up to 20); Enterprise $8,999 (was $9,999, unlimited, SSO/SCIM, private GitHub repo with Storybook).
- Figma PRO: $129 / $399 / $999 / $2,499. Icons PRO from $59.
- Students 50% off; affiliates earn 30% ([react page](https://www.untitledui.com/react)).

**Delivery**: `npx untitledui@latest login` opens a browser magic-link login. "Login only succeeds for accounts that hold a React license". The key is stored in `~/.untitledui/config.json`; CI uses `--license <key>`. Then `npx untitledui@latest add charts-base` or `example dashboards-01` ([CLI docs](https://www.untitledui.com/react/docs/cli)).

**Website**: "Join 380,000+ designers", 16 logos, 14 Gumroad 5-star testimonials, a 60-second video, a light/dark comparison slider, and a CLI walkthrough ([react page](https://www.untitledui.com/react)).

**For Dotquilt:** seat bands (1 / 8 / 20 / unlimited) are a simple, fair way to price teams. The CLI login is good DX, but it means building your own auth backend.

---

## 12. Cult UI / Cult Pro (extra; a cautionary data point)
- Free: "154 animated components, all free", "Free and MIT licensed". The page says "AI SDK Agents is what pays for it", a separate one-time product of 150+ full-stack AI blocks ([cult-ui.com](https://www.cult-ui.com/)).
- **Cult Pro (2023–2026) is shutting its paid model**: "Cult Pro is going open source | Existing buyers keep access", "416+ buyers. Keep permanent access", "Thanks for three years". The FAQ mentions Lifetime and Annual plans; prices are no longer shown ([pro.cult-ui.com](https://pro.cult-ui.com/), fetched 2026-11-19).
- 7,551 stars (GitHub API).

**For Dotquilt:** a well-liked animated kit sold only about 416 Pro licences in about 3 years. The studio moved its monetization to a higher-value vertical (AI agent blocks).

## 13. Origin UI → coss ui, and Animata (extra; free-only comparators)
- `originui.com` returns a 301 to `coss.com/ui`, and the GitHub repo `origin-space/originui` resolves to `cosscom/ui` (MIT, 10,871 stars). Nothing on the coss ui page is priced; the components are ones "we use to build Cal.com" ([coss.com/ui](https://coss.com/ui)). This is corporate-subsidized, not monetized.
- Animata: "MIT Licensed — free forever", 157+ components, no paid tier, 3,004 stars ([animata.design](https://animata.design/); GitHub API).

## 14. Adjacent models worth knowing

### MUI X
- Per-developer annual licences: Pro $299/yr/dev, Premium $599/yr/dev, Enterprise $1,399/yr/dev (from 15 seats). A perpetual option is available.
- Licensing counts "concurrent developers". An "unlicensed" watermark is removed by the license key. Annual licences are perpetual in production ([mui.com/pricing](https://mui.com/pricing/)).
- This model fits high-value runtime components (data grids). A watermark is unsuitable for loading UI.

### Nuxt UI Pro
- Nuxt UI v4 unified "Nuxt UI and Nuxt UI Pro into a single, powerful, and completely free open-source library", citing "NuxtLabs joining Vercel" ([nuxt.com/blog/nuxt-ui-v4](https://nuxt.com/blog/nuxt-ui-v4)). The release date was not on the page; secondary sources say September 2025 (unverified).
- It is the third paid kit in this sample to stop selling to new buyers after an acquisition or a strategy change (with Tailwind Plus and Cult Pro).

---

## Synthesis

### What the market looks like (Nov 2026)
1. **The core is free and almost always MIT.** Every successful kit here keeps the library MIT. Only React Bits (MIT + Commons Clause) and Preline (MIT + Fair Use) add restrictions, and React Bits' own pages contradict its LICENSE file.
2. **What is paid is assembled value, not the primitives.** The paid layer is blocks, sections, full pages and templates, Figma kits, and AI delivery (MCP, agent kits, prompts). The only exceptions are React Flow (support and examples) and MUI X (advanced runtime components).
3. **One-time "lifetime" pricing dominates.**
   - Individual: $129–$349 (React Bits $129–$349, Aceternity $199, Magic UI $199, Chakra $299, Flowbite $299, Tailwind $299, Preline $249, Untitled $349, shadcnblocks $149–$399 list).
   - Team: $449–$1,590, with 10–25 seats (shadcn/studio $449/15, Preline $459/15, Chakra $899, Tailwind $979/25, Flowbite $999/10, Aceternity $1,590/10).
   - Subscriptions appear only for organizations (React Flow, MUI X) or for **hosted AI services** (Preline MCP after 2027-01-01, daisyUI Blueprint at $22/mo).
4. **Delivery has converged on registries plus agents.** For React it is a token-gated shadcn registry (Magic UI, Aceternity, shadcnblocks, React Bits) or a vendor CLI with a key (Chakra, Untitled UI), plus an MCP server. Older or HTML kits use an account area with copy and download (Tailwind, Preline, Flowbite).
5. **AI is eroding "sell static templates via docs traffic".**
   - Tailwind Plus revenue fell about 80% (Jan 2026) and sign-ups closed (Sept 2026).
   - Cult Pro is going open source after about 416 buyers.
   - Nuxt UI Pro became free.
   - The kits still growing (shadcnblocks 5,420 customers, React Bits Pro) ship MCP, agent kits and CLI installs, and they sell **volume** (hundreds to thousands of blocks).
6. **Donations don't fund anything.** xyflow: sponsors "didn't pay the bills - not even close". daisyUI's Open Collective budget is $968 a year.

### Which models fit a small loading-placeholder library best
- **Best fit: free MIT core plus a one-time Pro bundle of assembled screens** (Aceternity / Magic UI / React Bits pattern). Dotquilt's planned Pro ("complete app screens with every loading state") is exactly the "blocks/templates" layer that sells. It should be framed as *screens that load beautifully* (dashboard, table, chart, chat, feed, settings), each with skeleton → loading → ready → error/empty states, not as more loaders.
  - React Bits shows that extra motion and effects can be a Pro-only *new collection*, without paywalling existing components.
  - Observed price band for a focused kit: individual one-time about $129–$199, team about $449–$999 with a seat cap. Price setting is still an open owner decision.
- **Possible later: a small hosted subscription** only for something that genuinely has running costs, like a hosted MCP or agent endpoint (Preline, daisyUI). Not for the code itself.
- **Poor fit:**
  - React Flow-style support subscriptions: the loader niche lacks the B2B support demand of node editors.
  - MUI X-style watermark licences: a watermark on a loading UI is unacceptable.
  - Donations.
  - Selling the playground export tools as the main paid item. React Bits gives comparable creative tools away free as acquisition.

### Patterns worth copying

**Website and playground**
- **Hero = the product working live.** React Flow's hero is a live flow; React Bits' page background is a tunable component. For Dotquilt, the hero should be a loading region that visibly hands over to real content, with a "replay" control.
- **Per-component customize panel.** Copy React Bits' presets plus live controls (timing, easing, density, trigger) with a "copy code" output that reflects the settings. Add Preview/Code tabs, a package-manager install switch, a props table, a dependencies list, "Copy page" for LLMs and "Open in v0/StackBlitz".
- **Inline Pro teaser at the point of desire.** React Bits places "More … in Pro, View all 32" directly under each free component; Magic UI uses "Pro" badges in the sidebar and a doc-page banner. For Dotquilt: under the TableLoader docs, show "See it in a full Pro screen".
- **A live theme panel on the Pro page** (Chakra Pro) so buyers restyle Pro screens before paying. A template gallery with live previews (Magic UI Pro).
- **Free tools as SEO and acquisition** (React Bits Tools). A free Dotquilt "skeleton from screenshot/URL" or "loading-state recorder that exports MP4/GIF" fits this role better than as a paid feature.
- **Social proof that is real and countable**: stars, customer counts (shadcnblocks shows free users and pro customers), named testimonials, and a showcase of sites using it (Magic UI).

**Pro**
- **Licence text:** model it on Tailwind Plus. Per developer; a team band; unlimited projects; client and SaaS work allowed. No redistribution, no competing kits, templates or builders, no public repos. Give concrete allowed and disallowed examples. Add shadcnblocks' "AI-assisted transformation is still a derivative" clause.
- **Delivery:**
  - For React: a token-gated shadcn-compatible registry, so `npx shadcn add @dotquilt-pro/dashboard` works.
  - For Web Components, Astro and vanilla: a zip download from a magic-link account (Preline).
  - An MCP or llms entry point so agents can find and install Pro screens.
- **Trust:** a 14–30 day refund (Tailwind, Flowbite, Obra) and a "we don't run fake sales" stance (Flowbite). Publish a changelog and a roadmap; Flowbite's checkmarked roadmap and pre-orders sell future value.
- **Cheap entry SKUs** to test demand: daisyUI sells single templates at $19–$69, Flowbite sells a design-only edition.

### Pitfalls
- **AI-era discovery risk:** if docs are the only funnel, AI answers bypass them (Tailwind). Make Dotquilt usable *by agents* (llms.txt, MCP, registry) and attribute the Pro upsell in the places agents and humans both see, such as the CLI output and the README.
- **Small niche means small absolute revenue.** The Obra kit made about €10k in 40 days with about 45k free installs. Cult Pro had about 416 buyers in about 3 years. Expect modest numbers unless Pro is broad (full screens) rather than narrow (more loaders).
- **Inconsistency kills trust:**
  - Aceternity's counts disagree (100+/118+/200+).
  - React Flow shows $169 on one page and €129 on another.
  - Chakra's docs say "subscription" while its pricing says one-time.
  - React Bits' LICENSE says Commons Clause while its compare page says MIT.
  - Magic UI's indexed placeholder pricing pages show unrelated prices.

  Keep one source of truth for counts, prices and licence.
- **Perpetual "sale" banners** (shadcnblocks Black Friday, shadcn/studio "next 500 users", strikethrough "regular" prices everywhere) read as manipulative to a serious audience. This conflicts with Dotquilt's "restrained" design direction.
- **Hostile licence terms** (Magic UI's $10k liquidated damages) and no-refund policies (Aceternity, Magic UI, Preline, Chakra) raise purchase friction for an unknown brand.
- **Commons Clause on the free core** confuses people and may deter adoption; the current MIT core is the right call.
- **Visible attribution or watermarks** (React Flow, MUI X) are not appropriate for loading UI, which sits inside the customer's product.
- **Acquisition or strategy dependency:** Tailwind Plus, Nuxt UI Pro and Cult Pro all stopped selling to new buyers. Buyers know this and value "existing buyers keep access" guarantees. State one up front.
