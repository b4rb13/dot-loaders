import { createElement as h, StrictMode, Suspense, use } from 'react';
import { renderToReadableStream, renderToString } from 'react-dom/server';
import { Catalog } from './catalog';
import { Fixture, type FixtureOptions } from './fixture';
export function render(options: FixtureOptions) {
  return renderToString(
    h(
      StrictMode,
      null,
      h(
        Suspense,
        null,
        options.catalog
          ? h(Catalog, {
              initialState: options.state,
              policy:
                options.mode === 'external'
                  ? { mode: 'external', href: '/pkg/react/dist/region.css' }
                  : {
                      mode: 'inline',
                      ...(options.mode === 'nonce'
                        ? { nonce: options.nonce }
                        : {}),
                    },
            })
          : h(Fixture, options),
      ),
    ),
  );
}
function Deferred({ promise }: { promise: Promise<string> }) {
  return h('p', { id: 'streamed-detail' }, use(promise));
}
export function stream(options: FixtureOptions) {
  const promise = new Promise<string>((resolve) =>
    setTimeout(() => resolve('Streamed detail'), 250),
  );
  return renderToReadableStream(
    h(
      StrictMode,
      null,
      h(
        Suspense,
        null,
        options.catalog
          ? h(Catalog, {
              initialState: options.state,
              policy:
                options.mode === 'external'
                  ? { mode: 'external', href: '/pkg/react/dist/region.css' }
                  : {
                      mode: 'inline',
                      ...(options.mode === 'nonce'
                        ? { nonce: options.nonce }
                        : {}),
                    },
              extra: h(Deferred, { promise }),
            })
          : h(Fixture, { ...options, extra: h(Deferred, { promise }) }),
      ),
    ),
    { nonce: options.nonce },
  );
}
