# 03 — Open-core and commercially licensed component libraries

Research slice for Dotquilt's licensing and revenue decision. All web pages were read on **2026-11-19** unless a different date is given. Every price below was read on that date. "(unverified)" marks claims that come from a secondary source, a search snippet, or an inference I could not confirm on the vendor's own page. Text from vendor pages is paraphrased, not quoted.

npm figures are weekly downloads for 2026-11-11 to 2026-11-17, from `https://api.npmjs.org/downloads/point/last-week/<pkg>`. CI installs inflate them. For paid packages they also count people running the package unlicensed, with a watermark or in a trial, so they are a reach signal, not a count of customers.

---

## 1. AG Grid (Community MIT, Enterprise commercial)

**Free and paid parts**
- AG Grid Community and AG Charts Community are MIT and allowed in production. Enterprise, AG Charts Enterprise and the Enterprise Bundle are commercial. Source: https://www.ag-grid.com/license-pricing/
- Community covers the core grid: rows and columns, sorting, filtering, pagination, cell rendering, themes and styling, **accessibility**, performance and virtualisation, and the React, Angular, Vue and vanilla JS wrappers. Source: https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/
- Enterprise adds the server-side row model, Excel export, pivoting and aggregation, range selection, integrated charts, master/detail, row grouping, clipboard, tool panels, and context menus and side bars. Same source.
- AG Studio is a newer product sold by subscription with tailored pricing (launch week 28 Sep to 2 Oct 2026). Source: https://www.ag-grid.com/license-pricing/

**Commercial terms**
- Licences are perpetual with 1 year of updates and support. Source: https://www.ag-grid.com/license-pricing/
- Every front-end developer on the project needs a licence, including those who never touch the grid. Same source. The EULA counts each developer who writes or changes JavaScript for the application's UI (cl. 3.4). Source: https://www.ag-grid.com/eula/AG-Grid-Enterprise-License-Latest.html
- Online purchase covers only 1 to 10 developer licences for **internal** applications. Customer-facing apps, more than 10 developers and AG Studio go through sales. Source: https://www.ag-grid.com/license-pricing/
- EULA highlights (https://www.ag-grid.com/eula/AG-Grid-Enterprise-License-Latest.html):
  - Scope (apps, seats, perpetual or subscription) is set per quote (cl. 3.2).
  - Customer-facing distribution needs a "Deployable" licence (cl. 3.3, 3.5). Production includes cloud instances and containers (cl. 1.1).
  - The software may not be embedded in a developer toolkit, wrapper or app builder (cl. 3.7(b)).
  - Quotes auto-renew for 12-month periods with 30 days' notice to cancel (cl. 12.2–12.3). Renewal price rises are capped at 5% plus CPI (cl. 4.11).
  - Perpetual licensees keep using versions licensed before termination (cl. 12.7).
  - Audit rights run during the term and for 12 months after it (cl. 11.1).

**Prices** (accessed 2026-11-19, from the public configurator at https://www.ag-grid.com/ecommerce/#/ecommerce/ , internal apps, 1 developer)

| Product | Single application | Multiple applications |
|---|---|---|
| AG Grid Enterprise | $999 / developer | $1,499 / developer |
| Enterprise Bundle (Grid + Charts) | $1,498 / developer | $2,998 / developer |

- AG Charts Enterprise alone: not checked.
- Customer-facing apps: not public (sales).

**Enforcement and delivery**
- `ag-grid-enterprise` is on public npm. You can test it locally without a key. With no key it shows a **watermark and a console error**. A 30-day trial key removes both. Sources: https://www.ag-grid.com/javascript-data-grid/licensing/ and https://www.ag-grid.com/react-grid/licensing/
- The key is set with `LicenseManager.setLicenseKey(...)`. Source: https://www.ag-grid.com/javascript-data-grid/license-install/
- The checkout asks for an application name and says it will be printed in the key, so keys are app-scoped. Source: the ecommerce page above.
- (unverified) Older docs say that with an invalid or expired key the watermark shows for 5 seconds. Community threads show keys that embed a cut-off for versions "released before" a date. Sources: search snippets of https://www.ag-grid.com/react-grid/licensing/ and https://community.plotly.com/t/ag-grid-enterprise-license-not-working/89145

**What drives upgrades**
- The paywall holds "power user and enterprise data" features: server-side data, pivot and aggregate, Excel, clipboard and range. Basics, accessibility, theming, performance and framework wrappers stay free. The free grid is fully usable on its own, and the upgrade is triggered by a business requirement such as Excel export or pivoting.

**Site, docs and pricing page**
- The docs navigation flags each Enterprise feature page. The nav data on https://www.ag-grid.com/react-grid/licensing/ carries an `isEnterprise` flag per item.
- The pricing page has a sales-led "tailored" block, a self-serve "buy online for internal apps" block, product cards, Community vs Enterprise check tables and a 9-question FAQ. There is no inline calculator; prices appear only in a separate 5-step Angular store. Source: https://www.ag-grid.com/license-pricing/
- Observation: prices are deliberately hidden one click deep, and customer-facing use is always quoted.

**Traction**
- £16M annual revenue and more than 1.2M downloads a month, reported 11 Feb 2022. Source: https://techbullion.com/british-tech-start-up-ag-grid-announces-new-growth-phase-as-annual-revenue-hits-16m/
- (unverified, secondary) £17.9M revenue in 2023, citing Companies House. Source: https://www.cbinsights.com/company/ag-grid
- Self-funded and bootstrapped, with a team of about 60 in London. Source: https://www.ag-grid.com/about/
- 21 Nov 2025: partnership with Bryntum backed by long-term investment from Adelis Equity Partners. Source: https://www.ag-grid.com/blog/ag-grid-and-bryntum-join-forces-to-strengthen-developer-tooling-for-modern-web-applications/
- npm per week: `ag-grid-community` 5,568,171; `ag-grid-enterprise` 2,297,257 (41% of community).

---

## 2. MUI (MUI Core MIT; MUI X open-core: Community MIT, Pro / Premium / Enterprise commercial)

**Free and paid parts**
- MUI Core (Material UI, Base UI, Joy UI, MUI System) is MIT.
- MUI X ships Community packages under MIT: `@mui/x-data-grid`, `x-date-pickers`, `x-charts`, `x-tree-view`, `x-scheduler`.
- Pro packages (`-pro`) add multi-filter, multi-sort, column resizing and pinning, the date and time range pickers, advanced charts, and tree-view drag-and-drop.
- Premium adds row grouping, Excel export and aggregation.
- Source for all of the above: https://mui.com/x/introduction/licensing/
- Stated rationale from older docs: the free tier holds what the open-source community can sustain; Pro is at the limit of what open source can sustain and priced for most professionals; Premium holds the most advanced data-analysis features. Source: older MUI X docs FAQ, seen via search (exact page unverified; e.g. https://v4.mui.com/components/data-grid/) (unverified)
- (unverified) A maintainer comment says it is easy to move a feature from Premium to Pro later but hard to move one the other way. Source: https://github.com/mui/mui-x/pull/779

**Commercial terms** (https://mui.com/pricing/)
- **Perpetual:** keep using licensed versions forever in production *and* development, with 12 months of updates and support. Renewal discounts are 50% before expiry, 35% within 60 days after expiry, and 15% after that.
- **Annual:** production use is perpetual for versions released during the term, but development requires an active licence.
- Seats equal the maximum number of concurrent front-end developers. They are unnamed and transferable. Volume discount from 25 developers. Education and non-profit get 50% off. MUI may raise prices up to 7% a year at renewal.
- **Since 8 Apr 2026, Pro and Premium are licensed per application** (single-app or multi-app). Enterprise is always multi-app, minimum 15 seats. Priority support is Enterprise only. Security questionnaires are available for orders of $12,000 or more. Announced 1 Mar 2026. Rationale given: Pro's per-developer price had barely changed since 2020. Source: https://mui.com/blog/2026-mui-x-price-changes/

**Prices** (accessed 2026-11-19, read from the toggles on https://mui.com/pricing/)

| Plan | Annual, single app | Annual, multi-app | Perpetual, single app | Perpetual, multi-app |
|---|---|---|---|---|
| Pro | $299 / dev / yr | $499 / dev / yr | $657 / dev | $1,097 / dev |
| Premium | $599 / dev / yr | $999 / dev / yr | $1,318 / dev | $2,198 / dev |
| Enterprise (multi-app, ≥15 seats) | $1,399 / dev / yr | (included) | $2,798 / dev | (included) |

**Enforcement and delivery**
- Paid packages are on public npm. The key is set with `LicenseInfo.setLicenseKey()` from `@mui/x-license`.
- Without a valid key, components show an "unlicensed" watermark and log a console warning in dev and prod, but keep working for end users.
- The key is **checked offline with no network request and is designed to be public** (it can live in `NEXT_PUBLIC_*` env vars).
- Annual keys keep working in production for versions released before the term ended.
- Source for all of the above: https://mui.com/x/introduction/licensing/

**What drives upgrades**
- Gating is per feature, inside the same component (the free grid vs the Pro grid). The trigger is a "second-level" need such as resizing, pinning, range pickers, grouping or Excel.
- The 2026 move to per-app pricing adds a second axis that charges agencies and multi-product companies more.

**Site, docs and pricing page**
- The pricing page has a Perpetual/Annual toggle, a "Multi App License" checkbox per card, four plan cards, a long comparison table grouped by product, a "key information" explainer, a FAQ and social proof. Source: https://mui.com/pricing/
- Observation: this is the most polished self-serve pricing page in this set, but there are now 2 × 2 × 4 = 16 price points. That is the complexity cost of adding the per-app axis.

**Traction**
- 5.8M weekly npm downloads and 93.9k GitHub stars, from the pricing page.
- npm per week: `@mui/x-data-grid` 4,429,346; `-pro` 2,137,033; `@mui/x-license` 2,810,136; `@mui/x-date-pickers` 7,332,741; `-pro` 1,615,309.
- Revenue: not public.

---

## 3. Highcharts (Highsoft; free personal and education use, paid commercial)

**Free and paid parts**
- Source is on GitHub, but the software is proprietary.
- A **Personal Use** licence is granted automatically to individuals for purposes that are entirely non-commercial and non-professional. It excludes work for employers, freelance work, small businesses and non-profits.
- An **Educational** licence covers accredited institutions' formal teaching.
- Everything else needs a commercial licence, including non-profits, government, and internal prototypes or R&D.
- Source: https://shop.highcharts.com/license-eula
- Feb 2026 EULA rewrite: it moved from "how it is delivered" (CDN) to "why it is used", with explicit definitions, because the old fair-use wording was hard to enforce fairly. It also added CDN rules with automated enforcement. Source: https://www.highcharts.com/blog/?p=29639 (date inferred from upload path, (unverified))
- The CDN is capped at 1,000 file requests per origin or licence per 24 h. Above that you must self-host. Source: https://shop.highcharts.com/license-eula

**Commercial terms**
- Licence types (https://shop.highcharts.com/license):
  - Internal: employees and contractors only.
  - SaaS: one or more external apps or public websites.
  - OEM: installed products distributed to customers.
- **Perpetual** licences cover releases shipped during active "Advantage" (updates and support). Advantage auto-renews yearly, with 60 days' notice to opt out, and can be fixed for up to 5 years. Source: https://shop.highcharts.com/license
- The **Annual** licence is a pure subscription: you must stop using the software when it ends. The FAQ recommends Annual for six or fewer developers and positions it as the option for startups and smaller budgets. Source: FAQ on https://shop.highcharts.com/
- A seat is any unnamed person working with the API or source at the same time. Audits are allowed once a year and up to 5 years after termination. Source: https://shop.highcharts.com/license

**Prices** (accessed 2026-11-19; https://shop.highcharts.com/; the configurator defaults to an annual subscription and offers "Perpetual" as an optional add-on)

| Product | Price |
|---|---|
| Highcharts Core | $366 / seat |
| Stock add-on | +$366 / seat |
| Maps add-on | +$128 / seat |
| Gantt add-on | +$73 / seat |
| Dashboards | $264 / seat |
| Grid Pro | $316 / seat |
| Highcharts for Python | +$110 / yr |

- (unverified) Whether $366 is the Internal or SaaS annual price, and what the perpetual surcharge is: the configurator would not add items in my session.
- OEM: quote only.

**Enforcement**
- **Credits link** is on by default: the label "Highcharts.com" sits in the lower-right corner of every chart, and `credits.enabled` defaults to true. Source: https://api.highcharts.com/highcharts/credits
- Removing it is a config flag, so this is an honour-system nudge.
- A licence key is referenced in the agreement, and a missing or invalid key may print a console message without limiting functionality. Source: https://shop.highcharts.com/license
- Grid Pro uses a separate `gridKey` that prints console warnings when missing or expired. Source: https://www.highcharts.com/docs/grid/grid-key
- The rest of enforcement is legal: audits, invoicing for overuse, and CDN rate caps.

**What drives upgrades**
- The free licence boundary is the *use*, not features. Any company use is paid.
- Product add-ons (Stock, Maps, Gantt, Dashboards, Grid) upsell per seat.

**Site, docs and pricing page**
- The shop is a 3-step configurator (Configure, Checkout, Complete) with per-product seat prices.
- The FAQ's Licensing section alone lists 22 questions: seat counting, internal vs SaaS, OEM, contractors, affiliates.
- Observation: the size of the licensing FAQ is itself a signal of how much friction use-based licensing creates.

**Traction**
- Homepage claims: used by 80 of the world's 100 largest companies, 50K+ customers, 3.1M+ weekly npm downloads, 12K+ GitHub stars. Source: https://www.highcharts.com/
- npm `highcharts` 3,590,165 / week.
- (unverified, third-party aggregator) Highsoft AS total operating income of about NOK 101.4M in 2024. Source: https://21st.ai/en/companies/548661/no/vik-i-sogn/-/org-number-996840506-highsoft-as/summary

---

## 4. amCharts (free with logo, "linkware"; paid to remove)

**Free and paid parts**
- The free licence is the full library with **no feature limits**. It allows commercial use with the amCharts logo on the charts, and has no time or user limits. Source: https://www.amcharts.com/
- The bundled `LICENSE` (amcharts5@5.21.2) is a "linkware" licence:
  - You may use, modify and bundle it in commercial projects.
  - You may not disable, hide or alter the branding link.
  - You may not use it without the built-in attribution, sell it, or distribute it on its own.
  - Source: https://cdn.jsdelivr.net/npm/@amcharts/amcharts5@5.21.2/LICENSE
- amCharts' own agent guidance says to keep the logo unless the project holds a commercial licence. Source: https://cdn.jsdelivr.net/npm/@amcharts/amcharts5@5.21.2/AGENTS.md

**Commercial terms** (https://www.amcharts.com/online-store/licenses-explained/)
- Licensing is per developer seat, per product. Websites, servers, users and products are unlimited on every licence.
- Tiers: Basic (public sites without login), SaaS (login-required apps), OEM (redistributed apps), Extended OEM (affiliates, white-label, developer tools; quote only).
- Perpetual: minor upgrades for life, major upgrades released in the first year.
- Subscription: all upgrades while active. Cancelling doesn't break what is deployed, but you can't change it or start new projects.

**Prices** (accessed 2026-11-19; https://www.amcharts.com/online-store/ and https://www.amcharts.com/)

| Licence (perpetual, per seat, per product) | Price | Support/updates add-on |
|---|---|---|
| Basic | $180 | +$190 / yr |
| SaaS | $650 | 1st year included, then $190 / yr |
| OEM | $2,700 | 1st year included, then $790 / yr |
| Extended OEM | quote | — |

- Each extra product (Maps, Stock, Gantt) costs 20% less when bought with Charts.
- Annual subscription "from $80/yr" per seat (homepage).
- amCharts Pro (hosted tool): $9 / month.

**Enforcement**
- Visible brand mark plus the honour system. A commercial licence removes the logo with one line of code, per the buying FAQ. Source: https://www.amcharts.com/online-store/buying-faq/
- (unverified) The exact v5 API is believed to be `am5.addLicense(...)`. I did not see official v5 docs; v4 used `am4core.addLicense`.

**What drives upgrades**
- There is **no feature gating**. Upgrades come only from brand removal plus deployment context (login, redistribution). This works for charts because the logo sits on a visible artefact the customer's users see.

**Site and pricing page**
- The pricing page has a currency selector (USD, EUR, GBP), links to a licence explainer, buying FAQ and agreement, compare tables per licence, and a cart builder with a seat counter and running total.
- Observation: transparent prices, but a 4 × 4 product/licence matrix.

**Traction**
- 20,000+ companies, since 2006. Source: https://www.amcharts.com/
- npm `@amcharts/amcharts5` 485,527 / week.
- Revenue: not public.

---

## 5. Handsontable (MIT until 2019, now proprietary; non-commercial key)

**Licence history**
- The last MIT release was 6.2.2, published 2018-12-19 (npm registry time).
- 7.0.0, published 2019-03-06, replaced MIT with a custom free-for-non-commercial-and-evaluation licence. Announced 4 Mar 2019 in "Handsontable drops open source for a non-commercial license". Sources: https://handsontable.com/blog/?p=1263 (via search) and https://newreleases.io/project/npm/handsontable/release/7.0.0
- Handsontable now calls itself "source-available". The non-commercial licence PDF was revised on 22 Jan 2026. Source: https://handsontable.com/static/licenses/non-commercial/v5/handsontable-non-commercial-license.pdf (via search)

**Commercial terms and prices**
- The pricing page shows **no prices**. The licence is priced **by the number of end users** of the apps you build, through a sales quote.
- There is a 45-day trial with every feature and plugin.
- Subscription licences expire unless renewed. Perpetual licences keep versions released during the support plan.
- HyperFormula is licensed separately.
- Source for all of the above: https://handsontable.com/pricing (accessed 2026-11-19)
- (unverified) A pricing tracker says per-developer "Standard $999 / Priority $1,299" starting prices appeared in March 2026, and the basis changed to end users between 26 Oct and 2 Nov 2026. Sources: https://pricingsaas.com/companies/handsontable/diffs/2026W10 and https://pricingsaas.com/companies/handsontable/diffs/2026W45
- (unverified) A reseller lists about $979 per developer per year. Source: https://www.componentsource.com/product/handsontable/licensing

**Enforcement** (https://handsontable.com/docs/javascript-data-grid/license-key/)
- The key `'non-commercial-and-evaluation'` makes the grid silent: no notice, no console output.
- A **missing or invalid key shows an un-closable blocking modal over the grid**. The rest of the page still works.
- Expired keys depend on the licence type:
  - Trial: blocking screen after the grace period.
  - Subscription: console warnings only; the grid keeps working.
  - Perpetual: older builds keep working; newer builds show a console error and a notice below the table.
- Validation compares dates offline and never contacts a server.
- Observation: this is a model doc for documenting key behaviour.

**What drives upgrades**
- Any commercial use is paid; there is no feature split. The free tier is evaluation, education and hobby only.

**Traction**
- Homepage claims: 150+ Fortune 500 companies, 2.8M npm installs a month, 24.8K stars, on the market since 2012. Source: https://handsontable.com/
- npm `handsontable` 375,318 / week. Compare AG Grid Community at 5.6M: Handsontable's reach today is far smaller (correlation only; no causal claim).

---

## 6. FullCalendar (MIT standard + Premium plugins)

**Free and paid parts**
- Standard is MIT, covering every standard view and feature, the React, Vue and Angular components, and commercial use. Source: https://fullcalendar.io/pricing
- Premium adds Timeline View, Vertical Resource View, printer-friendly rendering, and email support (2 tickets a month). Same source.

**Commercial terms**
- Premium is licensed per developer seat. A seat is anyone who codes against the Premium API, writes CSS for the calendar or edits Premium source. Seats are unnamed.
- One licence covers multiple projects inside the company.
- Renewal is encouraged but optional: if you stop, you can use the last version released before expiry forever.
- Clients: if they can't edit the source, one licence plus minified delivery is enough. If they can, each client needs a licence, or you buy OEM.
- Source for all of the above: https://fullcalendar.io/pricing
- v7 premium licences (https://fullcalendar.io/license):
  - Commercial.
  - **AGPLv3** for fully open-source front end *and* back end. This replaced GPLv3 in v7, so serving the app over a network now triggers the copyleft.
  - CC BY-NC-ND for registered non-profits.
  - Each option has its own key string.

**Prices** (accessed 2026-11-19)
- Premium starts at **$480**, for 1 to 10 developers. Renewal costs 50% of the base price before expiry and 25% off after. OEM is custom. Source: https://fullcalendar.io/pricing
- Prices for more seats: not shown on the page.

**Enforcement**
- Premium needs `schedulerLicenseKey`. Without a valid key it shows a warning; the exact text is not documented.
- Existing customers see key warnings when they upgrade past their 1-year update window.
- Source: https://fullcalendar.io/docs/schedulerLicenseKey

**What drives upgrades**
- One specific, expensive-to-build capability: resource and timeline scheduling. Everything else is free and complete. A clean "vertical" gate.

**Site and pricing page**
- Three cards (Standard / Premium / OEM), a licence and support table, a features table, a FAQ and a redistribution section. Source: https://fullcalendar.io/pricing
- Observation: the simplest and clearest pricing page in this set.

**Traction**
- Footer: React 7.7M, Vue 850K, Angular 930K and vanilla 2.5M downloads a month. v7.1.5 was released 12 Nov 2026. Built and maintained by Adam Shaw (FullCalendar LLC). Source: https://fullcalendar.io/pricing
- npm per week: `@fullcalendar/core` 4,186,767; premium `@fullcalendar/resource-timeline` 318,145 (about 7.6% of core).
- Revenue: not public.

---

## 7. Tiptap (MIT editor; paid Platform; Pro extensions partly re-opened)

**Free and paid parts**
- The Tiptap Editor, the Hocuspocus collaboration server and the extension ecosystem are MIT. Source: https://tiptap.dev/open-source-to-cloud
- Paid: **Tiptap Platform**, covering cloud collaboration, comments, AI, document history and versions, DOCX/Markdown conversion, webhooks and an SLA. Some remaining Pro extensions need an active subscription for verification but run without Platform. Sources: https://tiptap.dev/open-source-to-cloud and https://tiptap.dev/pricing
- On 6 Jun 2025 Tiptap announced it would open-source 10 formerly paid Pro extensions under MIT. They said these small pieces were no longer central to the business and moved paid plans to bundles with backend infrastructure. At the same time the free Cloud tier was sunset. Source: https://tiptap.dev/blog/release-notes/were-open-sourcing-more-of-tiptap

**Prices** (accessed 2026-11-19; https://tiptap.dev/pricing)

| Plan | Monthly | Billed annually (per month) | Cloud docs / env | Dev licences | Environments |
|---|---|---|---|---|---|
| Start | $59 | $49 | 500 | 2 | 2 |
| Team | $179 | $149 | 5,000 | 5 | 3 |
| Business | $1,199 | $999 | 50,000 | 10 | 5 |
| Enterprise | custom | custom | custom | custom | custom |

- Extra developers cost $49 / month, or $39 / month billed annually.
- Exceeding document limits triggers an email, then an **automatic plan upgrade**.
- No refunds; 30-day trial.

**Enforcement and delivery**
- Pro packages come from a **private npm registry** (`registry.tiptap.dev`) with a personal access token, set in `.npmrc` through an env var. Source: https://tiptap.dev/docs/guides/pro-extensions
- Cloud features are enforced server-side by usage.

**What drives upgrades**
- Hosted infrastructure and usage (documents), not component features.
- Key lesson: Tiptap tried selling individual Pro *extensions* and concluded they were not where its value was.

**Traction**
- About 32k GitHub stars, about 6k Discord members, and about 9.6M npm downloads a month for `@tiptap/react`. Source: https://tiptap.dev/open-source-to-cloud
- npm `@tiptap/core` 38,463,760 / week.
- $2.6M seed in Oct 2023, led by Expa with Y Combinator. Source: https://tiptap.dev/blog/tiptap-seriesseed (via search)

---

## 8. tldraw (Apache → non-commercial → watermark → key-required)

**Licence history**
- **20 Dec 2023:** moved from Apache-2.0 to a dual licence: free non-commercial, paid commercial. A contributor licence agreement had preserved the right to relicense. At that time pricing was not set. Source: https://tldraw.dev/blog/license-update-for-the-tldraw-sdk
- **v3.0.0, 2024-09-13 (npm time):** free for commercial *and* non-commercial use as long as the "Made with tldraw" watermark is shown. A Business Licence removes it. Source: https://tldraw.dev/releases/v3.0.0
- **v4.0.0, 2025-09-18 (npm time):** **production requires a licence key.**
  - Licence types: 100-day free trial, commercial licence, free hobby licence (non-commercial, reviewed per request, keeps the watermark).
  - Development and localhost need no key.
  - Sources: https://tldraw.dev/releases/v4.0.0 and https://tldraw.dev/blog/20-things-i-wish-ai-chatbots-knew-about-tldraw (12 Jun 2026)
- Steve Ruiz's reasons for leaving the watermark model, on HN (https://news.ycombinator.com/item?id=45293839):
  - The non-commercial licence meant endless negotiation of tiny deals.
  - The 3.x watermark fixed that but anchored the price low for big companies and caused other problems.
  - In pricing discovery, early adopters said either "nothing yet" or $5k–$10k.
  - Reaction was mixed: complaints about the price and opaque, sales-led pricing, and defenders calling it cheap for businesses that build on the SDK.

**Prices**
- Not public. The page offers "value-based pricing", talk to sales, a 100-day trial with no card, discounted startup pricing by application, and a free hobby licence by application. Source: https://tldraw.dev/pricing (accessed 2026-11-19)
- (unverified) Third parties and HN commenters cite about $6,000 a year for a startup licence. Source: https://news.ycombinator.com/item?id=45293839

**Enforcement** (https://tldraw.dev/sdk-features/license-key)
- Production is detected by HTTPS, a non-localhost host and `NODE_ENV=production`.
- **No key in production logs errors and the editor stops rendering after five seconds.**
- Keys are host-scoped (exact host or wildcard) and signature-checked locally with `crypto.subtle`.
- Annual and perpetual licences get a 30-day grace period after expiry. Perpetual keys cover any patch release indefinitely.
- Trial and hobby keys send analytics pings; commercial keys send nothing.

**What drives upgrades**
- Every production commercial use is paid. Hobby users carry the watermark.

**Traction**
- 51.5K stars, 692.6K weekly npm downloads, and customers listed as Google, Autodesk, BlackRock, Replit, ClickUp and Luma. tldraw has investors (no amounts given). Source: https://tldraw.dev/blog/20-things-i-wish-ai-chatbots-knew-about-tldraw
- npm `tldraw` 692,390 / week.

---

## 9. Syncfusion (commercial suite; free Community License under thresholds)

**Community License** (https://www.syncfusion.com/products/communitylicense)
- Free, *including commercial use*, for organisations with:
  - less than $1M in annual gross revenue,
  - 5 or fewer developers,
  - 10 or fewer employees, and
  - never more than $3M in outside capital.
- Government bodies are excluded.
- Covers the whole Essential Studio suite, support and updates. It lasts while you stay eligible.
- You apply through an account and form, and Syncfusion validates the request in a ticket. Open-source projects must register.

**Paid prices** (accessed 2026-11-19; https://www.syncfusion.com/sales/teamlicense; annual subscription, minimum 1 year)
- UI Component Suite: $1,199 / developer / year.
- Single SDKs (Grid, Chart, Scheduler, Gantt, Rich Text, Diagram, File Manager): $959 each.
- PDF Viewer: $599. Document, DOCX, Spreadsheet and PPTX SDKs: $1,199 each.
- Discounts: 20% for revenue under $10M; 20% for HQs in low- and middle-income countries; 7.5–15% bundle discounts; a Black Friday code for 40% off from 23 Nov 2026.

**Enforcement**
- Since 2022 Vol 1 (v20.1.47), JS packages need `registerLicense(key)`. Without it a **trial banner** renders on the app.
- Keys are tied to a **version and platform**.
- Validation is client-side and offline, with no data sent.
- Source: https://ej2.syncfusion.com/documentation/licensing/overview

**What drives upgrades**
- Company growth past the thresholds: you "graduate" into paid.
- Breadth: more than 1,600 components, sold as SDKs or suites.

**Traction**
- 47K+ customers, 1M+ developers, 400+ Fortune 500 companies, 1,600+ components, in business 25+ years. Source: https://www.syncfusion.com/
- npm `@syncfusion/ej2-base` 434,008 / week.

---

## 10. Font Awesome (Free vs Pro subscription) — plus Web Awesome (Web Components, MIT core + Pro)

**Free and paid parts**
- Font Awesome Free: icons under CC BY 4.0, fonts under SIL OFL 1.1, code under MIT. Attribution comments are embedded. Source: https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/LICENSE.txt
- Pro: the full Pro library, with Pro+ packs on Solo and Team. Source: https://fontawesome.com/plans

**Commercial terms and prices** (accessed 2026-11-19; https://fontawesome.com/plans)

| Plan | Annual | Monthly | Includes |
|---|---|---|---|
| Free | $0 | $0 | Free icons, 1 kit, 10k pageviews |
| Starter (CDN only) | $48 / yr | $8 / mo | Pro icons through the CDN, 5 kits, 50K pageviews, 1 seat |
| Solo | $96 / yr | $16 / mo | Pro+ icons, downloads, npm, Figma, **perpetual licence**, 1M pageviews |
| Team | $192 / yr | $32 / mo | 3 seats (up to 250; +$20/seat), roles, 2M pageviews |
| Enterprise | custom | custom | — |

- **Annual Solo and Team subscribers keep the icons released during their subscription forever.**
- Monthly plans are CDN-only ("Cloud").
- Overage: $2 per extra 250K pageviews and $1 per GB.
- The FAQ promises a free plan with no trial, no time limit and no surprise paywalls.

**Enforcement and delivery**
- Pro npm packages come from a **private registry** (`npm.fontawesome.com`) with an account token and need an active Pro subscription. Source: https://docs.fontawesome.com/web/setup/packages
- Cloud kits are metered by pageviews and bandwidth.

**Web Awesome** (from the Font Awesome team; the successor to Shoelace; **Web Components**, the closest analogue to Dotquilt's architecture)
- The core is **MIT** and promised free forever: 50+ components, 10+ themes, utilities and localisation. Sources: https://webawesome.com/ and https://webawesome.com/license
- Pro adds:
  - Pro components, premium themes, a theme builder and colour tools
  - a pattern library and unlimited hosted projects
  - the official Figma kit and human support
  - a **perpetual licence** for versions covered during the subscription
  - Source: https://webawesome.com/purchase
- The purchase page says Pro funds the free core.
- **Price: $228 per seat per year** (from the checkout widget's `original-value="228"` for 1 seat/year; accessed 2026-11-19). Teams of 5 or more seats get custom pricing. Source: https://webawesome.com/purchase
- Pro licence: per-creator seats. Creators may use Pro assets in their own projects but may not redistribute standalone copies or let non-creators build with them. Covered versions remain licensed after the term ends (except on "limited licence" plans). Source: https://webawesome.com/license/pro

**What drives upgrades**
- More assets (icons, components, themes, patterns), tooling (Figma, builders), convenience (CDN kits, npm) and support. The free core is never crippled.

**Traction**
- The Font Awesome 5 Kickstarter (2016–17) is reported as the most-funded software Kickstarter at about $1.08M from about 35.5K backers. Source: https://medium.com/font-awesomeness/how-font-awesome-5-became-kickstarters-most-funded-software-project-4a63c035e84 (figure from search snippet, (unverified))
- Web Awesome Kickstarter (blog post of 5 Apr 2024): $200K by day 3. Source: https://blog.fontawesome.com/web-awesome-kickstarter/
- (unverified) The final total was $732,852, per BackerKit. Source: https://www.backerkit.com/projects/fontawesome/web-awesome
- npm per week: `@fortawesome/fontawesome-svg-core` 3,955,428; `@awesome.me/webawesome` 197,583.
- Revenue: not public.

---

## 11. Sidekiq (LGPL OSS + Pro / Enterprise; the classic open-core)

**Free and paid parts** (https://sidekiq.org/)
- OSS (LGPL): jobs, scheduling, error handling, web UI, middleware.
- **Pro:** batches, enhanced reliability, multi-cluster UI, metrics, expiring jobs.
- **Enterprise:** rate limiting, cron, unique jobs, rolling restarts, historical metrics, multi-process, encryption, UI authorisation.

**Prices** (accessed 2026-11-19)
- Pro: **$99 / month or $995 / year, per organisation, unlimited servers and environments.**
- Enterprise: from **$269 / month per 100 production threads**, with dev and staging free and bursting to 2× allowed for an hour a day.
- Redistribution needs an Appliance licence: $14,995 / yr for Pro, $39,995 / yr for Enterprise.
- 2-week money-back guarantee.
- Sources: https://sidekiq.org/ and https://sidekiq.org/wiki/Commercial-FAQ

**Enforcement and delivery**
- A **private gem server with per-customer credentials** set through an env var. When the subscription lapses, gem server access ends and `bundle install` stops working.
- Leaked credentials get a warning and must be rotated; repeat leaks lose access.
- Enterprise phones home daily with aggregate usage for billing.
- Source: https://sidekiq.org/wiki/Commercial-FAQ

**What drives upgrades**
- Features businesses need at scale (reliability, batches, rate limits, cron, uniqueness), not developer-experience basics.
- Mike Perham: the commercial licence for the LGPL core alone "didn't sell very well"; selling extra features did.
- The price is set at about $1,000 a year to stay under the threshold where purchases need executive sign-off.
- Card-only billing keeps it automated.
- Source: https://www.startupsfortherestofus.com/episodes/episode-661-millions-in-revenue-as-a-one-person-software-company (recorded 16 May 2023)

**Traction**
- About 2,000 customers and revenue "closer to $10M than $1M", run solo with no employees (May 2023). Source: the same episode page.
- In 2016 it was about $80k a month. Source: https://www.indiehackers.com/podcast/016-mike-perham-of-sidekiq (via search, (unverified))
- Gem downloads: 348,949,550 total (rubygems.org API).

---

## 12. Kendo UI / KendoReact (Progress Telerik) and DevExpress

**KendoReact** (accessed 2026-11-19; https://www.telerik.com/kendo-react-ui/pricing)
- **KendoReact Free:** $0, 50+ components, free in production, community support only.
- Premium (120+ components) per developer per year, priced by support level:
  - Lite: $649
  - Priority: $749
  - Ultimate: $1,199
- Kendo UI (all frameworks) is $799 / $899 / $1,299. Source: https://www.telerik.com/purchase/kendo-ui
- (unverified) Page metadata calls licences perpetual with 1 year of maintenance renewable at 50%, but the visible copy talks about an "active subscription".
- **Enforcement:** using premium components without a licence draws a **watermark over the component, a page banner and a console warning** (since KendoReact 5.16.0, 25 Jul 2023, per Telerik docs seen via search). Keys are activated with the `kendo-ui-license activate` CLI or an env var in CI. Sources: https://www.telerik.com/kendo-react-ui/components/my-license/license-errors-and-warnings and https://www.telerik.com/kendo-react-ui/components/my-license/ci-services
- **Upgrade driver:** component breadth (50 free → 120+ premium) plus support tiers. Price varies *only* by support level.
- npm `@progress/kendo-react-grid` 136,853 / week. Revenue: inside Progress Software, a public company; not broken out.

**DevExpress** (accessed 2026-11-19; https://www.devexpress.com/buy/net/)
- 12-month subscription per developer:

| Product | First year | On-time renewal |
|---|---|---|
| DevExtreme Complete | $899.99 | $449.99 |
| DXperience | $1,699.99 | $849.99 |
| Universal | $2,299.99 | $1,149.99 |

- Multi-developer discounts of 5–15%.
- **Enforcement:** DevExtreme keys are tied to each major version and generated by the `devextreme-license` CLI. During the trial an on-screen message and console warning appear. Source: https://js.devexpress.com/DevExtreme/Guide/Common/Licensing
- npm `devextreme` 347,958 / week.

**Site note (observation):** both are big enterprise suites with feature-dense pricing pages, webinar banners, many SKUs and support-tier upsells. Their pricing logic is support-led, not feature-led.

---

## Comparison table

Prices accessed 2026-11-19; entry price is the cheapest self-serve commercial option.

| Product | Free part (licence) | Paid gate | Unit and term | Entry commercial price | Delivery and enforcement | Free → paid trigger |
|---|---|---|---|---|---|---|
| AG Grid | Community (MIT) | Enterprise features | Per dev; single or multi app; perpetual + 1 yr updates | $999 / dev (single app) | Public npm; key; watermark + console error | Excel, pivot, SSRM, grouping |
| MUI X | Community (MIT) | Pro / Premium features | Per dev; single or multi app; annual or perpetual | $299 / dev / yr | Public npm; public offline key; watermark + console | Resizing, pinning, range pickers; grouping and Excel |
| Highcharts | Personal and education use (proprietary) | Any commercial use | Per seat; Internal / SaaS / OEM; annual or perpetual | $366 / seat (annual shop default) | Credits link on by default; console key note; audits; CDN caps | Being a company |
| amCharts | Full library with logo (linkware) | Logo removal | Per seat per product; perpetual or subscription | $180 perpetual / $80 / yr | Visible logo; honour system | Brand-free UI; login or redistribution |
| Handsontable | Non-commercial key (proprietary) | Any commercial use | Priced by end users; quote | Not public | Key; blocking modal if missing | Being a company |
| FullCalendar | Standard (MIT) | Timeline and resource views | Per dev (1–10); renew 50% | $480 | Key; warning; AGPL and CC-NC options | Scheduling resources |
| Tiptap | Editor + Hocuspocus (MIT) | Cloud platform, AI, conversion | Monthly or annual plans; usage | $49 / mo (annual) | Private registry token; server usage | Collab, AI, docs volume |
| tldraw | Hobby (watermark, by application) | Any commercial production use | Annual or perpetual; sales-led | Not public | Key required in prod; editor stops after 5 s | Shipping to production |
| Syncfusion | Community Licence (<$1M, ≤5 devs) | Size thresholds | Per dev per year | $959 / dev / yr | Key; trial banner; version-bound | Company growth |
| Font Awesome | Free icons (CC BY / OFL / MIT) | More icons, tools, CDN volume | Per seat subscription; perpetual rights to versions obtained | $48 / yr | Private npm registry; metered CDN kits | More assets, Figma, npm |
| Web Awesome | Core (MIT) | Pro components, themes, patterns, Figma, support | Per seat per year; perpetual for covered versions | $228 / seat / yr | Account / hosted projects (delivery details unverified) | Polish, patterns, design kit |
| Sidekiq | OSS (LGPL) | Business-scale features | **Per org**, unlimited servers; annual | $995 / yr | Private gem server credentials | Reliability and scale |
| KendoReact | Free (50+ comps) | Premium components + support | Per dev per year, by support level | $649 / dev / yr | Key CLI; watermark + banner | Breadth |
| DevExpress | — | Whole suite | Per dev per year; renew ~50% | $899.99 / dev | Version-bound key CLI; trial message | Breadth |

**Download share of paid add-ons** (npm, week to 2026-11-17)

| Paid package | Weekly downloads | Free counterpart | Weekly downloads | Paid as % of free |
|---|---|---|---|---|
| `ag-grid-enterprise` | 2.30M | `ag-grid-community` | 5.57M | 41% |
| `@mui/x-data-grid-pro` | 2.14M | `@mui/x-data-grid` | 4.43M | 48% |
| `@mui/x-date-pickers-pro` | 1.62M | `@mui/x-date-pickers` | 7.33M | 22% |
| `@fullcalendar/resource-timeline` | 0.32M | `@fullcalendar/core` | 4.19M | 7.6% |

High shares come from putting paid code on public npm with a watermark rather than locking it away. Those numbers include unlicensed trial use.

---

## Synthesis for Dotquilt

### What the comparables say, in one paragraph
Every successful example keeps a **genuinely complete, permissively licensed core**: MIT for AG Grid, MUI, FullCalendar, Tiptap, Web Awesome and Font Awesome Free; LGPL for Sidekiq. They charge for one of five things:
- **Business-grade capabilities** that cost a lot to build: AG Grid Enterprise, MUI X Pro/Premium, FullCalendar Premium, Sidekiq Pro.
- **Hosted service and usage**: Tiptap Platform, Font Awesome CDN kits.
- **More assets and tooling**: Font Awesome Pro, Web Awesome Pro.
- **Company size or commercial use**: Syncfusion, Highcharts, Handsontable, tldraw.
- **Brand removal**: amCharts, and tldraw 3.x.

The sustainable, low-drama businesses are the first three. Use-based licensing worked for incumbents with huge enterprise pull (Highcharts) but caused visible backlash and adoption risk for the late switchers:
- Handsontable left MIT in 2019; it now has 375K weekly downloads vs AG Grid Community's 5.6M (correlation only).
- tldraw needed three licence redesigns in two years.

Tiptap is a warning for small add-ons: selling individual Pro *extensions* was not where its value was, and it open-sourced 10 of them in 2025.

### Patterns that fit a loader library

1. **Keep the core MIT and say so in writing.** Web Awesome and Font Awesome both publicly promise the core stays free, which builds trust. Dotquilt's current policy (nine components, every animation, the React adapter, docs, examples and the standard playground free; existing components never move behind payment) matches the most trusted examples. **Do not relicense the core.** Every relicensing case here (Handsontable 2019; tldraw 2023, 2024, 2025) cost goodwill and took repeated rework.

2. **Sell assets and tooling, not crippled components (the Web Awesome / Font Awesome model).** Web Awesome is the closest structural analogue: Web Components, MIT core, and a Pro tier of extra components, themes, patterns, Figma kit, builder tools and support at $228 per seat per year with a perpetual right to covered versions. This maps directly onto the owner's Pro plan: app screens with every loading state, motion packs, playground export and saved presets. Optionally add a Figma kit.

3. **Licence: perpetual use + 12 months of updates, renewal optional.** This is the dominant shape (AG Grid, MUI perpetual, Highcharts perpetual, amCharts, FullCalendar, Font Awesome annual, Web Awesome). Buyers understand it and auditors accept it. Add the standard renewal incentive: about 50% off if renewed before expiry (MUI, FullCalendar, DevExpress).

4. **Price unit: keep it to two tiers, personal and team.** Per-developer seats are the norm, but MUI's 2026 move to seat × app × term produced 16 price points; avoid that.
   - A flat **per-organisation team price** (Sidekiq Pro: $995/yr, unlimited servers, card-only, below executive sign-off thresholds) is the simplest thing a small team can run.
   - The owner's launch guess ($99 individual / $299 team) sits at the low end, alongside Font Awesome ($48–192/yr), Web Awesome ($228/seat/yr) and amCharts Basic ($180). That is appropriate: a loader library is a smaller value surface than a grid or a calendar. FullCalendar, at $480 for a narrow but expensive feature, is the ceiling.
   - Consider an annual option later only if Pro keeps getting new content (Font Awesome / Web Awesome style).

5. **If Pro ever includes runtime components, gate a vertical capability, not a basic one.** FullCalendar gates one expensive vertical (resource timelines); AG Grid and MUI gate enterprise data features. A Dotquilt equivalent might be:
   - data-app loaders: virtualised table or chart skeletons tied to real data shapes;
   - integrations: data-fetching libraries, Suspense orchestration across many regions;
   - designer tooling.

   That needs a policy amendment (per `docs/planning/commercial-boundary-review.md`, referenced in memory).

### What not to paywall (would alienate users)
- **Accessibility and correctness:** reduced motion, forced colours, focus and inert handling, SSR safety, listener and observer cleanup. These are Dotquilt's stated release requirements. AG Grid keeps accessibility, theming, performance and every framework wrapper in its free tier; FullCalendar keeps all framework components free. Gating any of them would read as holding safety hostage.
- **The React adapter and selective imports.** Wrappers are free everywhere in this set.
- **Theming via tokens and basic customisation.** Free in AG Grid, Web Awesome and MUI Core.
- **The existing nine components or any of their animations.** Moving shipped features behind payment is the move that triggered backlash for Handsontable and tldraw.
- **Branding or watermarks on the loader itself.** amCharts and Highcharts can brand charts because charts are persistent content. A loader is transient UI shown to the customer's users at their most impatient moment. A logo or "made with" mark there harms their UX and accessibility. tldraw found the watermark also anchored its price low.

### How enforcement should work for a small team

| Approach | Used by | Fit for Dotquilt |
|---|---|---|
| Honour system + clear licence text + easy invoicing | amCharts (logo aside), FullCalendar for client work, Highcharts (credits + audits) | **Good** for template and asset packs. Piracy of templates can't be prevented anyway; make buying easy for companies. |
| Private repo or registry access with a token, revoked on lapse | Font Awesome Pro, Tiptap Pro, Sidekiq gem server | **Good** for delivering Pro source, packs and updates. Lapse ends *updates*, not use, matching "perpetual + 12 months". Low runtime risk. |
| Public package + offline signed key + watermark/console | MUI X, AG Grid, Kendo, Syncfusion, DevExtreme | Only if Pro becomes runtime components. If so, copy MUI: public, offline-verified key; **console note only**; no network calls; SSR-safe; no change to rendering. |
| Hard blocking (modal or stop rendering) | Handsontable (missing key), tldraw (prod, after 5 s) | **Never.** A licence fault would blank or stall a customer's loading state on the critical path, directly against Dotquilt's handoff guarantees. |
| Size-threshold free licence with manual validation | Syncfusion | **Not now.** It needs an application and ticket workflow and sales follow-up a small team can't staff. |
| Non-commercial / AGPL dual licence | Highcharts, Handsontable, tldraw, FullCalendar Premium (AGPL option) | **Avoid for the core.** It kills the adoption funnel that open-core depends on and creates licensing FAQs (Highcharts has about 22). |

**Practical recommendation**
- Ship Pro as source and assets the buyer owns: app-screen templates, motion presets, playground export, maybe a Figma kit.
- Deliver through checkout plus access to a private GitHub repo or download, with 12 months of updates.
- No licence checks anywhere in `@dotquilt/core` or the React adapter.
- Publish a short licence page and a FAQ modelled on FullCalendar: who needs a seat, client and agency work, redistribution (no resale as a UI kit, as in Web Awesome's Pro licence and AG Grid's ban on toolkit embedding), and what happens after 12 months.
- If Pro ever ships as an npm package, mirror Font Awesome and Tiptap (private registry token) rather than adding runtime keys.

### Pricing-page and docs patterns worth copying
- **FullCalendar's page:** 3 cards (Free / Pro / Team-or-OEM), one licence-and-support table, one features table, a short FAQ and a redistribution section. Visible prices; no configurator.
- **Web Awesome / Font Awesome's explicit pledge** that the core stays free and that Pro funds it.
- **Handsontable and tldraw licence-key docs**, if keys ever exist: a table of every state (missing, invalid, expired, trial) with the exact user-visible effect and a promise of no network calls.
- **Avoid** AG Grid's hidden prices behind a separate store, Highcharts' multi-step configurator with about 22 licensing questions, and tldraw's "talk to sales". All three add friction that a $99–299 product can't carry.

### Expectations
- Revenue scales with the free funnel. AG Grid (£16M in 2022) and Sidekiq ("closer to $10M than $1M" in 2023, about 2,000 customers) are outliers built on millions of weekly installs and on features companies *must* have.
- Even FullCalendar's premium package is only about 7.6% of core downloads.
- A loader library's paid surface is smaller. Plan Pro so it is cheap to build and support, priced to clear purchase thresholds without approval (Sidekiq's reasoning), and never risks the free core's adoption.
