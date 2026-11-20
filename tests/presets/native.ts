import * as core from 'dotquilt';
import {
  authoredHandoff,
  authoredPreset,
  cases,
  css,
  diagnostics,
  presets,
} from './shared.js';

const captured = document.getElementById('value');
const observed = diagnostics();
// Rich properties are deliberately assigned before definitions are registered.
for (const [id, family, , , asset] of cases) {
  const host = document.getElementById(id);
  if (host) {
    Reflect.set(host, 'stylePolicy', css(asset));
    Reflect.set(host, 'preset', presets[family]);
  }
}
const region = document.getElementById('region');
if (region) {
  Reflect.set(region, 'stylePolicy', css('region'));
  Reflect.set(region, 'preset', presets.region);
}
for (const register of [
  core.registerSkeletonBlock,
  core.registerSkeletonLine,
  core.registerSkeletonCircle,
  core.registerSkeletonText,
  core.registerTypingDots,
  core.registerTextLoader,
  core.registerChartLoader,
  core.registerTableLoader,
  core.registerLoadingRegion,
])
  register();
Object.assign(window, {
  presets: {
    ...observed,
    patch: (id: string, patch: Record<string, unknown>) => {
      const host = document.getElementById(id) as HTMLElement & {
        update(patch: object): void;
      };
      host.update(patch);
    },
    identity: () => captured === document.getElementById('value'),
    remove: () => document.getElementById('stage')?.remove(),
    customHandoff: (explicit = false) => {
      (document.getElementById('region') as core.LoadingRegion).update({
        preset: authoredPreset(),
        animations: explicit
          ? { handoff: authoredHandoff('fixture/explicit-reveal') }
          : undefined,
      });
    },
  },
});
