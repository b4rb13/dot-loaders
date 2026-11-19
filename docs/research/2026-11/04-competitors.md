# 04 · Competitive landscape for Dotquilt

Researched 2026-11-19. Unverified items are marked **(unverified)**.

## How the numbers were collected

| Metric | Source pattern | Date |
| --- | --- | --- |
| npm downloads/week | `https://api.npmjs.org/downloads/point/last-week/<pkg>` | window 2026-11-11 → 2026-11-17, fetched 2026-11-19 |
| GitHub stars, last push, archived flag | `https://api.github.com/repos/<owner>/<repo>` (via `gh api`) | fetched 2026-11-19 |
| Latest version and release date, license | `https://registry.npmjs.org/<pkg>` | fetched 2026-11-19 |
| Accessibility and CSP behaviour | grep of the published tarball (`https://registry.npmjs.org/<pkg>/-/<pkg>-<ver>.tgz`) or the repo source | fetched 2026-11-19 |

Each number in the tables links to the exact URL it came from. For UI kits such as MUI, Chakra and antd, the download count covers **the whole library**, not just its Skeleton.

---

## 1. Direct competitors

### 1a. Dedicated skeleton and placeholder libraries

| Name | Frameworks | Downloads/wk | Stars | License | Last release | Standout features | Gaps vs Dotquilt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **boneyard-js** (auto-skeleton) | React, Preact, Vue, Svelte 5, Angular, React Native, plus a Vite plugin | [143,522](https://api.npmjs.org/downloads/point/last-week/boneyard-js) | [7,617](https://github.com/0xGF/boneyard) (repo created 2026-04-01) | MIT | [1.10.0, 2026-08-31](https://registry.npmjs.org/boneyard-js) | A CLI or Vite plugin opens a headless browser, snapshots the real DOM at breakpoints 375/768/1280 and writes it to `.bones.json`. `<Skeleton name loading>` then renders the stored rectangles at runtime. Animations: pulse, shimmer or solid. Also offers `stagger`, a `transition` fade-out (300 ms when `true`), `<BoneSuspense>`, a dark colour, and React Native capture from a device ([README](https://github.com/0xGF/boneyard)). react.js is about 4.3 KB gzip, plus about 2.1 KB of shared and runtime code (measured from the 1.10.0 tarball). | **Accessibility:** the 1.10.0 dist only sets `aria-busy`. It has no `prefers-reduced-motion`, no `inert` and no forced-colors handling (grep of the dist). **CSP:** it renders inline `<style>` `@keyframes` without a nonce, which breaks a strict `style-src` (dist/react.js line 199). **Shapes:** only grey rectangles, with no chart or table meaning and no glide into the real content. **Workflow:** it needs a build step and committed JSON, and the capture fails if data isn't there at capture time ([OpenReplay, 2026-05-05](https://blog.openreplay.com/automatic-skeleton-screen-generation-boneyard/)). It has no paid tier ([boneyard.vercel.app](https://boneyard.vercel.app/overview)). |
| **react-loading-skeleton** | React | [1,633,664](https://api.npmjs.org/downloads/point/last-week/react-loading-skeleton) | [4,213](https://github.com/dvtng/react-loading-skeleton) | MIT | [3.5.0, 2024-09-21](https://registry.npmjs.org/react-loading-skeleton) | Sizes itself from the surrounding font size and line height, so you don't build a separate skeleton screen. Supports `count`, `SkeletonTheme` (CSS variables), `direction` (rtl) and a custom highlight. The dist sets `aria-busy` and `aria-live` and respects `prefers-reduced-motion`. About 1.6 KB gzip JS plus 0.5 KB CSS (measured). | It only draws a shimmer bar. There's no handoff (you swap with conditional rendering), no chart or table shapes, no Web Component, no `inert` and no forced colours. No release in over two years, though the repo was last pushed on 2026-03-05. |
| **react-content-loader** | React, React Native (`/native`) | [1,035,920](https://api.npmjs.org/downloads/point/last-week/react-content-loader) | [13,997](https://github.com/danilowoz/react-content-loader) | MIT | [7.1.2, 2026-01-22](https://registry.npmjs.org/react-content-loader) | SVG masks with presets (Facebook, Instagram, Code, List, BulletList). Props for speed, colours, rtl and `beforeMask`, plus `uniqueKey` for SSR id stability. It renders `<title>` and `role="img"`. About 2.3 KB gzip (measured). | Its fixed-viewBox SVG doesn't adapt to the real layout, and you draw the shapes by hand. No handoff, and no reduced-motion or forced-colours handling (the 7.1.2 dist has none). |
| **create-content-loader** ([skeletonreact.com](https://skeletonreact.com/)) | Visual builder that outputs React, React Native, Vue, Angular and SVG/HTML | no npm package | [1,233](https://github.com/danilowoz/create-content-loader) | no license in repo (GitHub API) | last push 2025-01-13 | A drag-and-draw editor that exports content-loader code. It's the only visual skeleton builder found. | Static SVG output with none of the runtime behaviour (accessibility, handoff, SSR). |
| **react-placeholder** | React | [46,810](https://api.npmjs.org/downloads/point/last-week/react-placeholder) | [1,608](https://github.com/buildo/react-placeholder) | ISC | [4.1.0, 2021-02-05](https://registry.npmjs.org/react-placeholder) | `ready` swaps in the children. Has presets, `customPlaceholder`, a **`delay` prop that avoids flashing the placeholder on fast responses**, and `firstLaunchOnly`. | Unmaintained. The dist has no accessibility markup. |
| **react-shimmer** | React (images) | [3,429](https://api.npmjs.org/downloads/point/last-week/react-shimmer) | [1,143](https://github.com/gokcan/react-shimmer) | MIT | [3.2.0, 2022-01-28](https://registry.npmjs.org/react-shimmer) | A shimmer while an image loads. | Image-only and stale. |
| **vue-content-loader** | Vue | [30,852](https://api.npmjs.org/downloads/point/last-week/vue-content-loader) | [3,026](https://github.com/egoist/vue-content-loader) | MIT (npm) | [2.0.1, 2021-11-29](https://registry.npmjs.org/vue-content-loader) | A Vue port of react-content-loader. | Stale, with the same gaps as react-content-loader. |
| **ngx-skeleton-loader** | Angular | [299,429](https://api.npmjs.org/downloads/point/last-week/ngx-skeleton-loader) | [622](https://github.com/willmendesneto/ngx-skeleton-loader) | MIT | [14.0.0, 2026-10-20](https://registry.npmjs.org/ngx-skeleton-loader) | Circle, line or custom appearances. Animations: progress, pulse and progress-dark. The dist uses `role="progressbar"`, `aria-valuetext` and `aria-busy`, and **respects `prefers-reduced-motion`**. | Angular-only. No handoff and no shaped domain loaders. Shows that Angular demand is real (about 300k a week). |
| **svelte-skeleton** | Svelte 3 | [802](https://api.npmjs.org/downloads/point/last-week/svelte-skeleton) | [45](https://github.com/denisstasyev/svelte-skeleton) | MIT | [1.3.1, 2022-03-02](https://registry.npmjs.org/svelte-skeleton) | SVG skeletons. | Abandoned. **No serious Svelte-only skeleton library exists**; Svelte users rely on UI kits. |
| **react-native-skeleton-placeholder** | React Native | [145,701](https://api.npmjs.org/downloads/point/last-week/react-native-skeleton-placeholder) | [734](https://github.com/chramos/react-native-skeleton-placeholder) | ISC on npm, MIT on GitHub | [5.2.4, 2022-11-15](https://registry.npmjs.org/react-native-skeleton-placeholder) | A shimmer layout built from nested views. | React Native only, last released in 2022. |

### 1b. Other auto-skeleton generators (DOM, AST or design tools)

| Name | Downloads/wk | Stars | Notes |
| --- | --- | --- | --- |
| auto-skeleton-react | [30,885](https://api.npmjs.org/downloads/point/last-week/auto-skeleton-react) | [27](https://github.com/ShanukJ/auto-skeleton) | Inspects the DOM at runtime. Last release [1.0.5, 2026-02-14](https://registry.npmjs.org/auto-skeleton-react). Downloads are out of proportion to stars, possibly automated **(unverified)**. |
| react-native-auto-skeleton | [2,698](https://api.npmjs.org/downloads/point/last-week/react-native-auto-skeleton) | [373](https://github.com/pioner92/react-native-auto-skeleton) | Builds placeholders from the existing React Native layout. Last release [0.1.33, 2026-10-08](https://registry.npmjs.org/react-native-auto-skeleton). |
| smart-skeleton-loader, instaskeleton, skelix, skeleton-ui-loader, react-auto-skeleton-loader | [67](https://api.npmjs.org/downloads/point/last-week/smart-skeleton-loader), [24](https://api.npmjs.org/downloads/point/last-week/instaskeleton), [2](https://api.npmjs.org/downloads/point/last-week/skelix), [4](https://api.npmjs.org/downloads/point/last-week/skeleton-ui-loader), [15](https://api.npmjs.org/downloads/point/last-week/react-auto-skeleton-loader) | n/a | A long tail of 2025–26 experiments, all with negligible use. |
| **Figma AI loading state generator** | n/a | n/a | Generates skeletons, shimmer and placeholders on the canvas from your own components. Available on all paid Figma plans, and free of AI credits during the open beta. No code output is stated ([figma.com](https://www.figma.com/solutions/ai-loading-state-generator/), 2026-11-19). |

**Takeaway:** auto-generation is the 2026 growth story. boneyard reached 7.6k stars and about 143k weekly downloads within 7.5 months. Everything else in this category is noise.

### 1c. Skeletons inside UI kits

| Kit | Frameworks | Downloads/wk (whole lib) | Stars | License | Latest | Skeleton features | Gaps vs Dotquilt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **MUI** `@mui/material` Skeleton | React | [14,324,533](https://api.npmjs.org/downloads/point/last-week/@mui/material) | [99,355](https://github.com/mui/material-ui) | MIT | [9.5.0, 2026-10-09](https://registry.npmjs.org/@mui%2Fmaterial) | Variants: text, circular, rectangular and rounded. Animations: pulse, wave or false. Takes its size from children or Typography. Docs list the ARIA as "None" ([mui.com](https://mui.com/material-ui/react-skeleton/)). MUI X DataGrid has a `skeleton` loading-overlay variant (since 7.9.0). MUI X Charts only shows a **text** "loading" overlay ([docs](https://mui.com/x/react-charts/styling/)). | No handoff, and no reduced-motion handling documented. No chart-shaped placeholder. |
| **Chakra UI** Skeleton / SkeletonCircle / SkeletonText | React | [2,267,046](https://api.npmjs.org/downloads/point/last-week/@chakra-ui/react) | [40,735](https://github.com/chakra-ui/chakra-ui) | MIT | [3.38.0, 2026-11-03](https://registry.npmjs.org/@chakra-ui%2Freact) | A `loading` prop; variants pulse, shine or none. **"When loading is changed to false, the Skeleton component will fade in"** ([chakra-ui.com](https://chakra-ui.com/docs/components/skeleton)). | The handoff is a plain fade, with no accessibility guidance in the docs. |
| **Mantine** Skeleton | React | [3,708,251](https://api.npmjs.org/downloads/point/last-week/@mantine/core) | [31,956](https://github.com/mantinedev/mantine) | MIT | [9.8.1, 2026-11-15](https://registry.npmjs.org/@mantine%2Fcore) | A `visible` overlay over the wrapped children, plus `animate` and `circle` ([mantine.dev](https://mantine.dev/core/skeleton/)). | No transition or accessibility documented. |
| **shadcn/ui** Skeleton (+ Spinner, Progress, `shimmer` utility) | React (copy-in). Community ports for Svelte and Vue exist. | n/a. The `shadcn` CLI and CSS package has [18,886,105](https://api.npmjs.org/downloads/point/last-week/shadcn). | [128,521](https://github.com/shadcn-ui/ui) | MIT | rolling | The Skeleton is just `<div className="animate-pulse rounded-md bg-accent">` ([source](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/skeleton.tsx)). The new **`shimmer` CSS utility** for text turns itself off under reduced motion ([docs](https://ui.shadcn.com/docs/utils/shimmer)). | The Skeleton has no accessibility and no handoff. It's still the default most new React apps start from. |
| **Ant Design** Skeleton | React | [5,252,879](https://api.npmjs.org/downloads/point/last-week/antd) | [100,268](https://github.com/ant-design/ant-design) | MIT | [6.7.1, 2026-11-16](https://registry.npmjs.org/antd) | A composite avatar, title and paragraph. Skeleton.Button, Avatar, Input, Image and Node. `active` and `loading` props, plus design tokens ([ant.design](https://ant.design/components/skeleton)). | No accessibility or reduced-motion handling documented. |
| **Radix Themes** Skeleton | React | [1,566,315](https://api.npmjs.org/downloads/point/last-week/@radix-ui/themes) | [8,859](https://github.com/radix-ui/themes) | MIT | [3.3.0, 2026-01-31](https://registry.npmjs.org/@radix-ui%2Fthemes) | Wraps the children and keeps their size. **The source sets `aria-hidden`, `tabIndex=-1` and `inert`** ([skeleton.tsx](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/components/skeleton.tsx)). | Its CSS has no reduced-motion rule. No handoff. It's the closest to Dotquilt's rigour about inert pending content. |
| **Element Plus** `el-skeleton` | Vue 3 | [805,745](https://api.npmjs.org/downloads/point/last-week/element-plus) | [27,860](https://github.com/element-plus/element-plus) | MIT | [2.14.8, 2026-11-06](https://registry.npmjs.org/element-plus) | Default and template slots. **`throttle: {leading, trailing, initVal}` prevents flicker on fast responses and keeps the skeleton shown briefly after loading ends** ([docs](https://element-plus.org/en-US/component/skeleton.html)). | Vue-only grey blocks. |
| **Vuetify** `v-skeleton-loader` | Vue | [1,347,277](https://api.npmjs.org/downloads/point/last-week/vuetify) | [41,045](https://github.com/vuetifyjs/vuetify) | MIT | n/a | A type-string DSL with **table presets** (`table-thead`, `table-tbody`, `table-row`…) plus card, article and list-item. Uses `role="alert"` and a localised `loadingText` ([source](https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/components/VSkeletonLoader/VSkeletonLoader.tsx)). | Static presets with no handoff. |
| **Web Awesome** `wa-skeleton` | Web Components | [197,583](https://api.npmjs.org/downloads/point/last-week/@awesome.me/webawesome) | [1,406](https://github.com/shoelace-style/webawesome) | MIT core, paid Pro tier | [3.15.0, 2026-11-17](https://registry.npmjs.org/@awesome.me%2Fwebawesome) | Effects: none, sheen or pulse, styled through the `indicator` part and `--color`/`--sheen-color` ([docs](https://webawesome.com/docs/components/skeleton)). | No accessibility or reduced-motion handling documented. Generic shapes. |
| **Shoelace** `sl-skeleton` | Web Components | [206,722](https://api.npmjs.org/downloads/point/last-week/@shoelace-style/shoelace) | [13,821](https://github.com/shoelace-style/shoelace) | MIT | [2.20.1, 2025-03-11](https://registry.npmjs.org/@shoelace-style%2Fshoelace) | Same as Web Awesome. | **Repo archived. The README says "Shoelace is sunset", and work has moved to Web Awesome.** |
| Ionic `ion-skeleton-text`, Carbon Web Components skeletons | Web Components | [581,383](https://api.npmjs.org/downloads/point/last-week/@ionic/core) / [29,760](https://api.npmjs.org/downloads/point/last-week/@carbon/web-components) | [52,759](https://github.com/ionic-team/ionic-framework) / [9,630](https://github.com/carbon-design-system/carbon) | MIT / Apache-2.0 | 2026-11 | Text and placeholder skeletons inside large design systems. Not checked in detail **(unverified)**. | Tied to their design systems. |
| Svelte kits: Skeleton Labs, shadcn-svelte, flowbite-svelte | Svelte | [111,031](https://api.npmjs.org/downloads/point/last-week/@skeletonlabs/skeleton) / [330,241](https://api.npmjs.org/downloads/point/last-week/shadcn-svelte) / [114,988](https://api.npmjs.org/downloads/point/last-week/flowbite-svelte) | [6,093](https://github.com/skeletonlabs/skeleton) / [9,268](https://github.com/huntabyte/shadcn-svelte) / [2,793](https://github.com/themesberg/flowbite-svelte) | MIT | 2026 | Pulse-placeholder utilities and components. | Generic. |
| KendoReact Skeleton | React | n/a | n/a | free component inside a paid suite | n/a | Circle, rectangle and text shapes; none, pulse or wave. "Free to use, including in production" ([telerik.com](https://www.telerik.com/kendo-react-ui/skeleton)). | Generic. Even an enterprise vendor gives skeletons away. |

### 1d. Adjacent pieces (dot-matrix indicators, number and text animation, platform features)

| Name | What | Downloads/wk | Stars | Relevance to Dotquilt |
| --- | --- | --- | --- | --- |
| **assistant-ui Dot Matrix** | A 5×5 SVG dot matrix with **20 states** (loading, thinking, streaming, searching, uploading, success, error…). Cross-fades between states, uses `role="status"`, holds still under `prefers-reduced-motion`, and keeps SSR markup deterministic. Installed from the shadcn registry ([docs](https://www.assistant-ui.com/docs/ui/dot-matrix)). | part of `@assistant-ui/react` [3,359,715](https://api.npmjs.org/downloads/point/last-week/@assistant-ui/react) | [13,322](https://github.com/assistant-ui/assistant-ui) | **The closest aesthetic overlap** with TypingDots and Dotquilt's dot language, from a project with real distribution. |
| zzzzshawn/matrix ("Dot Matrix" registry) | 70 dot-matrix loaders (square, circular, triangle, hex) via a `@dotmatrix` shadcn registry. Has reduced-motion and `ariaLabel` support ([jqueryscript](https://next.jqueryscript.net/shadcn-ui/dot-matrix-loaders/)). | no npm | [629](https://github.com/zzzzshawn/matrix) (created 2026-04-24) | Shows a dot-matrix loader trend in 2026. License NOASSERTION. |
| lumidot | 36 dot-grid patterns for React. | [43](https://api.npmjs.org/downloads/point/last-week/lumidot) | [3](https://github.com/zainzafar90/lumidot) | Same trend, no traction. |
| ldrs (UI Ball) | CSS, HTML and SVG spinners shipped **as Web Components**. | [105,197](https://api.npmjs.org/downloads/point/last-week/ldrs) | [2,224](https://github.com/GriffinJohnston/ldrs) | Proves Web Component loaders can find users. Spinners only. Last release [1.1.9, 2025-10-22](https://registry.npmjs.org/ldrs). |
| react-spinners / react-loader-spinner | Spinner collections. | [1,164,843](https://api.npmjs.org/downloads/point/last-week/react-spinners) / [526,415](https://api.npmjs.org/downloads/point/last-week/react-loader-spinner) | [3,357](https://github.com/davidhu2000/react-spinners) / [1,039](https://github.com/mhnpd/react-loader-spinner) | Shows how large spinner demand still is. |
| **NumberFlow** | An animated number transition. Its core is a custom element, with React, Vue and Svelte wrappers. | `number-flow` [3,570,997](https://api.npmjs.org/downloads/point/last-week/number-flow), `@number-flow/react` [3,285,112](https://api.npmjs.org/downloads/point/last-week/@number-flow/react) | [7,823](https://github.com/barvian/number-flow) | Adjacent to TextLoader's "lock into value". **It's also the reference proof that a custom-element core with thin wrappers can reach millions of downloads.** |
| **React 19.3 `<ViewTransition>`** | Stable since 19.3, released [2026-09-09](https://react.dev/blog/2026/09/09/react-19-3). Wrapping a `<Suspense>` in it cross-fades from the fallback to the content ([react.dev Suspense docs, via ctx7](https://github.com/reactjs/react.dev/blob/main/src/content/reference/react/Suspense.md)). `react@latest` is [19.3.1](https://registry.npmjs.org/react). | n/a | n/a | **Commoditises a basic fallback-to-content cross-fade for React users.** Dotquilt's handoff has to be clearly more than a cross-fade (shaped morph, focus, inert) and should work alongside it. |

---

## 2. Does anyone charge for loading states?

**Short answer:** almost nobody sells loading-state **code** on its own. The money is in three places:

- **Animation-asset marketplaces and subscriptions**, mostly for spinners.
- **Broad "Pro" bundles**, where loaders are a free hook.
- **Hosting and cloud services**, for example assistant-ui.

Skeleton components are free everywhere, including from enterprise vendors such as Telerik.

| Seller | Model and price | Source (date) |
| --- | --- | --- |
| **loading.io** | Free tier, plus Pro by subscription or per-item purchase. The Pro License makes items attribution-free. Aggregator prices are **$9.99/mo or $39.99/yr**, but those were last updated 2020-02-06. **(unverified: the pricing page returned 403 to our fetch)** | [loading.io/license](https://loading.io/license/), [saasworthy](https://www.saasworthy.com/product/loading-io/pricing) (2026-11-19) |
| **LottieFiles** | Individual **$19.99/user/mo** and Team **$24.99/user/mo**, both billed annually. Team+ and Enterprise are custom. Paid tiers include a "1 Million+ premium Lottie library". There's also a free library. Third-party loader packs sit in its marketplace with no price shown. | [lottiefiles.com/pricing](https://lottiefiles.com/pricing), [marketplace pack](https://lottiefiles.com/marketplace/loading-indicators-animation-pack_406886) (2026-11-19) |
| **Creative Market**, "30 Animated Loaders" | Personal **$39**, Commercial **$47**, Extended **$156**. Lottie JSON and AE files. No reviews. | [creativemarket.com](https://creativemarket.com/DavidProbstJr/4760671-30-Animated-Loaders) (2026-11-19) |
| **CodeCanyon** (Envato Market) | 174 "loader" items at **$2–$22** each. The top result, "Simple Content Loader", is **$5 with 272 sales** (about $1.4k lifetime gross). Most items have 2–100 sales. No skeleton-specific items. | [codecanyon.net/search/loader](https://codecanyon.net/search/loader) (2026-11-19) |
| **Envato Elements** | Core plan **from $16.50/mo**, Plus from $39, Ultimate from $168, with unlimited downloads including Lottie and UI toolkits. | [elements.envato.com/pricing](https://elements.envato.com/pricing) (2026-11-19) |
| **Framer Marketplace** "Skeleton Loader" | **Free.** | [framer.com](https://framer.com/marketplace/components/skeletonloader/) (2026-11-19) |
| **preloaders.net / Icons8** | Free for personal and commercial use, with attribution needed for redistribution. **(unverified, from search snippet)** | [icons8.com/preloaders](https://icons8.com/preloaders) |
| **Untitled UI** | React PRO **$349 solo / $999 studio / $2,499 business / $8,999 enterprise**. Figma PRO from **$129**. One-time payment. Its React loading indicators are **free and open source**. | [untitledui.com/pricing](https://www.untitledui.com/pricing), [loading indicators](https://www.untitledui.com/react/components/loading-indicators.md) (2026-11-19) |
| Paid Figma UI kits (general) | Entry licences of **$89–$149 per user**, for example the shadcn/ui kit for Figma from $119. Prices were checked in Aug 2026. Skeletons aren't sold separately. | [untitledui.com blog](https://www.untitledui.com/blog/figma-ui-kits) (fetched 2026-11-19) |
| **Magic UI Pro** | **$199 one-time**, individual lifetime licence for sections and templates. The animated components themselves are free. | [pro.magicui.design](https://pro.magicui.design/) (2026-11-19) |
| **Aceternity UI Pro** | **$199 lifetime**. Its Loader, Multi Step Loader and Image Generation Loader are on the public site (tier not stated). | [brand facts](https://ui.aceternity.com/brand-facts), [multi-step-loader](https://ui.aceternity.com/components/multi-step-loader) (2026-11-19) |
| **Web Awesome Pro** | Per-seat annual subscription, with a custom plan for 5+ seats. The price didn't render. Pro adds components, themes, patterns and a Figma kit; the core stays free. **(price unverified)** | [webawesome.com/purchase](https://webawesome.com/purchase) (2026-11-19) |
| **assistant-ui** | The library is MIT. The paid product is **assistant-cloud**: Free (200 MAU), **Pro $50/mo** (500 MAU, then $0.10/MAU), and Enterprise. | [assistant-ui.com/pricing](https://www.assistant-ui.com/pricing) (2026-11-19) |
| SVGator / Rive | SVGator from **$24/mo** (aggregator). Loaders in the Rive marketplace are free CC-BY files. **(unverified)** | [toolradar](https://toolradar.com/tools/svgator/pricing), [rive.app](https://rive.app/marketplace/8372-16070-dynamic-loading-animation-collection) |
| Figma AI loading-state generator | Bundled into paid Figma plans. | [figma.com](https://www.figma.com/solutions/ai-loading-state-generator/) (2026-11-19) |

**What this means for a Dotquilt Pro:**

- Skeleton code alone looks like a hard sale. CodeCanyon's best content loader grossed about $1.4k in total.
- The working models are:
  - **one-time bundles at $199–$349** (Magic UI, Aceternity, Untitled UI);
  - **per-seat asset subscriptions at $16–$25 a month** (Envato, LottieFiles);
  - **free libraries funded by an adjacent paid service** (assistant-ui).
- Pro has to sell something beyond "nicer skeletons". Candidates: shaped placeholders for whole dashboards or AI tool results, a Figma kit, presets, or licence and support terms.
- This is evidence only. It doesn't change the owner's decision on pricing.

---

## 3. AI-era loaders (streaming, "thinking" and agent status)

### What exists

| Name | What it offers for loading and streaming | Downloads/wk | Stars | License | Status |
| --- | --- | --- | --- | --- | --- |
| **shadcn/ui chat and AI** | **June 2026:** Message, MessageScroller (follows streamed replies), Bubble, Attachment and **Marker** (status lines such as tool activity), plus the `shimmer` and `scroll-fade` CSS utilities ([InfoQ, 2026-08-17](https://infoq.com/news/2026/08/shadcn-conversational-primitives)). **October 2026:** **Trace** (agent steps with running, error and pending states, "a shimmer while a step runs", "Thought for 5s"), Code Block, and 21 copy-in **AI Elements** patterns: Chat, Prompt Input, Reasoning, Tool, Plan, Subagent ([changelog](https://ui.shadcn.com/docs/changelog/2026-10-ai-elements)). Spinner and Progress also exist ([index](https://ui.shadcn.com/docs/components)). | `shadcn` [18,886,105](https://api.npmjs.org/downloads/point/last-week/shadcn) | [128,521](https://github.com/shadcn-ui/ui) | MIT | **Becoming the default for AI loading UI.** |
| **Vercel AI Elements** | 49 components, including **Shimmer** (a Motion-driven text gradient), Reasoning, Chain of Thought, Plan, Task, Tool and Queue ([source](https://github.com/vercel/ai-elements/tree/main/packages/elements/src)). | `ai-elements` [159,692](https://api.npmjs.org/downloads/point/last-week/ai-elements) | [2,532](https://github.com/vercel/ai-elements) | Apache-2.0 ([npm](https://registry.npmjs.org/ai-elements)) | **To be deprecated "at the end of November 2026"; moving to shadcn/ui** ([elements.ai-sdk.dev](https://elements.ai-sdk.dev/), 2026-11-19). |
| **assistant-ui** | **Dot Matrix** (20 states), **Thinking indicator** (pulsing dot, a label that fades in, elapsed time) and **Loading state** (a 9-cell pixel matrix with a shimmer label) ([dot matrix](https://www.assistant-ui.com/docs/ui/dot-matrix), [loading state](https://www.assistant-ui.com/elements/loading-state)). Supports React, Vue, React Native and Ink. | [3,359,715](https://api.npmjs.org/downloads/point/last-week/@assistant-ui/react) | [13,322](https://github.com/assistant-ui/assistant-ui) | MIT | Very active (pushed 2026-11-19). |
| **prompt-kit** | A **Loader** with 12 variants (circular, classic, pulse, pulse-dot, dots, typing, wave, bars, terminal, text-blink, text-shimmer, loading-dots), plus Text Shimmer, Thinking Bar, Reasoning, Chain of Thought and Steps. Distributed from a shadcn registry ([docs](https://www.prompt-kit.com/docs/loader)). | no npm | [3,161](https://github.com/ibelick/prompt-kit) | MIT | Active. |
| **Streamdown** | Streaming-safe Markdown that copes with unterminated blocks. Powers the AI Elements Message component and needs a Tailwind `@source`. | [11,785,494](https://api.npmjs.org/downloads/point/last-week/streamdown) | [5,775](https://github.com/vercel/streamdown) | Apache-2.0 ([npm](https://registry.npmjs.org/streamdown)) | [2.8.0, 2026-11-17](https://registry.npmjs.org/streamdown) |
| flowtoken | Animations for streaming LLM text: fade, blur-in, typewriter and others. | [67,280](https://api.npmjs.org/downloads/point/last-week/flowtoken) | n/a | ISC | [1.0.40, 2025-05-07](https://registry.npmjs.org/flowtoken) |
| llm-ui | Smooths streamed LLM output. | [52,743](https://api.npmjs.org/downloads/point/last-week/@llm-ui/react) | [1,749](https://github.com/richardgill/llm-ui) | MIT | Active. |
| Magic UI / motion-primitives / Aceternity | Shiny or shimmer text, TextShimmer, Multi Step Loader and Image Generation Loader, all as copy-paste React, Tailwind and Motion. | n/a | [23,363](https://github.com/magicuidesign/magicui) / [6,987](https://github.com/ibelick/motion-primitives) / n/a | MIT | Active. |
| CopilotKit | Agent and generative-UI stack with in-progress render states. | [326,482](https://api.npmjs.org/downloads/point/last-week/@copilotkit/react-ui) | [38,814](https://github.com/CopilotKit/CopilotKit) | MIT | Active. |

### What's popular

- shadcn/ui is now the distribution channel. AI Elements is folding into it, and assistant-ui, prompt-kit and the dot-matrix registries all install through `npx shadcn add`.
- Text shimmer ("Thinking…", "Generating…") is the dominant AI loading idiom.
- A small dot-matrix status glyph is the second idiom (assistant-ui, zzzzshawn/matrix).

### What's missing (none of these found on 2026-11-19)

1. **Shaped placeholders for generative-UI tool results.** When a tool is streaming a chart or table, apps show a text shimmer or a spinner. Nothing draws a chart- or table-shaped placeholder that then hands off to the rendered result. The guides say to "build a skeleton matching the final component" yourself ([search summary of AI SDK and assistant-ui guides](https://www.assistant-ui.com/docs/guides/tool-ui), 2026-11-19). This maps directly onto ChartLoader, TableLoader and TextLoader.
2. **Framework-agnostic AI indicators.** Everything above is React, Tailwind and shadcn. assistant-ui has Vue and React Native runtimes, but no Web Component indicators.
3. **Strict-CSP-safe motion.** The AI Elements Shimmer drives animation through Motion inline styles, and boneyard injects unnonced `<style>`. Nobody advertises CSP compliance.
4. **A streamed metric that "locks in".** NumberFlow animates from one number to another, but nothing animates a pending placeholder into the first value.

---

## 4. Where Dotquilt can win, and what it lacks

### Where Dotquilt can win

1. **Handoff as a designed, shaped transition rather than a swap.**
   - Today's options:
     - a conditional swap (MUI, react-loading-skeleton);
     - a plain fade (Chakra; boneyard's 300 ms `transition`);
     - an overlay toggle (Mantine);
     - React 19.3's generic `<ViewTransition>` cross-fade.
   - None of them morph the placeholder into the content's shape: dots gliding onto the chart, rows settling.
   - None of them preserve focus or make pending content inert across the handoff.
   - **Position Dotquilt as "more than ViewTransition" and compatible with it.**
2. **Domain-shaped loaders.**
   - Charts: the only "chart loading" found is MUI X Charts' **text** overlay.
   - Tables: Vuetify presets, MUI DataGrid's skeleton overlay, and antd's paragraph rows.
   - ChartLoader and TableLoader have no direct equivalent in the survey.
   - This also fills the biggest AI gap: placeholders for generative-UI tool results.
3. **Accessibility and CSP rigour as a bundle.** In the survey, each library covers only part of this:

   | Library | What it handles |
   | --- | --- |
   | react-loading-skeleton | `aria-busy`/`aria-live` and reduced motion |
   | ngx-skeleton-loader | `role="progressbar"` and reduced motion |
   | Radix Themes | `inert` and `aria-hidden`, but no reduced motion |
   | assistant-ui Dot Matrix | `role="status"` and reduced motion |

   - **None of the dists checked handle forced-colors.**
   - boneyard breaks a strict CSP.
   - Focus, inert content, reduced motion, forced colours, strict CSP and SSR markup together is unique in this survey. The survey grepped six package dists and read the docs for the UI kits, so it isn't exhaustive.
4. **Web Components plus React with SSR.**
   - The Web Component skeleton options are generic (Web Awesome, Ionic, Carbon) or sunset (Shoelace).
   - NumberFlow (3.5M downloads a week) and ldrs (105k a week) show that a custom-element core can win distribution, provided it ships thin, well-typed wrappers.
5. **Design quality in a polarised market.**
   - Today's options are either default grey pulse blocks (shadcn, MUI, antd) or flashy effects (Magic UI, Aceternity).
   - The 2026 dot-matrix trend validates the visual language: assistant-ui Dot Matrix, and zzzzshawn/matrix with 629 stars in about seven months.
   - That trend is indicator-sized. Nobody applies the dot language to whole-region skeletons.

### What it lacks, compared with competitors

| Gap | Who has it | Evidence |
| --- | --- | --- |
| **Auto-generated skeletons from real components** | boneyard (DOM snapshot via CLI or Vite), auto-skeleton-react, react-native-auto-skeleton, Figma AI generator | boneyard reached 143,522/wk and 7,617 stars within 7.5 months. This is the fastest-moving threat. |
| **Vue, Svelte, Angular, Preact and React Native wrappers** | boneyard (all six), react-content-loader (React Native), ngx-skeleton-loader (Angular, 299,429/wk), Element Plus and Vuetify (Vue) | The Web Component core works in these frameworks in principle, but there are no typed wrappers or docs. |
| **shadcn registry distribution** | assistant-ui, prompt-kit, AI Elements, zzzzshawn/matrix, Aceternity | The `shadcn` package has 18.9M downloads a week, and AI UI is consolidating there. |
| **Tailwind integration** (utilities, token mapping) | shadcn `shimmer` utility, Streamdown (`@source`), every copy-paste kit | Dotquilt has no Tailwind plugin or preset **(verify in repo)**. |
| **React Native** | react-content-loader/native, react-native-skeleton-placeholder (145,701/wk), moti, boneyard/native | None. |
| **Small bundle size** | react-loading-skeleton about 2.2 KB gz (JS+CSS); react-content-loader about 2.3 KB; boneyard react.js about 4.3 KB plus about 2.1 KB shared (all measured from tarballs) | Dotquilt's **budget ceilings** are 9.5 KB (SkeletonBlock) to 21.2 KB (TableLoader React) per component, and 34.2 KB (native) or 39.0 KB (React) for everything (`scripts/size-budgets.json`, min+gzip). Actual sizes weren't measured here. |
| **Anti-flicker delay and minimum display time** | Element Plus `throttle {leading, trailing, initVal}`; react-placeholder `delay` and `firstLaunchOnly` | Check whether LoadingRegion has an equivalent **(verify)**. |
| **Presets and a visual builder** | react-content-loader presets plus the create-content-loader builder; Vuetify type DSL; antd composite skeleton | Nothing comparable found in Dotquilt. |
| **Multi-state status indicator** | assistant-ui Dot Matrix (20 states: thinking, searching, uploading, error…) | Dotquilt has only TypingDots. |
| **Figma kit** | Web Awesome Pro, Untitled UI, Skeleton Labs, Figma's AI generator | Unverified for Dotquilt. |
| **Adoption and trust** | Every competitor | Dotquilt is unpublished (`@dotquilt-internal/*`, version 0.0.0-m2.0). |

### Threats to watch

1. **React 19.3 `<ViewTransition>`** (stable since 2026-09-09). React users get a free cross-fade from fallback to content.
2. **shadcn absorbing AI Elements** (Oct 2026), with a built-in `shimmer` that already respects reduced motion. Being "good enough" by default is the main competitor for AI loading UI.
3. **boneyard's momentum**:
   - It already supports six frameworks and has added fade transitions and `BoneSuspense`.
   - If it adds reduced motion and CSP fixes, its gap with Dotquilt narrows to shape and handoff quality.
   - Its only open issue mentioning reduced motion is unrelated, a Solid 2 support request ([search](https://github.com/0xGF/boneyard/issues?q=reduced+motion), 2026-11-19).
