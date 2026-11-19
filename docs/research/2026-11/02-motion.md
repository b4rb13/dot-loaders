# 02 · Motion and animation libraries: business models, licensing, websites

Research for Dotquilt's monetisation decision. All pages accessed **2026-11-19** unless a different date is given.
"(unverified)" means the claim comes only from a third party, a search snippet, or a page I couldn't load directly.

**How traction was measured**
- npm weekly downloads come from `api.npmjs.org/downloads/point/last-week/<pkg>` for the window **2026-11-11 to 2026-11-17**.
- GitHub stars, license and last push come from the GitHub REST API, read on 2026-11-19.
- Download counts include CI and mirrors. Read them as relative scale only.

---

## 1. Motion (formerly Framer Motion) and Motion+

### Free vs paid, licenses
- **Core:** the `motion` / `framer-motion` library is MIT. Source: https://github.com/motiondivision/motion (GitHub license field: MIT).
- **Motion+** is a paid membership. It includes:
  - 520+ example source files and 110+ tutorials
  - "Motion UI": 50 animated sections plus components such as Carousel, Ticker, Cursor, AnimateNumber, AnimateText, Typewriter, ScrambleText and splitText
  - AI Kit: examples search, a CSS spring generator, an MCP transition editor and "Performance Doctor"
  - Motion Studio, a visual editor that applies changes through a local agent
  - early access, a private Discord and a private GitHub

  Source: https://motion.dev/plus
- **License of the paid code:** the Motion+ FAQ says "Motion+ APIs and examples are licensed under MIT, so once you've added code to your site, it's yours forever." What you pay for is *access*, not a restrictive license. If your product "effectively resells Motion+ capabilities", you need a separate **Builder's Licence** (contact sales; terms not public). Source: https://motion.dev/plus (FAQ JSON-LD).
- **Motion Cloud** is a separate yearly subscription. It covers Ultramotion, an AI animation-editing agent in Studio, and Performance Guard, which checks animation performance on PRs. Signed-in accounts get 5 free Ultramotion prompts a month. Source: https://motion.dev/cloud
  - The stated principle: "Motion Cloud runs on our servers every time you use it, so it's a subscription." Motion+ is "code you download and keep", so it is one-time.

### Pricing (accessed 2026-11-19)
- **Motion+ individual:** **USD 399, one-time**, "Pay once for each developer, keep it forever". The visible price is rendered client-side. The figure comes from the page's schema.org Offer (`"price":"399","category":"OneTime"`). Source: https://motion.dev/plus
- **Teams of two or more** are billed **yearly per seat** (1 to 50 seats on the stepper), and team seats include Motion Cloud. The per-seat price is rendered client-side and **not captured**. Source: https://motion.dev/plus
- **Motion Cloud price:** not captured (client-rendered). Source: https://motion.dev/cloud
- **Price history:** Motion+ launched at **€299** within days of independence in November 2024. Matt Perry describes the strategy as "Keep the price steady, keep rolling in value." Source: https://motion.dev/blog/motion-independence-one-year-in-review (dated 2025-11-17)
- **Refunds and discounts:** a full refund within 14 days, *only if you haven't linked GitHub or accessed the source*. PPP and student discounts are available on request. Source: https://motion.dev/plus
- **Sponsorship tiers:**
  - corporate: €249, €999 and €2,499 per month
  - individual: €10 and €25

  Source: one-year review (above). The sponsor page lists Silver (Motion+ for 3 seats plus logo), Gold (Motion+ for the whole team plus a homepage logo) and Platinum (footer logo); amounts are client-rendered. Source: https://motion.dev/sponsor

### Delivery
- Motion UI installs from a private package (`motion-plus`, e.g. `import { Carousel } from "motion-plus/react"`). The docs say: "You need to be a Motion+ member to generate an access token." Source: https://motion.dev/docs/react-carousel
- Source code also lives in a private GitHub repository, which you link from your account. Source: https://motion.dev/plus (FAQ on refunds)
- The site loads the Paddle checkout script, so Paddle acts as merchant of record (observed in the page source of motion.dev).

### Funding and how Motion is backed
- **2024-11-12:** Framer Motion was spun out of Framer as the independent "Motion". Framer was the first sponsor and Tailwind the second. The library then had 4.5M+ weekly npm downloads and 110k+ monthly homepage visitors. Source: https://motion.dev/blog/framer-motion-is-now-independent-introducing-motion
- **Framer** gave 12 months of sponsorship in exchange for technical support, and the two renewed for another year. Source: the one-year review.
- **Current partners and sponsors:**
  - partners: Framer, Cursor (one-click open-in-AI examples) and Figma (code export)
  - logos: Linear, Sanity, Clerk, Liveblocks, Firecrawl, Puzzmo and Bolt.new

  Source: https://motion.dev/sponsor

### Funnel: what makes people pay (founder's own account)
From https://motion.dev/blog/motion-independence-one-year-in-review:
- **Paywalled examples drove sales.** "Motion Examples", launched in early 2025, is the main driver according to surveys.
- **Feature releases didn't.** New features produced no visible bumps in sales.
- **Cursor referrals brought traffic, not more sales.** Motion+ Cursor was "definitely a driver of sales (in terms of referrer)" but "didn't change the rate of sales".
- **Individual sponsorship "completely flopped".** After a week it had about 8 sponsors and roughly €100 a month.
- **Corporate sponsors are hard work.** They needed outreach and an internal champion, and some have since left.
- **History of earlier attempts:**
  - Popmotion peaked at about £300 a month.
  - Motion One, which was sponsor-only, earned about €1k a month until it was opened to everyone; then sponsorship "evaporated".
- **Why one-time pricing:** modelled on Tailwind Plus ("a one-time fee, lifetime membership"). A one-time price front-loads about 30 months of a €10 subscription, and people are "tired of subscriptions". "Sales just keep ticking over", although the fear is "you'll eventually run out of customers."
- **His lessons:** drop what isn't working; paywall, because people pay for concrete things; prefer one-time payments to SaaS; run a survey from day one.
- **In-docs house ads.** Docs pages carry a "Motion+ unlocks the full animation workflow… See Motion+" block (`utm_medium=house-ad`). Premium components get public docs pages; only installing them requires the token. Source: https://motion.dev/docs/react-carousel

### Website: what makes it great
- **Hero:** "The animation library loved by humans and agents alike", with an install command and interactive spring controls (Stiffness, Damping, Mass) and a timeline scrubber. Source: https://motion.dev/
- **Homepage order:** feature blocks (Layout, Gestures, Scroll, Springs), each with code and a demo, then Motion UI, the examples vault, AI Kit, Performance Doctor, Studio, a Motion+ CTA, partners, the "Made with Motion" showcase, and a **"Choose a starting point: Motion vs Motion+"** section. Motion+ appears about 4 times, with referral-tagged links. Source: https://motion.dev/
- **Examples gallery:** **526 examples**. Filters cover Tutorial, Motion+ and Favourites; platform (React, JS, Vue, Svelte, Three.js); about 28 categories; and a **"MotionScore" grade** (S to F) that rates each example's performance. Source: https://motion.dev/examples
- **Agent-first tooling:** `npx motion-ai`, AI Kit and an MCP. Source: https://motion.dev/
- **Media kit numbers on the sponsor page:** example embeds 171.9k monthly uniques; examples gallery 40k uniques; docs homepage 39.8k uniques. Source: https://motion.dev/sponsor

### Traction
- **GitHub:** 35,351 stars (motiondivision/motion).
- **npm weekly:** `framer-motion` 70,524,770; `motion` 36,219,915.
- **Revenue:** no figures published. The review says "Motion is sustainable" and that it "could have survived even if the Framer sponsorship disappeared" (one-year review, 2025-11-17).

---

## 2. GSAP (GreenSock), Club GSAP and Webflow

### License history
- **Before 2025: a non-MIT "Standard 'no charge' license".** It was free for most uses, including one-off commercial projects for a single client.
  - A **Club GSAP** membership gave three things: "members-only plugins like MorphSVG, SplitText, ScrollSmoother", "the special commercial license", and support for the project. Source: README of gsap@3.12.5, https://unpkg.com/gsap@3.12.5/README.md
  - npm `license` field at 3.12.5: "Standard 'no charge' license … Club GSAP members get more … Why GreenSock doesn't employ an MIT license".
- **GreenSock's rationale (2016-02-01).** GreenSock rejected self-funding, corporate sponsorship and VC money in favour of a "user-funded" model.
  - "An estimated 95%+ of our users never pay us a dime."
  - A "Business Green" membership, which covered unlimited projects while active, was needed only for "a rare type of commercial project".

  Source: https://gsap.com/why-license/
- **Club prices: GSAP Plus $99/year and GSAP Business $199/year (unverified).** These come from a search-engine snippet of greensock.com/club; the live page now redirects and the Wayback Machine blocked my request.
- **2024-10-15:** Webflow acquired the GreenSock business. At the time it said pricing and licensing would be "business as usual", and that GSAP powers "millions of websites". Source: https://webflow.com/blog/webflow-acquires-gsap (Last Updated October 15, 2024)
- **2025-04-30:** "GSAP 100% free for all users … including the previously paid Club plugins". Webflow also expanded the standard license to cover commercial use. Source: https://webflow.com/blog/gsap-becomes-free (Last Updated April 30, 2025). The `gsap-trial` package is now deprecated. Source: https://cdn.jsdelivr.net/npm/gsap-trial@3.13.0/README.md

### Current terms
- **The license is still not OSI open source.** It is the Standard "No Charge" license, effective 2025-04-30 and last modified 2025-05-30.
  - Webflow keeps the IP, and you may not reverse engineer GSAP to build competing products.
  - **Prohibited use:** anything that "materially assists in creating a solution that competes with Webflow's visual animation building capabilities". Ordinary sites and apps, including those of companies that compete with Webflow, are fine.

  Source: https://gsap.com/community/standard-license/
- **Repo and package fields:** the GitHub license field is null, and the npm `license` field reads "Standard 'no charge' license".
- **Pricing page:** "GSAP is now 100% free for all users, thanks to Webflow's support." The library is "maintained by the original GSAP team - working full time at Webflow". There is no paid tier. Source: https://gsap.com/pricing/

### Delivery of paid parts (historical)
- Bonus plugins were downloaded from your gsap.com account, offered as a tarball for npm/yarn, or installed from a **private npm registry** for members. `gsap-trial` let you test bonus plugins on dev domains. Source: gsap@3.12.5 README (above).
- Today every plugin ships in the public `gsap` package.

### Funnel (historical)
- **Bonus plugins** (SplitText, MorphSVG, ScrollSmoother) were the hook for individuals.
- **The commercial license** (needed only when many end users are charged) was the hook for businesses.
- **Free trial builds** let people try the bonus plugins before paying.
- **A very active forum** built trust. The money came from roughly 5% "power users" (why-license article).

### Website: what makes it great
- **Homepage:** "Animate Anything", with tool cards (Scroll, SVG, Text, UI), a "Nice and Easy Easings" section, and a **"Brands using GSAP" showcase** with a showreel and "Explore All Showcases". Source: https://gsap.com/
- **Supporting resources:**
  - a demos site (demos.gsap.com) and CodePen collections
  - forums and Discord
  - video lessons and a cheat sheet

  Sources: https://gsap.com/ and the README.
- **"Used on over 11 million sites"**. Source: https://gsap.com/resources/get-started/

### Traction
- **GitHub:** 30,910 stars.
- **npm weekly:** `gsap` 8,427,368.

---

## 3. Lottie, LottieFiles and dotLottie

### Free vs paid, licenses
- **The format and runtimes are open.**
  - `lottie-web` (Airbnb) is MIT; last push 2025-09-01. Source: https://github.com/airbnb/lottie-web
  - `dotlottie-web` is MIT. Source: https://github.com/LottieFiles/dotlottie-web
  - The dotlottie.io footer says "MIT Licensed" and "Copyright © 2026 LottieFiles". dotLottie bundles several animations, themes and **state machines** into one compressed `.lottie` file. Source: https://dotlottie.io/
- **Standardisation:** the Lottie Animation Community (LAC), a Linux Foundation project, was announced 2024-01-30, and the Lottie spec v1.0 shipped in September 2024. Sources: https://www.linuxfoundation.org/press/announcing-lottie-animation-community and https://linuxfoundation.org/press/lottie-animation-community-announces-lottie-v1.0-specification
- **Free animations** use the "Lottie Simple License".
  - Commercial use, modification and redistribution are allowed under the same terms, and attribution isn't required.
  - You may *not* compile Files "to build a similar or competing service".

  Source: https://lottiefiles.com/page/license
- **The paid product is the SaaS:** the editor (Lottie Creator), AI, hosting/CDN, the premium library and team features.

### Pricing (accessed 2026-11-19, https://lottiefiles.com/pricing)

| Plan | Price | What it adds |
|---|---|---|
| Free | $0 | Preview, test and share; free animations; basic edits |
| Individual | **$19.99/user/month, billed annually** | Editor and Creator, optimised export, 10 GB CDN, premium library, 300 AI credits/month |
| Team | **$24.99/user/month, billed annually** | Team files, version history, roles, 50 GB CDN, 600 AI credits |
| Team+ | Custom | 5 to 50 editors |
| Enterprise | Custom | SSO, audit logs, SLA |

AI credit top-ups cost $0.20 per credit.

### Delivery
- SaaS accounts for the product.
- Runtimes come from public npm (`@lottiefiles/dotlottie-*`) and native SDKs.

### Funnel
- **A huge free library pulls in search traffic.** The homepage pitches the "World's largest customizable animation library" with 800,000+ free and premium animations. Source: https://lottiefiles.com/
- **There is a dedicated loaders page** with "342 Free Loading Animations" (GIF/MP4/JSON/dotLottie), premium packs, "Generate 'loading' animation with Lottie AI" and "Hire top animators". Source: https://lottiefiles.com/free-animations/loading
- **The path:** free runtimes, then free assets, then sign-up, then the paid editor, AI, hosting and team seats. There is also a creator loop ("Publish animation", "Hire me").

### Funding and traction
- **Funding:**
  - $9M Series A, 2021-01-27, led by M12. Source: https://techcrunch.com/2021/01/27/lottiefiles-a-platform-for-the-animation-format-lands-9-million-series-a-led-by-m12-microsofts-venture-fund/
  - **$37M Series B, 2022-05-04**, led by Square Peg. At that point: 3M+ users, 135,000+ companies, 115+ employees. Source: https://lottiefiles.com/blog/inside-lottiefiles/announcing-37-million-series-b-funding
- **Now:** "16 million+ designers and developers from over 280,000 companies". Source: https://lottiefiles.com/pricing
- **npm weekly:** `lottie-web` 10,353,117; `lottie-react` 4,619,956; `@lottiefiles/dotlottie-web` 2,448,215; `@lottiefiles/dotlottie-react` 2,019,290.
- **GitHub stars:** lottie-web 32,518; dotlottie-web 951.

---

## 4. Rive

### Free vs paid, licenses
- **Runtimes are MIT** ("Copyright (c) 2020 Rive"). Source: https://github.com/rive-app/rive-runtime/blob/main/LICENSE
- The pricing page says there is "No revenue share, no runtime fees, no royalties, and MIT open-source runtimes." Source: https://rive.app/pricing
- **The editor, CLI publishing and AI agent are paid SaaS.**
  - **Free exports play a Rive splash screen**: "Upgrade to remove it."
  - CLI publishes are capped per plan: 50, 500 or 5,000 per seat per month.

### Pricing (accessed 2026-11-19, page default "Yearly" toggle; monthly rates not captured)

| Plan | Price | Notes |
|---|---|---|
| Free | $0 | Splash screen on exports, 3 collaborative files, 1 project |
| Cadet | **$9/seat/month** | Max 3 seats; no splash screen |
| Voyager | **$32/seat/month** | Max 25 seats; Libraries, embed hosting, $20/seat AI credits |
| Enterprise | **$120/seat/month** | SSO, SOC2, LTS, $40/seat AI credits |

**Revenue threshold:** companies with more than **$10M annual gross revenue**, counting parents and affiliates, must use Enterprise under the ToS. Source: https://rive.app/pricing (FAQ)

### Delivery
- Runtimes are on public npm (`@rive-app/*`).
- Editor features are account-gated.
- The marketplace (https://rive.app/marketplace) has "Featured", "Latest" and **"For hire"**; file licensing isn't stated on that page.

### Funnel
- **The path:** a free editor and free MIT runtime, then a watermark (splash screen) that pushes shipping teams to Cadet, then collaboration, libraries and AI credits, then a revenue-based Enterprise requirement.
- **Agent-first:** "Install the Rive CLI… your coding agent builds and previews Rive files" with no account needed.

### Funding and traction
- **Funding:**
  - $4M seed led by a16z. Source: https://medium.com/rive/rive-raises-4m-seed-round-led-by-andreessen-horowitz-4aeada45505c (date not checked)
  - **$10M Series A, 2023-01-17**, led by Two Sigma Ventures. Source: https://prnewswire.com/news-releases/rive-raises-10m-series-a-funding-led-by-two-sigma-ventures-301718542.html
- **npm weekly:** `@rive-app/canvas` 1,624,857; `@rive-app/react-canvas` 1,291,357; `@rive-app/webgl2` 1,097,211.
- **GitHub stars:** rive-runtime 1,265; rive-wasm 1,029.

---

## 5. Remotion (custom "Remotion License")

### License: exact terms
Source: https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md
- **Free License eligibility:**
  - an individual
  - "a for-profit organization with **up to 3 employees**"
  - a non-profit
  - anyone "evaluating … and … not yet using it in a commercial way"
- **Allowed for free users:** commercial and non-commercial use to create videos and images, and modification for your own use case.
- **Disallowed:** copying or modifying Remotion "for the purpose of selling, renting, licensing … your own derivate".
- **Company License:** required for everyone else, meaning for-profit organisations with 4 or more people.
- **It is source-available, not open source.** The FAQ says Remotion "is source-available software, but it is not open source software". Source: https://www.remotion.dev/docs/license/faq
- **How headcount is counted:** contractors and freelancers working on the same project count, and the client's headcount counts when the client operates the project. For agency work where only the finished video is delivered, only the agency counts. Sources: the FAQ, and the Remotion 5.0 change at https://github.com/remotion-dev/remotion/pull/3750 ("Contractors also count towards team size").
- **Enforcement:** self-compliance plus **telemetry**.
  - Client-side rendering telemetry is on by default and can't be disabled; Remotion "will reach out" when it sees unlicensed domains.
  - Remotion 5.0 makes telemetry mandatory for Automators customers in server-side rendering.

  Source: FAQ.

### Pricing (accessed 2026-11-19, https://www.remotion.dev/docs/license/pricing)
- **Remotion for Creators:** **$25/seat/month** (seats for people who make videos; AI agents and reviewers need no seat).
- **Remotion for Automators:** **$0.01 per render**, billed in steps of 1,000 renders ($10), **$100/month minimum**.
- **Enterprise:** from **$500/month**.
- **One-time source products** (Remotion Store): **Editor Starter $600** and **Timeline $300**. The Editor Starter is a "one-time purchase" for free-license-eligible buyers; larger companies also need the Company License. The store marks Editor Starter as a "License perk", and Enterprise includes it. Sources: https://www.remotion.dev/store and https://www.remotion.dev/editor-starter

### Delivery
- The license is bought in the dashboard. remotion.pro redirects to https://www.remotion.dev/dashboard.
- Paid starters are delivered through **access to a private GitHub repository after purchase**. Source: https://www.remotion.dev/docs/editor-starter

### Funnel
- **Everyone starts free:** individuals and companies of up to 3 build on Remotion at no cost.
- **Growth triggers the license.** When a company grows or automates, the license kicks in.
- **Source kits are a second revenue line.** The Editor Starter and Timeline are one-time source purchases.
- **Company licensing went public in 2021.** Remotion dropped "Contact us for pricing" and published self-serve pricing on 2021-03-15. Source: https://remotion.dev/blog/company-licenses

### Website: what makes it great
- **Hero:** "Make videos programmatically", with a copyable `npx create-video`.
- **Three modes:** "agentically / interactively / programmatically".
- **Pricing summary on the homepage.**
- **Stats strip:** "74K" stars, "6M+" monthly installs, "12K+" Discord members, "300+" contributors, "1200 pages of docs".
- **Showcase and Success Stories.**

  Source: https://www.remotion.dev/
- **"Before you buy" checklist** for the Editor Starter: are you a developer, React 19, Tailwind v4, TypeScript, and do you plan to fork it. Source: https://www.remotion.dev/docs/editor-starter/before-you-buy
- **An "Investors" page** that is transparent about funding. Source: https://www.remotion.dev/docs/investors

### Funding and traction
- **Funding:** CHF 241,000 raised in total (as of March 2025) from angels; the founders keep board control.
- **Profitability:** "slightly profitable" in 2024, and "grew significantly" in 2025.

  Source: https://www.remotion.dev/docs/investors
- **About page:** "More than 800 companies trust Remotion"; more than 2M videos rendered a month; "Remotion is profitable". Source: https://www.remotion.dev/about
- **2025 revenue of about $660K: (unverified)**, a GetLatka estimate. Source: https://getlatka.com/companies/remotion.dev
- **GitHub:** 74,186 stars.
- **npm weekly:** `remotion` 4,464,446; `@remotion/player` 4,156,760.

---

## 6. AutoAnimate (FormKit) and FormKit Pro

### Free vs paid, licenses
- **AutoAnimate:** MIT, © FormKit, Inc. Free, with a GitHub Sponsors ask. Source: https://auto-animate.formkit.com/
- **FormKit** (the open-source form framework) is also MIT. Source: https://github.com/formkit/formkit
- **FormKit Pro:** 14 premium inputs (Autocomplete, Datepicker, Dropdown, Mask, Repeater, Slider, Taglist and others). They are **free to use on localhost and dev domains**, and a license is required in production. Source: https://formkit.com/pro

### Pricing (accessed 2026-11-19, https://formkit.com/pro)
- **Production:** **$149 one-time**. Licensed per project and per domain; a Single Domain plan covers "1 project, 1 domain" and a Multi-Domain plan covers "1 project, unlimited domains". The price is locked at purchase.
- **Enterprise:** **from $1,250 one-time**, with no telemetry and strict CSP.
- **Pay-as-you-go:** metered billing (monthly, annual or one-time) for only the inputs you use. Prices are not listed.
- **Pro Unlimited license:** perpetual, unlimited projects and domains. You may share private npm tokens with clients. Standalone resale and public repos are forbidden. Last updated 2025-12-17. Source: https://formkit.com/terms-unlimited
- **Related products:** KickStart, an AI form generator, at $9.99/month ($8.33/month annually). A white-label edition starts at $10,000 and includes Pro Unlimited. Source: https://kickstart.formkit.com/pricing

### Delivery
- `npm install @formkit/pro`, then a **Project Key** in config.
- The Pro package sends **telemetry**: the domain plus the names of Pro inputs in use, but no form data. Only Enterprise can turn it off.

  Source: https://formkit.com/pro

### Funnel
- **AutoAnimate is a free, viral top-of-funnel.** Its site promotes FormKit; there's a "FormKit for React" callout, and a validation demo links to FormKit. The AutoAnimate page doesn't mention Pro.
- **Pro converts at deploy time.** FormKit Pro works without a key in development, and the paywall only triggers at production deploy. This is the "free in dev, pay to ship" pattern.
- **A maintainer has said agency work funds FormKit and Pro alone isn't enough (unverified).** This comes from an r/vuejs thread seen only through a mirror in search results.

### Website: what makes it great (AutoAnimate)
- **Hero:** "Add motion to your apps with a single line of code."
- **Native vs AutoAnimate demo:** a list shown side by side without and with the library.
- **Live demos** for every framework (React, Vue, Svelte, Solid, Angular, Preact, Marko).
- **A "Why not…?" comparison section.**
- **Playful copy:** "Too easy!"

  Source: https://auto-animate.formkit.com/

### Traction
- **AutoAnimate:** 13,977 stars; `@formkit/auto-animate` 2,386,888 a week.
- **FormKit:** 4,787 stars; `@formkit/pro` 25,305 a week.

---

## 7. Anime.js (v4, sponsorship)

### Free vs paid, licenses
- **License:** MIT. Source: https://github.com/juliangarnier/anime
- **Releases:** v4.0.0 published **2025-04-03**; latest v4.5.0 on 2026-06-22 (GitHub releases API).
- **No paid product.** It is funded through **GitHub Sponsors**, with sponsor-only **beta repository access**, a light sponsorware model. The page says "Open-source work isn't financially sustaining on its own". Source: https://github.com/sponsors/juliangarnier

### Sponsorship tiers (accessed 2026-11-19)

| Tier | Price/month | Benefits |
|---|---|---|
| — | $10 | Public Sponsor badge only |
| Supporter | $30 | Discord and beta repo access |
| Generous supporter | $250 | Same as Supporter |
| Silver | $750 | Small logo on homepage, docs and README (~150k impressions/month) |
| Gold | $1,500 | Medium logo, up to 10 beta seats |
| Platinum | not shown | Top-of-homepage logo (~1M impressions/month) |

- **Sponsor count:** 56 current and 405 past sponsors, against a goal of 500 monthly sponsors (11% reached). Source: https://github.com/sponsors/juliangarnier
- **Notable:** @mattgperry (Motion's author) is a current sponsor.
- **Live sponsor slots:** the platinum slot on animejs.com is an empty "Become a sponsor" placeholder, and Silver is TestMu AI. Sources: https://animejs.com/sponsors/platinum-sponsors and https://animejs.com/sponsors/silver-sponsors

### Website
- **Homepage:** "All-in-one animation engine", `npm i animejs`.
- **Docs:** organised by module (Timer, Animation, Timeline, Scope, Scroll, SVG, Draggable, Utils, Easings, WAAPI).
- **Per-module bundle size:** about 24.5 KB in total.
- **Tools and links:** an **easing editor** and a CodePen collection; v2, v3 and v4 docs stay online.

  Source: https://animejs.com/

### Traction
- **GitHub:** 74,897 stars.
- **npm weekly:** `animejs` 1,150,923.

---

## 8. Theatre.js (and what happened to it)

### Licenses
- **Runtime:** `@theatre/core` is **Apache-2.0**.
- **Editor:** `@theatre/studio` is **AGPL-3.0-only**. This is a dual license that keeps the runtime free and the editor copyleft.

  Source: npm registry metadata for both packages, version 0.7.2.

### Business model
- **Funding:** **$4.5M seed, announced 2021-12-20**, led by Joseph Jacks (OSS Capital), with angels including Amjad Masad and Sahil Lavingia. The aim was to grow Theatre.js into a broader "creative platform". Sources: https://www.theatrejs.com/blog/announcing-seed and the blog index at https://www.theatrejs.com/blog
- **No pricing, paid tier or hosted product was ever published.** The site still says "a design tool in the making". Source: https://www.theatrejs.com/

### What happened
- **Last blog post:** v0.5, 2022-09-15.
- **Last npm release:** `@theatre/core` 0.7.2, 2024-05-19.
- **Last push to the public repo:** 2024-08-14.
- **README:** "Theatre.js 1.0 is around the corner. We have *temporarily* moved development to a private repo… Terms and license will remain OSS." Source: https://github.com/theatre-js/theatre
- **Status as of 2026-11-19:** no public 1.0, and public development has been frozen for about 27 months. Usage persists at `@theatre/core` 41,236 downloads a week and 13,059 stars.
- **Takeaway:** a VC-funded open-core motion editor that went quiet before it found a business model.

---

## 9. react-spring / Poimandres (pmndrs)

### Licenses and funding
- **License:** MIT. Source: https://github.com/pmndrs/react-spring
- **Funding:** Open Collective (`pmndrs`) and GitHub Sponsors for the maintainer (`joshuaellis`). Source: `.github/FUNDING.yml` in the repo.
- **Open Collective figures** (GraphQL API, 2026-11-19):

  | Collective | Yearly budget | Total ever received | Balance | Contributors |
  |---|---|---|---|---|
  | **pmndrs** | **$7,635** | $50,577 | $1,067 | 39 |
  | **react-spring** | **$697** | $10,671 | $9 | 55 |

  Source: https://opencollective.com/pmndrs and https://opencollective.com/react-spring
- **No paid products.**

### Website
- **Homepage:** "naturally fluid animations", `npm i @react-spring/web`, docs-first, Open on CodeSandbox, testimonials (an Andy Matuschak quote), and cross-links to other pmndrs projects (react-three-fiber, zustand, leva).
- **No live spring demo in the hero.**

  Source: https://www.react-spring.dev/

### Traction
- **GitHub:** 29,318 stars.
- **npm weekly:** `@react-spring/web` 6,667,314; `react-spring` 1,388,326.
- **Contrast:** millions of weekly downloads bring in **under $1k a year** through its own collective.

---

## 10. Extra products

### 10a. Lenis (darkroom.engineering)
- **License and funding:** MIT © darkroom.engineering. Funded by GitHub Sponsors and Polar (FUNDING.yml). One sponsor logo appears in the README. Source: https://github.com/darkroomengineering/lenis
- **The library sells the agency.** The site carries repeated "Become a sponsor" and **"Work with darkroom"** CTAs; no products are sold. Source: https://lenis.dev/
- **Website:** "Smooth Scroll / scroll to explore", so the page *is* the demo. There is a **real-site showcase** (Netflix careers, GTA VI, Lando Norris, Google Cloud x Team USA…) with a **submission form** at /showcase/submit. Sources: https://lenis.dev/ and https://www.lenis.dev/showcase
- **Traction:** 17,361 stars; `lenis` 2,738,477 a week.

### 10b. Unicorn Studio (WebGL effects editor, freemium SaaS)
- **Free plan:** all 90+ effects, up to **8 publishes with Unicorn branding**, and 250 MCP agent changes a month.
- **Legend plan:** **$168/year or $20 billed monthly**. It covers unlimited publishes **without watermark**, a **commercial license**, JSON export, CDN, versioning, and 200 AI credits a month.
- **Runtime:** in the `unicornstudio` npm package, about 57 KB gzipped.

  Source: https://www.unicorn.studio/llms.txt (the pricing page renders client-side). The llms.txt also contains citation guidance aimed at AI agents; I treated it as data only.
- **Website pattern:** a full **llms.txt** with an MCP server, machine-readable example catalogs (`llm-example-projects.json`) and 130+ remixable templates.
- **Traction:** `unicornstudio-react` 56,213 a week (ownership of that wrapper not checked); official `unicornstudio` 541 a week (new package name).

### 10c. Spline (3D design tool, freemium SaaS)
- **Pricing** (accessed 2026-11-19, https://spline.design/pricing):

  | Plan | Monthly | Yearly (per month) |
  |---|---|---|
  | Free | $0 (watermark on web exports) | — |
  | Hobby | $15 | $12 |
  | Pro | $30 | $25 |
  | Max | $70 | $60 |
  | Enterprise | Custom | Custom |

  Watermark removal starts at Hobby; code export starts at Pro.
- **Runtime:** `@splinetool/react-spline` is MIT (GitHub).
- **Traction:** `@splinetool/runtime` 730,752 a week.

### 10d. Loader packs: the category Dotquilt competes in
- **LDRS by UI Ball:** **44 loaders as Web Components and React components**, MIT, zero dependencies.
  - Funded indirectly: the page asks "Want to support this project?" and points to the author's SaaS, **Behold** (Instagram feeds).
  - 2,224 stars; `ldrs` 105,197 a week; last push 2025-10-22.

  Sources: https://github.com/GriffinJohnston/ldrs and https://uiball.com/ldrs
- **loaders.css:** MIT on npm (no license on GitHub). 10,220 stars, last push 2023-05-03, 111,259 a week.
- **SpinKit:** MIT. 19,309 stars, last push 2020-08-01, 38,801 a week.
- **react-spinners** (MIT): 1,164,843 a week.
- **react-loading-skeleton** (MIT): 1,633,664 a week.

  Source: GitHub and npm APIs.
- **loading.io** has four tiers: Free (public domain), BY (attribution), and a paid "Pro License" per item that is attribution-free, with a separate fee to remove BY attribution. Source: https://loading.io/license/ (via search result; direct fetch returned 403).
  - **Subscription prices of $3.33 to $9.99 a month or $39.99 a year (unverified)**, from aggregators such as https://www.saasworthy.com/product/loading-io/pricing.
- **LottieFiles loaders:** 342 free loading animations plus premium packs, with an AI generator and "hire an animator" upsells. Source: https://lottiefiles.com/free-animations/loading

---

## Comparison table

Prices are as accessed 2026-11-19; npm figures are weekly for 2026-11-11 to 2026-11-17.

| Product | Free part and license | Paid part | Model | Price | Delivery of paid part | Traction |
|---|---|---|---|---|---|---|
| **Motion / Motion+** | Core MIT | Examples source, Motion UI components, AI Kit, Studio; Cloud (hosted AI) | One-time per dev; yearly per seat for teams; Cloud is yearly SaaS; corporate sponsorships | $399 one-time (launched at €299); team and Cloud prices not captured; sponsors €249 / €999 / €2,499 per month | Token-gated private package `motion-plus`, private GitHub, Paddle | 35.4k stars; framer-motion 70.5M + motion 36.2M/wk |
| **GSAP** | Was a custom "no charge" license; now all free, still non-OSI, with a Webflow-competitor clause | None now (was Club plugins plus a commercial license) | Was a yearly membership; now funded by Webflow | Was $99/yr and $199/yr (unverified); now $0 | Was account zip and private npm registry | 30.9k stars; 8.4M/wk; "11M+ sites" |
| **LottieFiles** | Runtimes MIT; format standard (LF/LAC); free assets under the Simple License | Editor, AI, hosting, premium library, team | Per-user SaaS, billed annually | $19.99 or $24.99/user/mo; custom tiers | SaaS account | lottie-web 10.4M/wk; 16M+ users claimed |
| **Rive** | Runtimes MIT, no royalties | Editor without splash screen, CLI publishes, AI, collaboration | Per-seat SaaS, plus a revenue threshold for Enterprise | $9 / $32 / $120 per seat/mo; Enterprise required above $10M revenue | SaaS account | @rive-app/canvas 1.6M/wk |
| **Remotion** | Source-available; free for teams of up to 3 people, non-profits and evaluation | Company License; Automators; store starters | Per-seat and usage subscription; one-time source kits | $25/seat/mo; $0.01/render ($100 min); Enterprise from $500/mo; Editor Starter $600; Timeline $300 | Dashboard; private GitHub repo for starters; telemetry | 74.2k stars; 4.5M/wk; 800+ companies; profitable |
| **AutoAnimate / FormKit Pro** | AutoAnimate and FormKit MIT; Pro free on localhost | 14 Pro inputs in production | One-time per project/domain; metered option | $149 one-time; Enterprise from $1,250 | `@formkit/pro` and project key; telemetry | AA 14k stars, 2.4M/wk; @formkit/pro 25k/wk |
| **Anime.js** | MIT | Beta repo access for sponsors | GitHub Sponsors | $10 to $1,500/month tiers | Private beta repo | 74.9k stars; 1.15M/wk; 56 sponsors |
| **Theatre.js** | Core Apache-2.0; Studio AGPL | Never launched | VC seed ($4.5M) | — | — | 13.1k stars; dormant since 2024 |
| **react-spring** | MIT | None | Open Collective | Donations | — | 29.3k stars; 6.7M/wk; collective $697/yr |
| **Lenis** | MIT | None (agency work) | Sponsors plus agency marketing | Donations | — | 17.4k stars; 2.7M/wk |
| **Unicorn Studio** | Free plan with branding; runtime on npm | No watermark, commercial license, export | SaaS (yearly or monthly) | $168/yr or $20/mo | SaaS account | small npm |
| **Spline** | Free with watermark; runtime MIT | No watermark, code export, AI | Per-seat SaaS | $12 to $60 per seat/mo (yearly) | SaaS account | runtime 731k/wk |
| **LDRS** (loaders) | MIT web components | None (the author's SaaS pays) | Indirect | $0 | — | 2.2k stars; 105k/wk |

---

## Synthesis: lessons for monetising a small motion/loading library

### What the evidence says
1. **Nobody makes money charging for a small animation runtime any more.**
   - GSAP spent about 16 years on a non-MIT license plus Club membership. It worked, though "95%+" of users never paid. It still ended in an acquisition, after which everything became free (2025-04-30).
   - Every successful monetiser keeps the runtime free and permissive: Motion, Lottie and Rive (MIT), and AutoAnimate and FormKit (MIT).
   - The money is in **content, source kits, tools or hosted services**: Motion+, the FormKit Pro inputs, the Remotion store, and the Rive, Lottie and Spline editors.
2. **Donations don't pay, even at huge scale.**
   - react-spring has 6.7M weekly downloads, and its own collective takes in $697 a year; pmndrs as a whole takes in $7.6k a year.
   - Anime.js, with 75k stars, has 56 sponsors.
   - Motion's individual sponsorship "completely flopped" (about €100 a month).
   - Corporate sponsorship works only with outreach and a champion inside the company, and it churns. Plan for a Pro bundle, not sponsors.
3. **Paywalled concrete things sell; features don't.**
   - Matt Perry: "people pay for concrete things". Motion Examples, the paywalled source, is the main sales driver, while feature releases produced no visible sales bumps.
   - This is direct evidence for Dotquilt's "complete app screens with every loading state". It is the same pattern as Motion Examples and Tailwind Plus.
4. **One-time pricing for downloadable code works for small makers; use a subscription only for things that run on your servers.**
   - Motion states the rule explicitly: Motion+ is one-time, while Cloud and AI are subscriptions.
   - Price points seen for one-time code:

     | Product | One-time price |
     |---|---|
     | FormKit Pro | $149 |
     | Remotion Timeline | $300 |
     | Motion+ | €299 at launch, now $399 |
     | Remotion Editor Starter | $600 |
     | FormKit Enterprise | from $1,250 |

   - Teams are billed differently: per seat per year (Motion), or a separate unlimited or enterprise tier (FormKit).
5. **Company-size or revenue licenses (Remotion, Rive Enterprise) only work when the product is hard to replace.** They also need telemetry or audits to enforce.
   - Remotion has no substitute, so it can charge companies of 4 or more people.
   - A loading-placeholder library has many MIT substitutes: LDRS, react-loading-skeleton, loaders.css. A size-gated license on the *core* would push adopters to those alternatives.
   - Keep the core MIT. Copyleft or "source-available" also harms trust: GSAP's custom license and Webflow-competitor clause are still a talking point, and Theatre.js used AGPL for its studio.
6. **"Free in dev, pay at deploy" (FormKit Pro) converts well but needs keys and telemetry.**
   - FormKit sends domain and input names, and Remotion uses telemetry.
   - For an accessibility- and SSR-focused, privacy-friendly loader library, telemetry and runtime license checks would contradict the brand. Prefer **access-gated source with no runtime checks**, as Motion does: "once you've added code to your site, it's yours forever".
7. **Watermarks are an editor/SaaS tactic** (Rive's splash screen, Spline and Unicorn branding). They fit a hosted *playground export* tool, not the npm runtime.
   - If Dotquilt's playground ever exports through a server (AI, hosting), a small subscription is defensible.
   - If the export runs client-side, include it in the one-time bundle (Motion's rule again).
8. **Protect the bundle with a light "no resale as a competing kit" clause.** Examples: Motion's "Builder's Licence" for products that resell Motion+ capabilities; FormKit's "no standalone resale"; Lottie's "no compiling to build a competing service". The code itself can stay permissive once it is in the buyer's app.
9. **Buyer-friendly terms seen across these products:**
   - a 14-day refund that is void once the source is accessed (Motion)
   - PPP and student discounts (Motion)
   - a locked price ("future increases don't affect existing licenses", FormKit)
   - "Before you buy" fit checklists (Remotion)
   - the price on the homepage (Remotion)
   - a merchant of record for VAT (Motion uses Paddle)
10. **The library can market another business.** Examples: Lenis for the Darkroom agency, LDRS for the Behold SaaS, AutoAnimate for FormKit. This matters when Pro revenue is small; Dotquilt could cross-sell custom loading-state design work.
11. **Risks to note:**
    - A VC-funded editor-first motion tool went dark before monetising (Theatre.js).
    - The fear of "running out of customers" on one-time pricing (Matt Perry) is managed by **continuously adding to the bundle** ("Keep the price steady, keep rolling in value") and later adding team plans.

### Most relevant models for Dotquilt (ranked)
1. **Motion+**: MIT core; a one-time individual price; yearly team seats; paid source (examples and components) behind a token, with public docs pages that advertise it; a Builder's licence for resellers; a separate SaaS only for hosted AI. This is the closest analogue.
2. **Remotion Store**: one-time source kits ($300 to $600) delivered as a private GitHub repo, with a "Before you buy" page. This is the closest analogue for "complete app screens".
3. **FormKit Pro**: $149 one-time per project from a two-person shop, with a free viral library (AutoAnimate) on top. Shows the price ceiling for "premium components" in a niche. The telemetry and key approach is *not* recommended for Dotquilt.
4. **Not recommended for the core:** GSAP-style custom licenses, Remotion-style headcount licenses, runtime watermarks, and donation-only funding.

### Website and playground patterns worth copying
- **The hero is the product.** Lenis's page scrolls smoothly as you read it. Motion shows spring knobs (stiffness, damping, mass) and a timeline scrubber in the hero.
  - For Dotquilt: the hero should be a real card that loads, idles with a glow and hands off to content, with a "replay" control and a duration/stagger knob.
- **A side-by-side "without vs with" demo** (AutoAnimate's native vs AutoAnimate list). For Dotquilt: a spinner or flash of empty content beside the Dotquilt handoff.
- **An examples gallery with strong filters**, as Motion's 526 examples have: framework, category, a "Plus" toggle and a performance grade ("MotionScore", S to F).
  - For Dotquilt: filter by component, framework and screen type; mark Pro screens, but **let anyone see them live**.
- **A "Choose a starting point: free vs Pro" block** on the homepage (Motion), plus a short pricing summary on the homepage (Remotion).
- **In-docs, tasteful house ads** for Pro (Motion's docs). Premium components get public docs; installing them needs a token.
- **Specialised tools as free lead magnets.** Examples: GSAP's ease visualizer, Anime.js's easing editor, Motion's CSS spring generator. A Dotquilt "timing/glow tuner" that copies tokens or CSS fits this pattern.
- **A real-site showcase with a submission form** (Lenis /showcase/submit, GSAP showcase, "Made with Motion").
- **A stats strip and transparency pages:** stars, installs, Discord and docs pages (Remotion); an investors page (Remotion); a sponsor page with traffic numbers (Motion); a per-module bundle-size table (Anime.js). The last one fits Dotquilt's "selective imports" requirement.
- **Agent-ready docs:** llms.txt, machine-readable example catalogs and an MCP or "AI Kit" (Unicorn Studio, Motion `npx motion-ai`, Rive CLI). Motion's year-one data says AI referrals (Cursor) brought traffic but didn't change the sales rate, so treat this as table stakes, not a sales lever.

### Key sources list
- https://motion.dev/plus
- https://motion.dev/cloud
- https://motion.dev/sponsor
- https://motion.dev/blog/motion-independence-one-year-in-review
- https://motion.dev/blog/framer-motion-is-now-independent-introducing-motion
- https://gsap.com/pricing/
- https://gsap.com/community/standard-license/
- https://gsap.com/why-license/
- https://webflow.com/blog/webflow-acquires-gsap
- https://webflow.com/blog/gsap-becomes-free
- https://lottiefiles.com/pricing
- https://lottiefiles.com/page/license
- https://dotlottie.io/
- https://rive.app/pricing
- https://github.com/rive-app/rive-runtime/blob/main/LICENSE
- https://github.com/remotion-dev/remotion/blob/main/LICENSE.md
- https://www.remotion.dev/docs/license/pricing
- https://www.remotion.dev/docs/license/faq
- https://www.remotion.dev/store
- https://www.remotion.dev/docs/investors
- https://www.remotion.dev/about
- https://formkit.com/pro
- https://formkit.com/terms-unlimited
- https://auto-animate.formkit.com/
- https://github.com/sponsors/juliangarnier
- https://animejs.com/
- https://github.com/theatre-js/theatre
- https://www.theatrejs.com/blog
- https://opencollective.com/pmndrs
- https://opencollective.com/react-spring
- https://lenis.dev/
- https://www.unicorn.studio/llms.txt
- https://spline.design/pricing
- https://uiball.com/ldrs
