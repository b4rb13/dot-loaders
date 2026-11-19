# 05 — Licensing and payment models for Dotquilt

Research date: 2026-11-19. All fees were read on 2026-11-19 unless a row says otherwise.

> **Not legal or tax advice.** This is product research from public primary sources. Before selling anything, have a lawyer review the license text and an accountant confirm the tax position for the country where the seller is registered.

**How this was researched.** License texts, official FAQs and vendor pricing pages were read directly. The PolyForm and SPDX data came from their GitHub repositories, and npm `license` fields came from the npm registry. Some pages were read through an automated fetcher that summarises, so quotes are kept short. Anything that could not be read first-hand is marked **[unverified]** and listed again in §8.

---

## TL;DR

1. **Nothing is published yet, so the license is still a free choice.** `@dotquilt-internal/core` and `@dotquilt-internal/react` are `"private": true` at `0.0.0-m2.0` and return 404 on the npm registry (checked 2026-11-19). The MIT decision isn't locked in until the first public release. After that, every MIT release stays MIT for good.
2. **Free MIT competitors are huge.** `react-loading-skeleton` (MIT) had ~1.63M downloads and `react-content-loader` (MIT) ~1.04M in the week of 2026-11-11 to 2026-11-17 ([npm API](https://api.npmjs.org/downloads/point/last-week/react-loading-skeleton)). Any friction on the core, such as a non-OSI license, a key or a watermark, pushes users to these.
3. **Companies treat non-OSI and copyleft licenses as blockers.** Google bans AGPL, Commons Clause, non-commercial and BUSL code, and restricts GPL in shipped products ([Google third-party license policy](https://opensource.google/documentation/reference/thirdparty/licenses)). The FSF says JavaScript a browser downloads is *conveyed*, so copyleft terms reach every site that ships it ([FSF](https://www.fsf.org/bulletin/2021/fall/the-fundamentals-of-the-agplv3)).
4. **Delayed open source (BSL, FSL, Fair Source) doesn't fit a UI library.** These licenses only stop *competing products*. Ordinary companies using a loader still pay nothing, and the library still carries the non-OSI adoption penalty.
5. **Size-gated source-available licenses work best for tools that are central to a product or rendered on a server.** Remotion is free for teams of up to 3 people, and it enforces this partly with mandatory client-side rendering telemetry ([Remotion FAQ](https://www.remotion.dev/docs/license/faq)). A loading placeholder can't reasonably phone home from customers' apps.
6. **Watermarks work where the output is persistent and central.** tldraw shows a "made with tldraw" watermark on the canvas, and amCharts puts a logo on every chart. A loader is on screen for a moment, so a watermark there mostly makes the free product look cheap.
7. **Commercial UI-kit licenses look much alike.** They are per seat or tier, allow unlimited end products, client work and SaaS, and forbid redistributing source, making competing kits or templates, and building builders. Updates last for a limited time, often 12 months (MUI X, AG Grid, amCharts perpetual) or for life (Motion+).
8. **Front-end code can't be enforced technically.** Every key check runs in the attacker's browser; MUI X says its key "is designed to be public" ([MUI X licensing](https://mui.com/x/introduction/licensing/)). Cheap, workable enforcement is the honor system plus controlled *delivery*: per-customer downloads, private GitHub repo invites, or registry tokens.
9. **Lemon Squeezy is out.** It closed new sign-ups on 2026-11-16 and stops processing payments on 2027-03-31 ([LS migration docs](https://docs.lemonsqueezy.com/migration)). For a solo seller, the realistic merchants of record are **Paddle** (5% + 50¢), **Polar** (5% + 50¢, +1.5% for non-US cards, with built-in license keys, file downloads and GitHub repo access) or **Stripe Managed Payments** (Stripe fees + 3.5%, only for sellers in ~37 countries, and no file or key delivery). Gumroad costs 10% + $0.50 *plus* 2.9% + $0.30 processing.
10. **Recommendation:** keep the core **MIT** and sell **Dotquilt Pro** (screens, motion packs, tools) under a short custom commercial license. Make it a one-time, seat-tiered purchase with 12 months of updates. Rely on the honor system with no runtime checks or watermarks, deliver per customer through a merchant of record, and register the **Dotquilt** trademark. This matches the owner's 2026-11-19 decision; the research found no reason to overturn it.

---

## 0. Where Dotquilt stands today (context)

- `packages/core/package.json` and `packages/react/package.json` declare `"license": "MIT"` but are `"private": true` and unpublished (registry 404 on 2026-11-19). No MIT release exists to fork from yet.
- An approved commercial policy (2026-10-16, `docs/planning/commercial-boundary-review.md`) keeps all nine components, the React adapter, docs and the standard playground free under MIT. It excludes "a private engine fork, hidden global provider, runtime license check or merchant dependency in consumer applications". It plans a one-time paid collection with 12 months of updates and a versioned source archive.
- The owner decided on 2026-11-19 (memory note `pricing-pro-bundle`) on a free core plus a one-time **Dotquilt Pro** bundle. A launch guess was $99 individual / $299 team.
- The owner asked us to reconsider from scratch. Options below that conflict with the approved policy are flagged **(policy conflict)**. Choosing them would need a policy amendment.

---

## 1. License families

### 1.1 Comparison table

| Family | Lets users… | Forbids / requires | OSI? | SPDX id | How company legal teams treat it | Effect on adoption |
|---|---|---|---|---|---|---|
| **Permissive** (MIT) | Do anything, including commercially | Keep the copyright notice | Yes | `MIT` | Pre-approved almost everywhere; Google classes MIT as "notice" ([Google](https://opensource.google/documentation/reference/thirdparty/licenses)) | Best. This is the npm default. |
| **Strong copyleft** (GPL-2.0+/3.0) | Use, modify, distribute | Combined works that are distributed must be under the GPL. Browser JS counts as distributed ([FSF](https://www.fsf.org/bulletin/2021/fall/the-fundamentals-of-the-agplv3)) | Yes | `GPL-3.0-only` etc. | Google: "restricted", barred from externally delivered products ([Google](https://opensource.google/documentation/reference/thirdparty/licenses)) | Heavy. Most closed-source front ends must buy a commercial license or avoid it. |
| **Network copyleft** (AGPL-3.0) | Same as GPL | Same, plus source for network users (s.13) | Yes | `AGPL-3.0-only` | Google: "cannot be used in google3 under any circumstances" ([Google AGPL policy](https://opensource.google/documentation/reference/using/agpl-policy)) | Heaviest of the OSI licenses. For browser JS it adds little over GPL, because the code is already conveyed. |
| **Dual license** (GPL/AGPL + commercial) | Choose GPL *or* pay | GPL side as above; commercial side per EULA | GPL side only | e.g. `GPL-2.0-or-later` | The GPL side is screened out as above, so companies buy | Works for hard-to-replace components (editors). Needs a CLA or copyright assignment from contributors. |
| **Source-available, size- or use-gated** (custom, e.g. Remotion; PolyForm Small Business) | Free below a size limit (Remotion: ≤3 people; PolyForm SB: <100 people and <US$1M (2019) revenue) | Larger orgs pay; no reselling derivatives | No | `PolyForm-Small-Business-1.0.0`; Remotion is custom (`SEE LICENSE IN LICENSE.md` on npm) | Unknown or custom license: manual legal review. Fails OSD #5 and #6 ([OSD](https://opensource.org/osd)) | Moderate to heavy. Some scanners flag custom licenses, and buyers must self-assess. |
| **PolyForm Noncommercial** | Personal, hobby and research use; charities, schools, government | Any commercial use | No | `PolyForm-Noncommercial-1.0.0` | Google bans non-commercial licenses ([Google](https://opensource.google/documentation/reference/thirdparty/licenses)) | Very heavy for a library: every company must pay. |
| **PolyForm Free Trial** | Evaluation for <32 consecutive days ([text](https://github.com/polyformproject/polyform-licenses/blob/1.0.0/PolyForm-Free-Trial-1.0.0.md)) | Everything else | No | not on SPDX list | Proprietary eval license | It's a trial, not a free tier. |
| **PolyForm Internal Use / Shield / Perimeter** | Internal use only / anything except competing / anything except a competing product | Distribution (Internal Use); competition (Shield, Perimeter) | No | not on SPDX list | Custom review | Shield/Perimeter don't make ordinary users pay. |
| **Business Source License 1.1** | Non-production use, plus an optional "Additional Use Grant" | Production use outside the grant until the Change Date (≤4 years), then GPL-compatible ([BSL 1.1](https://mariadb.com/bsl11/)) | No | `BUSL-1.1` | Google bans it ("not an open source license per the notice at the bottom of its text") | Heavy. Every BSL project has different grant terms, so each needs review ([Sentry](https://blog.sentry.io/introducing-the-functional-source-license-freedom-without-free-riding/)). |
| **Functional Source License 1.1** (Fair Source) | Any "Permitted Purpose", meaning anything except a "Competing Use" | No competing commercial product; becomes MIT or Apache-2.0 two years after each release ([FSL-1.1-MIT](https://fsl.software/FSL-1.1-MIT.template.md)) | No | `FSL-1.1-MIT`, `FSL-1.1-ALv2` | Non-OSI, so review, but the terms are standard | Moderate. Normal users are unaffected and pay nothing. |
| **Fair Core License** | Like FSL, plus license-key-gated features ([fair.io/licenses](https://fair.io/licenses/)) | Don't circumvent keys | No | not on SPDX list | Review | Like FSL. |
| **Elastic License 2.0** | Almost anything | No hosted or managed service; don't circumvent license keys; keep notices ([ELv2](https://www.elastic.co/licensing/elastic-license)) | No | `Elastic-2.0` | Review | Aimed at server software. Irrelevant to a browser library. |
| **Commons Clause** (rider on another license) | The base license's rights | No "Sell", meaning no paid product or service whose value derives "entirely or substantially" from the software ([commonsclause.com](https://commonsclause.com/)) | No ("best not to call [it] open source") | not on SPDX list (checked list released 2026-11-18) | Google: "no code released under any license that includes the Commons Clause may be used" | Heavy and vague. |
| **n8n Sustainable Use License** | Internal business, non-commercial or personal use | Distribution only free and non-commercial; `.ee` files need an Enterprise license ([n8n LICENSE](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md)) | No | custom | Review | Fine for an app people self-host, wrong for a library others embed and ship. |
| **Proprietary EULA** (AG Grid Enterprise, MUI X Pro, Sidekiq Pro, tldraw) | What the EULA grants | Per the EULA | No | npm shows `Commercial` or `SEE LICENSE IN …` | Normal procurement, like any paid SaaS or tool | Fine for a *paid add-on* next to a free core. |

SPDX and OSI flags come from the SPDX license list JSON (release dated 2026-11-18, [license-list-data](https://github.com/spdx/license-list-data)). In it, `MIT`, `GPL-*` and `AGPL-*` are OSI-approved; `BUSL-1.1`, `Elastic-2.0`, `FSL-1.1-*`, `PolyForm-Noncommercial-1.0.0` and `PolyForm-Small-Business-1.0.0` are listed but not OSI-approved. PolyForm Free Trial, Shield, Perimeter and Internal Use, FCL and Commons Clause are not on the list.

### 1.2 Notes that matter for a front-end library

- **Copyleft reaches the customer's whole bundle.** The FSF draws the line plainly: JavaScript "that your browser may download and run locally — these _are_ conveyed" ([FSF](https://www.fsf.org/bulletin/2021/fall/the-fundamentals-of-the-agplv3)). A GPL loader bundled into an app ships to every visitor, which is why front-end GPL libraries are bought, not used. Examples:
  - CKEditor 5 is "GPL 2 or later" or commercial (`ckeditor5@49.1.0` LICENSE.md, [options](https://ckeditor.com/legal/ckeditor-licensing-options/)).
  - TinyMCE 8 is GPLv2+ or Tiny's self-hosted license (`tinymce@8.10.2` license.md).
  - FullCalendar Premium is tri-licensed: commercial, CC BY-NC-ND (trial and non-commercial) or GPLv3 (`@fullcalendar/resource-timeline@6.1.22` LICENSE.md).
- **Dual licensing needs contributor paperwork.** To sell commercial exceptions, the owner must hold, or have a license to, every contributor's code. That means a CLA or copyright assignment, which deters contributors. CKEditor's LICENSE notes that outside work is included "with their express permission."
- **Delayed open source only blocks competitors.** FSL's "Competing Use" covers making the software available "in a commercial product or service" that substitutes for it ([FSL text](https://fsl.software/FSL-1.1-MIT.template.md)). Everyone else, including a large enterprise shipping Dotquilt in its app, uses it free. So FSL or BSL protects against a cloned Dotquilt but doesn't produce revenue, and it still carries the non-OSI review cost. Sentry moved from BSL to FSL because BSL's 4-year default was too long and its variable grants made "compliance review difficult" ([Sentry, 2023-11-17](https://blog.sentry.io/introducing-the-functional-source-license-freedom-without-free-riding/)).
- **Size-gated licenses have three costs.** You have to write a custom license, because PolyForm SB's thresholds are fixed in its text. You have to define headcount: Remotion combines agency and client headcount when the client operates the project ([Remotion FAQ](https://www.remotion.dev/docs/license/faq)). And you need some way to detect unlicensed users: Remotion's client-side rendering telemetry "can't be disabled", and Remotion 5.0 makes telemetry mandatory for Automators customers ([Remotion FAQ](https://www.remotion.dev/docs/license/faq)). For a loader inside other people's apps, telemetry would clash with Dotquilt's SSR, CSP and privacy goals.
- **Relicensing later is one-way.** Once an MIT version is public it stays MIT. Moving later versions to a stricter license invites a fork of the last MIT release. (General principle. The well-known BSL and SSPL relicensings of server products, and the forks that followed, are outside this report's scope and weren't re-verified.) Because Dotquilt is unpublished, it doesn't face that risk today.

### 1.3 How npm users and company tooling see the `license` field

- npm wants an SPDX expression. Otherwise it wants `"SEE LICENSE IN <filename>"` for custom licenses, or `"UNLICENSED"` for packages that grant no rights ([npm package.json docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)).
- What comparable packages declare today (npm registry, 2026-11-19):

| Package | Version | `license` field |
|---|---|---|
| `remotion` | 4.0.545 | `SEE LICENSE IN LICENSE.md` |
| `tldraw` | 5.6.1 | `SEE LICENSE IN LICENSE.md` |
| `@mui/x-data-grid-pro` | 9.18.0 | `SEE LICENSE IN LICENSE` |
| `ag-grid-enterprise` | 36.3.0 | `Commercial` |
| `ckeditor5` | 49.1.0 | `SEE LICENSE IN LICENSE.md` (GPL-2.0+ or commercial) |
| `tinymce` | 8.10.2 | `SEE LICENSE IN license.md` (GPL-2.0+ or commercial) |
| `@fullcalendar/resource-timeline` | 6.1.22 | `SEE LICENSE IN LICENSE.md` (commercial / CC BY-NC-ND / GPLv3) |
| `handsontable` | 18.1.2 | `SEE LICENSE IN LICENSE.txt` (non-commercial or evaluation, else commercial; never "competitive" software) |
| `@amcharts/amcharts5` | 5.22.0 | `SEE LICENSE IN LICENSE` (free with logo) |
| `motion` | 14.14.0 | `MIT` |

- **Automated gates.** GitHub's `dependency-review-action` fails a PR when a new dependency's license isn't on the `allow-licenses` list. It only warns when it can't detect a license ([action README](https://github.com/actions/dependency-review-action)). In practice, any `SEE LICENSE IN` package goes to a human reviewer at companies that use allow-lists.

### 1.4 Ecosystem examples

| Product | Model | Free tier | Paid tier and unit | Enforcement | Source |
|---|---|---|---|---|---|
| **Remotion** | Custom source-available, size-gated | Individuals, for-profits with ≤3 people, non-profits, evaluation | Creators $25/seat/month; Automators $0.01/render, $100/month minimum; Enterprise from $500/month | Honor system, render reporting, mandatory client-side telemetry | [pricing](https://www.remotion.dev/docs/license/pricing), [LICENSE](https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md), [FAQ](https://www.remotion.dev/docs/license/faq) (2026-11-19) |
| **tldraw SDK** | Proprietary; free with watermark | Hobby license (reviewed case by case; "made with tldraw" watermark); 100-day trial | Business license through sales; **[unverified]** ~$6,000/year for teams under 10 | Signed key checked offline; without a key in production the SDK "stops rendering the editor" after 5 s; keys are host-bound | [license key docs](https://tldraw.dev/sdk-features/license-key), [pricing](https://tldraw.dev/pricing), [LICENSE](https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md) |
| **amCharts 5** | Linkware plus commercial | Free for any use, including commercial, if the branding link stays visible | Per developer seat per product; Basic / SaaS / OEM / Extended OEM; subscription or perpetual (minor updates for life, majors for 1 year) | Visible logo | [LICENSE](https://raw.githubusercontent.com/amcharts/amcharts5/master/LICENSE), [licenses explained](https://www.amcharts.com/online-store/licenses-explained/) |
| **Sidekiq** | LGPL OSS plus commercial Pro/Enterprise | OSS (LGPL) | Pro $99/month or $995/year, unlimited servers per organization; Enterprise from $269/month per 100 threads; Appliance (redistribution) $14,995/year | Private gem server with per-customer credentials; Enterprise "phone[s] home daily" | [sidekiq.org](https://sidekiq.org/), [Commercial FAQ](https://github.com/sidekiq/sidekiq/wiki/Commercial-FAQ) |
| **AG Grid Enterprise** | MIT community plus proprietary EULA | Community | Per developer (counts every JS developer on the UI). **[unverified]** $999/developer perpetual with 1 year of updates. A "Deployable Licence" is needed for external apps | License key; without one, watermark and console warnings | [EULA](https://www.ag-grid.com/eula/AG-Grid-Enterprise-License-Latest.html), [pricing](https://www.ag-grid.com/license-pricing/), [license install](https://www.ag-grid.com/javascript-data-grid/license-install/) |
| **MUI X** | MIT community plus Pro/Premium EULA | Community (MIT) | Pro $299, Premium $599 per developer per year, or perpetual with 12 months of maintenance. Seats = peak concurrent front-end developers | Public key checked offline; watermark and console warning when missing or expired; development-only telemetry | [licensing](https://mui.com/x/introduction/licensing/), [pricing](https://mui.com/pricing/), [EULA](https://mui.com/legal/mui-x-eula/) |
| **Tailwind Plus** | Proprietary UI kit | None (Catalyst is separate) | Personal or Team license; unlimited end products including client work | Account, honor system. No public repos of components; no giving access away as a bonus | **[unverified]**: [license page](https://tailwindcss.com/plus/license) served our fetcher a login screen; terms come from search snippets of that page |
| **Motion+** | Paid access; FAQ says the code is MIT | Motion core (MIT) | **$399 one-time per developer** with "lifetime updates"; teams billed yearly per seat | Private GitHub repo invites; refund only if GitHub isn't linked yet | [motion.dev/plus](https://motion.dev/plus), [terms (updated 2026-02-20)](https://motion.dev/plus/terms). **Inconsistent:** the FAQ says "licensed under MIT", but the terms forbid redistributing or reselling source "as a standalone library or competing product". A "Builder's Licence" is needed if your product resells Motion+ capabilities |
| **n8n** | Sustainable Use License plus Enterprise | Internal and personal use | Enterprise features in `.ee` files | License | [LICENSE](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md) |
| **Sentry** | FSL (Fair Source) | Everything except competing | SaaS revenue | None needed | [fsl.software](https://fsl.software/), [fair.io companies](https://fair.io/companies/) (14 listed companies, e.g. Sentry, GitButler, Keygen, PowerSync) |
| **MariaDB (BSL author)** | BSL 1.1 | Non-production plus grant | Commercial license | License | [mariadb.com/bsl11](https://mariadb.com/bsl11/) |
| **Elastic** | ELv2 (and others) | Self-managed use | Cloud and subscriptions | License-key features | [ELv2](https://www.elastic.co/licensing/elastic-license) |

---

## 2. How commercial UI kits word their licenses

### 2.1 Licensing unit

| Unit | Who uses it | Notes |
|---|---|---|
| **Per developer seat** | MUI X ("concurrent developers contributing changes" to front-end code), AG Grid (all front-end devs on the project), amCharts (per seat, per product; seats pass to the next developer), Motion+ (one-time per developer) | Easy to explain and scales with the buyer's size. MUI X and AG Grid define seats precisely to stop undercounting. |
| **Per user tier** | Untitled UI: Solo (1), Studio (≤8), Business (≤20), Enterprise (unlimited, separate EULA from 2026-06-14) | Simple tiers, no counting disputes ([Untitled UI license](https://www.untitledui.com/license)) |
| **Per organization / unlimited** | Sidekiq Pro ("no limit to the number of servers or environments"); unlimited tiers | Good for B2B and procurement |
| **Per end product** | Envato Regular / Extended: one end product; Extended needed "if the end user must pay"; can't reuse one license "on multiple clients or jobs" ([Envato](https://themeforest.net/licenses/standard)) | Marketplace-style and hard to audit. Rare among developer libraries. |
| **Usage-based** | Remotion Automators ($ per render), Sidekiq Enterprise (threads) | Fits server workloads only |

### 2.2 Recurring clauses (plain words)

- **End products, unlimited:** Untitled UI allows unlimited end products for you or your clients, personal or commercial. An end product must not let third parties "access, extract, or reuse" the original assets.
- **Client work:** allowed almost everywhere. Envato needs one license per client job. Dotquilt's approved policy already allows the purchaser and collaborators to build client products, and lets clients receive and maintain them.
- **SaaS:** allowed by Untitled UI, including products sold "as a one-time fee or a subscription". MUI X allows third parties to use it only inside "a larger software product or service developed by or for the Licensee". Sidekiq's default license allows SaaS but not distribution (Appliance license for that).
- **Templates and themes for resale: forbidden.**
  - Untitled UI: "Use Products in any form of UI kit, design system, code library, template, or builder intended for resale."
  - Tailwind Plus: no themes, UI kits or page builders **[unverified, snippet]**.
  - Envato: not in "stock items/templates".
- **Competing products: forbidden.**
  - MUI X EULA 8.2: no product with a "substantially similar purpose" (component libraries, no-code tools).
  - AG Grid 3.7(b): apps may not be a "development toolkit, library, wrapper, application builder".
  - Handsontable: never "software which may be considered competitive".
- **Builders and no-code tools need a separate license.**
  - Untitled UI bans "an app or website builder" that includes its components.
  - Motion+ needs a "Builder's Licence".
  - amCharts' Extended OEM covers "software development tools".
- **Redistributing source and public repos: forbidden.**
  - Untitled UI: don't "Expose raw Untitled UI React source code in any product".
  - Tailwind Plus: no public repository of components **[unverified, snippet]**.
  - Motion+: no redistributing or bundling as a standalone library.
  - AG Grid 3.8: source not available to customers.
- **Account sharing and group buys: forbidden.** Untitled UI may terminate immediately.
- **Updates.** Common patterns:
  - Perpetual use plus 12 months of updates: MUI X perpetual, AG Grid, amCharts majors.
  - Lifetime updates: Motion+ (individuals).
  - No promise at all: Untitled UI says it "is not obligated to provide updates".
  - Annual licenses that keep working in production for versions released during the term: MUI X annual.
- **Refunds.** Motion+ allows a 14-day refund unless GitHub was linked or source accessed. Linking counts as accessing digital content and waives the EU withdrawal right ([Motion+ terms](https://motion.dev/plus/terms)). The underlying EU rule is the digital-content exception in Directive 2011/83/EU art. 16(m) ([EUR-Lex](https://eur-lex.europa.eu/eli/dir/2011/83/oj)). It needs the consumer's express consent and acknowledgement, which a merchant of record's checkout normally collects **[verify with the chosen merchant]**.

---

## 3. Enforcement options for front-end code

The core problem is that the code runs in someone else's browser. Any check can be patched out, and the key ships in the bundle. MUI X says outright that its key "is designed to be public" and is checked "without making any network requests". Enforcement therefore really targets **honest companies that want to stay compliant**, and those are the buyers anyway.

| Option | How it works | Cost to build and run | Strength | Effect on users | Fit with Dotquilt |
|---|---|---|---|---|---|
| **Honor system** | License text plus clear pricing page; no technical gate | ~0 | Weak technically, but B2B buyers comply | None | Fits. Sidekiq's commercial license and Remotion's free tier are honor-based. |
| **Signed license key checked in the client** | Key signed offline and verified in JS. Missing or invalid key gives a watermark or console warning (MUI X, AG Grid) or a hard stop (tldraw stops rendering after 5 s and binds keys to hosts) | Days to build; ongoing support for "my key doesn't work"; key-issuing backend or merchant license keys | Deters companies; trivially bypassed | Adds setup steps, bundle bytes and support load. SSR and hydration edge cases. | **Policy conflict** ("no runtime license check"). Also adds bytes against size budgets. |
| **Watermark / attribution** | Free use requires a visible mark (amCharts logo, tldraw hobby) | Small | Medium where the output is persistent and central | On a loader, the mark flashes during loading. It must be `aria-hidden`, and it damages the "serious, refined" brand. | Poor. Low pressure to pay, high brand cost. |
| **Console warnings** | Nag in devtools | Tiny | Very weak | Annoys developers; flagged in some CI logs | Poor |
| **Usage telemetry** | Report domains or renders (Remotion client rendering, Sidekiq Enterprise, MUI X dev-only) | Backend plus privacy work (GDPR notice, CSP allow-list) | Medium | Privacy objection; blocked by CSPs | **Policy conflict**; bad fit for an a11y/SSR/CSP-focused library |
| **Private npm registry: npm Teams** | Private scoped packages | $7 **per org member** per month ([npmjs.com/pricing](https://npmjs.com/pricing); page returned 403 to our fetcher, figure from search snippets of npm's pricing page and docs); installers must be on a team with read access ([npm docs](https://docs.npmjs.com/about-private-packages)) | Strong per install | Each *customer* would need to be an org member, which doesn't scale | Not suitable for selling to customers |
| **Private registry: GitHub Packages** | npm registry on GitHub; consumers need a token | Private packages: 500 MB / 1 GB transfer free (Free), 2 GB / 10 GB (Pro/Team), overage per GB ([GitHub billing docs](https://docs.github.com/en/billing/concepts/product-billing/github-packages)) | Medium | Every buyer needs a GitHub account and token | Workable but clunky |
| **Private registry: Cloudsmith** | Per-customer read-only "entitlement tokens"; restrict by package, date range and download count ([Cloudsmith docs](https://docs.cloudsmith.com/software-distribution/entitlement-tokens)) | **[unverified]** pricing (page returned HTTP 429) | Strong and revocable per customer | `.npmrc` token setup | Good for a package; overkill for templates |
| **Private registry: Gemfury** | Hosted private npm | From $9/month (1 collaborator) to $650/month (Team 450P) ([fury.co](https://fury.co/pricing)) | Medium | `.npmrc` token | Cheap but tokens are per account, not per customer **[unverified]** |
| **Own token registry** | e.g. Font Awesome Pro: `npm.fontawesome.com` with a per-account "Package Token" ([FA docs](https://docs.fontawesome.com/web/setup/packages)) | Run a registry such as Verdaccio plus auth | Strong | `.npmrc` token in CI | Ops burden for a solo developer |
| **Authenticated shadcn registry** | Copy-in components via `components.json` with `Authorization: Bearer ${TOKEN}`; the server returns 401 or 403 ([shadcn docs](https://ui.shadcn.com/docs/registry/authentication)) | Small serverless endpoint plus a token per buyer (e.g. merchant license key) | Strong at download time | Natural for "copy the screen into your app"; no runtime dependency | Good fit for Pro *templates*. Keeps "no runtime check". |
| **Private GitHub repo invite** | Buyer's GitHub user is added as a read collaborator (Motion+, Polar benefit) | Polar automates invites. GitHub may bill collaborators as seats unless the org is on the free plan ([Polar docs](https://polar.sh/docs/features/benefits/github-access)) | Strong at access time; the buyer can still clone | Familiar to developers; updates via `git pull` | Good fit |
| **Download archive** | Versioned zip delivered by the merchant (Polar, Gumroad) | ~0 | Access only | Simplest | Matches the approved "versioned source archive" |

**Practical answer.** Gate **delivery** (archive, repo invite or registry token, per customer and revocable), never **runtime**. Leaks are handled by license terms, DMCA takedowns of public copies ([GitHub DMCA policy](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy)) and a registered trademark on the name. The name protection is general practice; registration costs vary by country and weren't researched here.

---

## 4. Payments and tax

### 4.1 Why a merchant of record (MoR)

- **EU VAT.** A seller established outside the EU owes VAT in the customer's member state from the **first** B2C sale. The €10,000 threshold applies only to sellers established in one EU member state ([Commission VAT e-commerce explanatory notes](https://vat-one-stop-shop.ec.europa.eu/system/files/2021-07/vatecommerceexplanatory_notes_28102020_en.pdf)). Doing this yourself means registering for the **non-Union OSS** in one member state and filing quarterly returns, including nil returns ([EU OSS portal](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/declare-and-pay-oss_en)). B2B sales are generally reverse-charged.
- **UK VAT.** Non-UK sellers of digital services to UK consumers must register with no threshold ([gov.uk](https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-consumers)) **[not re-verified today]**.
- **US sales tax.** Since *South Dakota v. Wayfair* (2018), states can require out-of-state sellers to collect tax once they pass economic-nexus thresholds, often $100,000 in sales ([opinion](https://www.supremecourt.gov/opinions/17pdf/17-494_j4el.pdf)). Thresholds and digital-goods taxability vary by state **[check per state]**.
- **What an MoR does.** It becomes the legal seller. It calculates, collects, files and remits these taxes, and handles fraud, chargebacks and buyer support. For a solo developer selling worldwide this removes nearly all tax administration, at roughly 2–4 points more than raw Stripe.

### 4.2 Provider comparison (fees read 2026-11-19)

| Provider | MoR? | Fee (as published) | Extra fees | License keys | File / repo delivery | Seller eligibility | Notes |
|---|---|---|---|---|---|---|---|
| **Paddle** | Yes | **5% + 50¢** per transaction ([pricing](https://www.paddle.com/pricing)) | None listed. Products under $10: contact for bespoke pricing | No native key service in Paddle Billing **[unverified]**; fulfilment webhooks or a static code list are documented ([order fulfilment](https://developer.paddle.com/webhook-reference/order-fulfilment)), but may be Paddle Classic | Bring your own (webhook to your delivery) | Everywhere except a sanctions-style list ([Paddle countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)) | "Exclusively" SaaS and digital products. Whether **templates/UI kits are accepted is [unverified]**, so confirm in onboarding |
| **Polar** | Yes | Starter (orgs created on or after 2026-05-27): **5% + 50¢**. Pro $20/month: 3.8% + 40¢. Growth $100/month: 3.6% + 35¢. Scale $400/month: 3.4% + 30¢ ([fees](https://polar.sh/docs/merchant-of-record/fees)) | **+1.5% non-US cards**; $15 per dispute; payouts via Stripe: $2/month active + 0.25% + $0.25 per payout; FX 0.25–1%. Fees aren't returned on refunds | **Built in**: prefixes, expiry, activation and usage limits, rotation, validate endpoint ([docs](https://polar.sh/docs/features/benefits/license-keys)) | **Built in**: file downloads; **GitHub private-repo invites** (lifetime access on one-time purchase) ([docs](https://polar.sh/docs/features/benefits/github-access)) | Payouts to ~120 countries via Stripe Connect Express ([list](https://polar.sh/docs/merchant-of-record/supported-countries)) | Acceptable use names "Templates, … code, icons, fonts, design assets" and "License Keys, File Downloads" ([AUP](https://polar.sh/docs/merchant-of-record/acceptable-use)). Younger company |
| **Stripe Managed Payments** | Yes (Stripe) | Stripe Payments fees **+ 3.5%** ([stripe.com/pricing](https://stripe.com/pricing)) | Standard Payments surcharges (international +1.5%, FX +1%) presumably apply **[assumed]** | **No** ("doesn't deliver files, license keys, or download links") ([LS migration docs](https://docs.lemonsqueezy.com/migration)) | No | Sellers only in US, CA, the EU/EEA, CH, GB, AU, HK, JP, SG ([eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)) | Digital products only. Customers in 195+ countries. Software and downloadable-software tax codes are supported |
| **Stripe + Stripe Tax** (you are the seller) | **No** | 2.9% + 30¢ (US domestic cards) | +1.5% international, +1% FX; Stripe Tax 0.5% per transaction where registered (no-code), or $0.50 per transaction (API); Tax Complete from $90/month ([pricing](https://stripe.com/pricing)) | No (bring your own, e.g. Keygen) | No | Stripe-supported countries | Cheapest per sale, but **you** register, file and carry the liability for VAT/GST and US sales tax |
| **Gumroad** | Yes (since 2025-01-01) | **10% + $0.50 + sales tax**, *not including* card processing **2.9% + $0.30** or PayPal fees. Discover marketplace: 30% all-in. Over $20k in a calendar month: 5% + $0.50 ([fees](https://gumroad.com/help/article/66-gumroads-fees), [pricing](https://gumroad.com/pricing)) | — | **Built in** (`/v2/licenses/verify`, multi-seat keys; "enforcement is completely up to the creator") ([help](https://gumroad.com/help/article/76-license-keys)) | Built in (downloads) | Broad **[not checked]** | Most expensive; simplest storefront |
| **Lemon Squeezy** | (was) | 5% + 50¢ (historical) | — | — | — | **Closed to new sign-ups 2026-11-16; processing stops 2027-03-31** ([blog](https://www.lemonsqueezy.com/blog/saying-goodbye-to-lemon-squeezy), [migration](https://docs.lemonsqueezy.com/migration)) | **Not an option.** Migrations go to Stripe Managed Payments at a promotional 1.5% MoR rate until 2027-12-01 (per search summary of the LS docs) |
| **Keygen** (license server only) | n/a | Dev tier free (100 active licensed users); paid tier prices didn't load; self-hosted CE free ([pricing](https://keygen.sh/pricing/)) | — | Yes, including offline licenses | — | — | Only needed if a license key is wanted with Stripe or Paddle |

### 4.3 Fees on one sale

These are illustrations. They assume the fee applies to the pre-tax price; whether MoR fees apply to the tax-inclusive total is **[unverified]**. Payout and FX fees are excluded.

| Provider | Fee on $99 (US card) | Fee on $99 (non-US card) | Fee on $299 (US) | Fee on $299 (non-US) |
|---|---|---|---|---|
| Paddle | $5.45 | $5.45 | $15.45 | $15.45 |
| Polar Starter | $5.45 | $6.94 | $15.45 | $19.94 |
| Polar Pro (+$20/month) | $4.16 | $5.65 | $11.76 | $16.25 |
| Stripe Managed Payments | $6.64 | $8.12 | $19.44 | $23.92 |
| Stripe + Stripe Tax (not an MoR) | $3.67 | $5.15 | $10.47 | $14.95 |
| Gumroad (direct) | $13.57 | $13.57+ | $39.37 | $39.37+ |

Polar Pro pays for its $20/month at about **16 sales per month** of $99 (it saves $1.29 per US-card sale).

### 4.4 Choosing a provider

1. **Check eligibility first.** Each provider reviews the seller's country and the product category. Stripe Managed Payments only accepts sellers in about 37 countries. Paddle and Polar are much broader. Confirm where Dotquilt's selling entity is registered.
2. **Polar fits best on features for a one-person Pro bundle.** Archive download, GitHub repo invite and a license key (usable as a registry token) all come without extra infrastructure. The trade-offs are +1.5% on non-US cards and a younger company.
3. **Paddle is the established alternative** with a flat 5% + 50¢. Delivery would have to be built yourself (webhook, then a signed download link or repo invite), or via Keygen.
4. **Avoid Lemon Squeezy** (shutting down). Use Gumroad only for speed, since it costs about 2.5× Paddle. Use raw Stripe only after deciding to handle VAT OSS and US sales tax yourself.

---

## 5. Models for Dotquilt

### 5.1 Recommendation matrix

Ratings are relative judgements for *this* product: a polish-level UI library with many free MIT substitutes. They are not forecasts.

| Model | What is free / paid | Adoption effect | Revenue potential | Enforcement cost | Legal / admin overhead | Policy fit |
|---|---|---|---|---|---|---|
| **A. MIT core + commercial Pro bundle** (recommended) | All nine components, adapter, docs and playground free (MIT). Pro sells screens, motion packs and tools | **Best.** MIT clears every scanner and competes head-on with free MIT loaders | Low to moderate. Depends on Pro's own value, not on locking the core | Low: honor system plus per-customer delivery | Low: one plain commercial license, MoR handles tax | Matches the approved policy and the 2026-11-19 decision |
| **A′. MIT core + Pro *components* with key and watermark** (MUI X / AG Grid pattern) | Same, plus premium runtime components that need a key | Good for the core; Pro adds friction | Moderate. Works for MUI X and AG Grid because grids are mission-critical; loaders aren't | Medium: key issuing, offline check, support | Medium: EULA with seat counting | **Policy conflict** (runtime check; gating loaders beyond the nine) |
| **B. Source-available, free for small, paid for large** (Remotion-style or PolyForm Small Business) | Whole library free under N people or $M revenue; paid above | **Poor to moderate.** Non-OSI, so legal review at every company that might pay; individuals unaffected | Moderate *in theory*, but buyers self-assess and front-end use is invisible | **High**: no way to see who uses it without telemetry, which is unacceptable here | High: custom license, headcount definitions, agency/client rules, disputes | **Policy conflict** (core not MIT) |
| **C. Dual license GPL or AGPL + commercial** (CKEditor, TinyMCE, FullCalendar Premium) | Free under GPL; paid for closed-source apps | **Poor.** Google-style policies restrict GPL and ban AGPL; closed-source apps must pay or switch to a free MIT loader, which is easy | Moderate for hard-to-replace products, **low for loaders** | Low to medium (honor system plus license) | Medium to high: CLA for contributors, two license tracks, GPL-compliance questions | **Policy conflict** |
| **D. Free with watermark, paid to remove** (tldraw hobby, amCharts) | Full library free with a visible "Dotquilt" mark | Medium. People who mind the mark leave for MIT alternatives | Low. The mark only shows during loading, so there's little pressure to pay | Medium: watermark code, key to remove it, support | Medium | **Policy conflict**; damages the "serious, refined" brand |
| **E. FSL / BSL / Fair Source core** | Free for everyone except competing products; MIT after 2 years (FSL) | Moderate penalty (non-OSI review) | **~None.** Only stops clones; ordinary users never pay | Low | Low to medium | **Policy conflict**; doesn't address the goal of earning money |
| **F. PolyForm Noncommercial core + commercial license** | Free for hobby and non-profit only | **Very poor.** Every company must buy before trying; Google bans non-commercial code | Low (small funnel) | Medium | Medium | **Policy conflict** |

### 5.2 What it takes to earn a given amount

Net per sale is after Paddle-style 5% + 50¢. These figures only show the sales volume each target needs; they don't predict demand.

| Target per year | At $99 (net ≈ $93.55) | At $299 (net ≈ $283.55) |
|---|---|---|
| $10,000 | ~107 sales | ~36 sales |
| $50,000 | ~535 sales | ~177 sales |

The approved policy's discovery thresholds (10 conversations, 5 independent prospects with the same problem, 3 written non-binding purchase intents) are the right check before believing any of these volumes.

### 5.3 Recommended model

**Model A, refined.**

1. **Core stays MIT.** Publish under MIT as planned. A non-MIT core would cost far more in adoption than it could earn, given the free MIT loaders with 1M+ weekly downloads. Optionally register the **Dotquilt** name as a trademark, so forks can't trade on it. MIT doesn't grant trademark rights.
2. **Pro license.** A short custom commercial license (draft outline below), sold through a merchant of record.
3. **Pricing shape.** One-time purchase in seat tiers: Solo (1 developer), Team (up to ~10), Company (unlimited developers in one organization). Use is perpetual for versions received, with 12 months of updates and optional discounted renewal. Comparable products: Motion+ $399 one-time per developer, MUI X Pro $299 per developer per year, Untitled UI's Solo/Studio/Business/Enterprise tiers. The $99/$299 launch guess sits at the low end of these, which is sensible for a first experiment.
4. **Enforcement.** Use the honor system, and gate delivery per customer (archive download, private GitHub repo or authenticated shadcn-style registry), with no runtime checks, keys in bundles or watermarks. Handle leaks with DMCA takedowns.
5. **Payments.** Polar (built-in keys, downloads and repo invites) or Paddle (established, flat fee). The final pick depends on the seller-country check and account approval. Lemon Squeezy is not an option.
6. **Later, if demand shows up:**
   - a **Builder / OEM** license for no-code builders and design tools (Untitled UI, Motion+ and amCharts all do this);
   - an **Enterprise** tier with invoice billing, procurement forms and custom terms.

### 5.4 Draft outline of the Dotquilt Pro license (plain words, not legal drafting)

1. **What this covers.** Only the files sold as Dotquilt Pro: screens, motion packs, tools and their docs. The free Dotquilt packages stay under MIT, and nothing here changes that. Third-party files inside Pro keep their own licenses, listed in a NOTICE file.
2. **Who is licensed.**
   - **Solo:** one named developer.
   - **Team:** up to N developers in one organization.
   - **Company:** any number of developers in one organization and its staff.
   - A "developer" is someone who writes or changes code that uses Pro files. Seats can be reassigned when someone leaves. Contractors working for the licensee count as seats while they work on its products.
3. **What you can do.**
   - Use, change and combine Pro files in **unlimited end products**, commercial or not: websites, web and mobile apps, SaaS, internal tools.
   - Ship Pro code to end users **in built form inside your end product**. Note for Web Components: browsers download the code, and source maps may expose it. That incidental exposure is allowed.
4. **Client work.**
   - You may build end products for clients.
   - The client may receive, own and keep maintaining the delivered end product, including the Pro files inside it.
   - The client may not reuse those Pro files in *other* products without their own license.
5. **What you can't do.**
   - Resell, share, sublicense or publish Pro files, original or changed, on their own. That includes public repositories, npm packages and template marketplaces.
   - Use Pro files to make a competing product: a UI kit, template pack, loader or animation library, or design system for sale or free distribution.
   - Put Pro files into a site or app builder, no-code tool, theme marketplace or AI generator that lets *its* users create their own UIs with them. That needs a separate Builder license.
   - Share accounts, download links or tokens outside the licensed seats. No "group buys".
   - Optional clause, check enforceability with counsel: no using Pro files to train or tune AI models that generate similar assets.
6. **Open-source end products.** Allowed only if the Pro source isn't published in reusable form. Ship built output, or ask for permission. This mirrors Tailwind Plus and Untitled UI.
7. **Updates and access.**
   - You keep using every version you received, forever.
   - New releases come for 12 months from purchase.
   - Downloads stay available for that window plus 30 days.
   - Renewal is optional. Not renewing never disables anything already received: no runtime lock, no key in your build.
8. **Support.** 30 days of async help to set up one integration, and defect fixes during the update window. No SLA, no custom work.
9. **Refunds.** Offer a 14-day refund window, but buyers who download, open the repo or use a token right away should confirm at checkout that they lose the EU withdrawal right. Wording is to be aligned with the merchant's checkout and verified for consumer law.
10. **If you break the rules.** You get written notice and 30 days to fix it. PolyForm uses 32 days ([PolyForm SB "Violations"](https://github.com/polyformproject/polyform-licenses/blob/1.0.0/PolyForm-Small-Business-1.0.0.md)). Otherwise the license ends and you must stop using Pro files in *new* work. Whether existing shipped products may stay live after termination is a decision for counsel.
11. **Standard terms.** Provided "as is". Liability capped at the price paid. Governing law and venue for counsel to choose. The license is non-transferable except with the sale of the licensee's business.
12. **No audit, no telemetry.** Compliance is on trust. Put that in writing; it is also a selling point.

### 5.5 Open questions for the owner (and for counsel)

- **Seller entity and country.** This decides which merchants of record are available (Stripe Managed Payments only covers about 37 seller countries) and which consumer and tax law applies to the license.
- **Team tier size and Company price**, plus whether a Builder license is offered at launch or later.
- **Delivery channel:** zip archive, private GitHub repo (GitHub seat costs on paid org plans), or authenticated registry. The approved policy says customer builds must not depend on a private registry, so a registry should be a convenience for *fetching*, not a build dependency.
- **Trademark registration** for "Dotquilt": where and when.
- **Whether to drop the optional AI clause**, depending on counsel's view of enforceability.

---

## 6. Why not the alternatives (one line each)

- **Remotion-style size gate:** works for a video *tool* that companies run and can be measured with telemetry. A loader inside a customer's app can't be measured without telemetry, and this one shouldn't phone home.
- **AGPL/GPL + commercial:** works for editors that are hard to replace. A skeleton loader can be swapped for an MIT one in an afternoon.
- **Watermark:** works for persistent output (charts, canvases). A loader is visible for a moment.
- **FSL/BSL/Fair Source:** protects SaaS companies from clones. It doesn't make anyone pay for a UI library.
- **PolyForm Noncommercial:** turns the free product into a trial, and Google-style policies ban it.

## 7. Sources

All accessed 2026-11-19.

- **Licenses and policies**
  - OSI Open Source Definition: https://opensource.org/osd
  - OSI on SSPL: https://opensource.org/blog/the-sspl-is-not-an-open-source-license
  - SPDX license list data: https://github.com/spdx/license-list-data
  - PolyForm license texts: https://github.com/polyformproject/polyform-licenses (branch `1.0.0`)
  - FSL: https://fsl.software/ and https://fsl.software/FSL-1.1-MIT.template.md
  - Fair Source: https://fair.io/about/, https://fair.io/licenses/, https://fair.io/companies/
  - BSL 1.1: https://mariadb.com/bsl11/
  - Elastic License 2.0: https://www.elastic.co/licensing/elastic-license
  - Commons Clause: https://commonsclause.com/
  - n8n: https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md
  - Sentry FSL post: https://blog.sentry.io/introducing-the-functional-source-license-freedom-without-free-riding/
  - Google third-party license policy: https://opensource.google/documentation/reference/thirdparty/licenses
  - Google AGPL policy: https://opensource.google/documentation/reference/using/agpl-policy
  - FSF on AGPLv3 and browser JS: https://www.fsf.org/bulletin/2021/fall/the-fundamentals-of-the-agplv3
  - npm package.json `license` field: https://docs.npmjs.com/cli/v11/configuring-npm/package-json
  - GitHub dependency-review-action: https://github.com/actions/dependency-review-action
- **Vendors**
  - Remotion: https://www.remotion.dev/docs/license/pricing, https://www.remotion.dev/docs/license/faq, https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md
  - tldraw: https://tldraw.dev/pricing, https://tldraw.dev/sdk-features/license-key, https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md
  - amCharts: https://raw.githubusercontent.com/amcharts/amcharts5/master/LICENSE, https://www.amcharts.com/online-store/licenses-explained/
  - Sidekiq: https://sidekiq.org/, https://github.com/sidekiq/sidekiq/wiki/Commercial-FAQ
  - AG Grid: https://www.ag-grid.com/eula/AG-Grid-Enterprise-License-Latest.html, https://www.ag-grid.com/license-pricing/, https://www.ag-grid.com/javascript-data-grid/license-install/
  - MUI X: https://mui.com/x/introduction/licensing/, https://mui.com/pricing/, https://mui.com/legal/mui-x-eula/
  - Motion+: https://motion.dev/plus, https://motion.dev/pricing, https://motion.dev/plus/terms
  - Untitled UI: https://www.untitledui.com/license
  - Envato: https://themeforest.net/licenses/standard
  - Tailwind Plus: https://tailwindcss.com/plus/license **[login wall; unverified]**
  - CKEditor: https://ckeditor.com/legal/ckeditor-licensing-options/
  - npm registry `latest` documents for the packages in §1.3; npm downloads API for §TL;DR item 2
- **Payments and tax**
  - Paddle: https://www.paddle.com/pricing, https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
  - Polar: https://polar.sh/docs/merchant-of-record/fees, https://polar.sh/docs/features/benefits/license-keys, https://polar.sh/docs/features/benefits/github-access, https://polar.sh/docs/merchant-of-record/acceptable-use, https://polar.sh/docs/merchant-of-record/supported-countries
  - Stripe: https://stripe.com/pricing, https://docs.stripe.com/payments/managed-payments, https://docs.stripe.com/payments/managed-payments/eligibility
  - Lemon Squeezy: https://www.lemonsqueezy.com/pricing, https://www.lemonsqueezy.com/blog/saying-goodbye-to-lemon-squeezy, https://docs.lemonsqueezy.com/migration
  - Gumroad: https://gumroad.com/pricing, https://gumroad.com/help/article/66-gumroads-fees, https://gumroad.com/help/article/76-license-keys
  - Keygen: https://keygen.sh/pricing/
  - GitHub Packages billing: https://docs.github.com/en/billing/concepts/product-billing/github-packages
  - npm private packages: https://docs.npmjs.com/about-private-packages
  - Cloudsmith entitlement tokens: https://docs.cloudsmith.com/software-distribution/entitlement-tokens
  - Gemfury: https://fury.co/pricing
  - Font Awesome packages: https://docs.fontawesome.com/web/setup/packages
  - shadcn registry auth: https://ui.shadcn.com/docs/registry/authentication
  - EU OSS: https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/declare-and-pay-oss_en
  - EU VAT e-commerce explanatory notes: https://vat-one-stop-shop.ec.europa.eu/system/files/2021-07/vatecommerceexplanatory_notes_28102020_en.pdf
  - Wayfair opinion: https://www.supremecourt.gov/opinions/17pdf/17-494_j4el.pdf
  - EU Consumer Rights Directive: https://eur-lex.europa.eu/eli/dir/2011/83/oj

## 8. Unverified or uncertain items

- **Tailwind Plus.** License terms and prices: the official page showed our fetcher a login screen. Details are from search-result snippets of that page.
- **tldraw.** The business-license price (~$6,000/year for teams under 10) comes from third-party sites and a search snippet. The official plans page we fetched shows no price.
- **AG Grid.** $999 per developer perpetual comes from search snippets of official AG Grid pages. The pricing page we fetched gives no number.
- **Cloudsmith.** Pricing could not be read (HTTP 429).
- **Paddle.**
  - Whether Paddle Billing (not Classic) has native license keys or file delivery is unclear.
  - Whether Paddle accepts UI kits and templates is unclear: its AUP doesn't name them.
- **Stripe Managed Payments.** Whether the +1.5% international and +1% FX surcharges apply on top of the 3.5% is assumed. The 1.5% migration promo rate comes from a search summary of Lemon Squeezy docs.
- **Fee base.** Whether merchant-of-record fees are computed on tax-inclusive totals is unknown.
- **Motion+.** The FAQ ("licensed under MIT") and the terms (no redistribution) disagree.
- **Polar.** The license-key validate endpoint's auth requirements weren't confirmed; doc examples show none.
- **UK VAT.** The rule for non-UK digital sellers wasn't re-verified today.
- **US sales tax.** Thresholds and digital-goods taxability vary by state.
- **Gemfury tokens.** Whether they can be issued per customer wasn't confirmed.
