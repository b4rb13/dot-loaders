# Next.js App Router / CSP example

Private preview 0.0.0-m2.0. Bun 1.4.3, Node 24.14.0, Next 16.4.2, React 19.3.1. Place both exact reviewed tarballs in vendor/ using the package.json filenames. They are not public npm dependencies.

1. bun install --ignore-scripts
2. bun run build
3. bun run check
4. bun run start

Open http://127.0.0.1:4234/?mode=external or ?mode=nonce. Add &state=pending to inspect pending server HTML. Test the ordinary server-content recovery link without JavaScript, actual refresh/replacement/reveal/pause controls after hydration and the client navigation to another account. Suspense's deferred detail is illustrative server work; it does not infer the loading owner's readiness.

The production proxy generates and overwrites a fresh request nonce, passes CSP to Next rendering and returns the same enforced header. headers() makes the document dynamic. The root-layout client provider captures the document policy once, so later RSC/navigation responses cannot swap the original document's nonce or style mode. A full reload creates a new document/policy. Serializable scalar data and server children cross the boundary; providers, custom animation functions and element refs belong in client modules.

This deliberately production-only CSP example is verified with next build / next start. Do not run next dev under this strict header and call its development evaluator failures a package regression. No unsafe-eval or unsafe-inline is enabled. Nonce pages are private/no-store; do not cache/reuse their HTML/nonces. External Dotquilt styles still need Next's own per-request script authorization. This example does not implement Next SRI or a fully static Next strict-CSP deployment.

Customize server data, failures/cancellation, locale, authentication and deployment headers for your application. No runtime optimization, browser-floor/manual-AT/device or full M2/M4/release qualification is implied. No deployment/publication command is included.

Application app.css supplies a pre-definition pending-content visibility guard. The frozen adapter renders static placeholders/state but does not hide real children before native definition by itself. Once defined, the native owner controls presentation. Visual guards are not authorization: never send sensitive content based on these CSS guards. If application CSS itself is blocked, this visual guard is unavailable.
