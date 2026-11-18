import * as components from '@dotquilt-internal/react';
import {
  type ComponentType,
  createElement as h,
  StrictMode,
  useLayoutEffect,
  useState,
} from 'react';
import { hydrateRoot } from 'react-dom/client';
import {
  authoredHandoff,
  authoredPreset,
  cases,
  css,
  diagnostics,
  type FixtureAPI,
  presets,
} from './shared.js';

const catalog = {
  SkeletonBlock: components.SkeletonBlock,
  SkeletonLine: components.SkeletonLine,
  SkeletonCircle: components.SkeletonCircle,
  SkeletonText: components.SkeletonText,
  TypingDots: components.TypingDots,
  TextLoader: components.TextLoader,
  ChartLoader: components.ChartLoader,
  TableLoader: components.TableLoader,
};
export function PresetFixture() {
  const [patches, setPatches] = useState<
    Record<string, Record<string, unknown>>
  >({});
  useLayoutEffect(() => {
    window.presets.customHandoff = (explicit = false) =>
      setPatches((previous) => ({
        ...previous,
        region: {
          ...previous.region,
          preset: authoredPreset(),
          animations: explicit
            ? { handoff: authoredHandoff('fixture/explicit-reveal') }
            : undefined,
        },
      }));
    window.presets.patch = (id, patch) =>
      setPatches((previous) => ({
        ...previous,
        [id]: { ...previous[id], ...patch },
      }));
  }, []);
  const surfaces = cases.map(([id, family, , component, asset]) =>
    h(catalog[component] as ComponentType<Record<string, unknown>>, {
      id,
      key: id,
      preset: presets[family],
      stylePolicy: css(asset, 'react'),
      ...(id === 'text'
        ? { state: 'pending', mask: '00.00', children: '42.50' }
        : {}),
      ...patches[id],
    }),
  );
  return h(
    'div',
    { id: 'stage' },
    h(
      components.LoadingRegion,
      {
        id: 'region',
        state: 'pending',
        preset: presets.region,
        stylePolicy: css('region', 'react'),
        placeholder: h('div', { id: 'placeholder' }, ...surfaces.slice(0, 5)),
        ...patches.region,
      },
      h('input', {
        id: 'value',
        defaultValue: 'original',
        'aria-label': 'Value',
      }),
    ),
    ...surfaces.slice(5),
  );
}
if (typeof window !== 'undefined') {
  let root: ReturnType<typeof hydrateRoot> | undefined;
  window.presets = {
    ...diagnostics(),
    patch() {},
    customHandoff() {},
    identity: () => captured === document.getElementById('value'),
    remove: () => root?.unmount(),
  } satisfies FixtureAPI;
  const captured = document.getElementById('value');
  root = hydrateRoot(
    document.getElementById('app') as HTMLElement,
    h(StrictMode, null, h(PresetFixture)),
  );
}
