import type {
  LoadingState,
  StylePolicy,
} from '@dotquilt-internal/react/region';
import { Example } from './Example';
export type Mode = 'external' | 'nonce' | 'hash';
export function Document({
  state,
  mode,
  nonce,
}: {
  state: LoadingState;
  mode: Mode;
  nonce: string;
}) {
  const policy: StylePolicy =
    mode === 'external'
      ? { mode: 'external', href: '/dotquilt/region.css' }
      : mode === 'nonce'
        ? { mode: 'inline', nonce }
        : { mode: 'inline' };
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Dotquilt React SSR example</title>
        <link rel="stylesheet" href="/app.css" />
      </head>
      <body data-state={state} data-mode={mode}>
        <main>
          <h1>React server rendering</h1>
          <p>
            The application controls this illustrative account and its request
            outcome.
          </p>
          <Example initialState={state} policy={policy} />
          <a id="recovery" href={`/?mode=${mode}`}>
            Open the available server content
          </a>
          <noscript>
            <p>
              Loading controls require JavaScript. Use the server content link
              to recover from a pending page.
            </p>
          </noscript>
        </main>
        <script id="bootstrap" type="module" src="/client.js" nonce={nonce} />
      </body>
    </html>
  );
}
