import { createElement as h, StrictMode, Suspense } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Catalog } from './catalog';
import { Fixture, type FixtureOptions } from './fixture';

const container = document.getElementById('root') as HTMLElement;
const options: FixtureOptions = {
  catalog: container.dataset.catalog === 'yes',
  state: container.dataset.state as FixtureOptions['state'],
  mode: container.dataset.mode ?? 'hash',
  nonce: container.nonce,
  skeletonOnly: container.dataset.skeleton === 'yes',
  empty: container.dataset.empty === 'yes',
};
let root: ReturnType<typeof hydrateRoot> | undefined;
window.hydrateFixture = () => {
  root ??= hydrateRoot(
    container,
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
    {
      onRecoverableError: (error) =>
        window.fixtureErrors.push(`hydration:${String(error)}`),
    },
  );
};
window.destroyFixture = () => {
  root?.unmount();
  root = undefined;
};
if (!new URL(location.href).searchParams.has('delay')) window.hydrateFixture();
