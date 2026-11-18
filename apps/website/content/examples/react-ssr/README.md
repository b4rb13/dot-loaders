# React SSR / CSP example

Private preview 0.0.0-m2.0; no public npm install or publication. Bun 1.4.3, React 19.3.1, TypeScript 7.0.2. Copy the reviewed frozen core and React tarballs into vendor/ using the package.json filenames. Do not substitute a different build.

1. bun install --ignore-scripts
2. bun run build
3. bun run check
4. bun run start

Open http://127.0.0.1:4233/?mode=external (also mode=nonce and mode=hash). Add &state=pending to inspect actual pending SSR. With JavaScript disabled/blocked, loading buttons stay disabled and the ordinary server-content link opens a ready page. Refresh retains current content; replacement loading guards it; application buttons model request outcomes without making real network requests. Input/counter identity stays stable. Pause and system preferences remain authoritative.

The Bun server renders React HTML on every document request, sets an enforced CSP response header and hydrates the same document. It generates a fresh cryptographic script nonce; nonce style mode shares that request value, hash mode computes exact exported native+React style-string hashes, external mode serves matching CSS into each root. App styling uses an external stylesheet and no style attributes. This example has no unsafe-inline/eval allowance. Port can be changed with PORT.

For production adapt data fetching, failures/cancellation, localized announcements, authorization and hosting policy to your application. This local example does not qualify all React versions, browsers, AT, deployments or open M2/M4 gates. Tarballs, source and assets remain private; no publishing command is provided.

Application app.css supplies a pre-definition pending-content visibility guard. The frozen adapter renders static placeholders/state but does not hide real children before native definition by itself. Once defined, the native owner controls presentation. Visual guards are not authorization: never send sensitive content based on these CSS guards. If application CSS itself is blocked, this visual guard is unavailable.
