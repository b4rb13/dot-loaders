import { dissolve } from '@dotquilt-internal/core/animations/skeleton';
import type { LoadingRegion } from '@dotquilt-internal/core/region';
import { registerLoadingRegion } from '@dotquilt-internal/core/region';
import type { SkeletonText } from '@dotquilt-internal/core/skeleton';
import {
  registerSkeletonBlock,
  registerSkeletonCircle,
  registerSkeletonLine,
  registerSkeletonText,
} from '@dotquilt-internal/core/skeleton';
import type { TypingDots } from '@dotquilt-internal/core/typing';
import { registerTypingDots } from '@dotquilt-internal/core/typing';

const mode = new URL(location.href).searchParams.get('mode');
for (const host of document.querySelectorAll<HTMLElement>('[data-host]')) {
  const css = host.dataset.css;
  Reflect.set(
    host,
    'stylePolicy',
    mode?.startsWith('external')
      ? {
          mode: 'external',
          href: `/core/styles/${mode === 'external-family' && css !== 'region' && css !== 'typing' ? 'skeleton-family' : css}.css`,
        }
      : {
          mode: 'inline',
          ...(mode === 'nonce' ? { nonce: 'm4-fixture' } : {}),
        },
  );
}
const text = document.querySelector<SkeletonText>('#multiline');
if (text) {
  text.lines = 4;
  text.widths = [0.8, 0.4];
}
for (const register of [
  registerSkeletonBlock,
  registerSkeletonLine,
  registerSkeletonCircle,
  registerSkeletonText,
  registerTypingDots,
  registerLoadingRegion,
])
  register();
const events: { type: string; reason?: string }[] = [];
const region = document.querySelector<LoadingRegion>('#region');
for (const type of [
  'dotquilt-handoff-start',
  'dotquilt-handoff-end',
  'dotquilt-handoff-cancel',
  'dotquilt-error',
])
  document.addEventListener(type, (event) => {
    if (event.target === region)
      events.push({ type, reason: (event as CustomEvent).detail.reason });
  });
const before = document.querySelector('#value');
const diagnostics: string[] = [];
document.addEventListener('dotquilt-error', (event) =>
  diagnostics.push((event as CustomEvent).detail.code),
);
Object.assign(window, {
  m4: {
    events,
    diagnostics,
    identity: () => before === document.querySelector('#value'),
    update: (id: string, patch: object) =>
      (
        document.getElementById(id) as unknown as {
          update(patch: object): void;
        }
      ).update(patch),
    ready: (duration = 300) =>
      region?.update({ state: 'ready', timing: { duration } }),
    pending: (cycle: string) => region?.update({ state: 'pending', cycle }),
    widths: () => text?.widths,
    count: () => document.querySelector<TypingDots>('#typing')?.count,
    dissolve: (id: string, options: Parameters<typeof dissolve>[0]) => {
      const host = document.getElementById(id);
      if (host) Reflect.set(host, 'animations', { handoff: dissolve(options) });
    },
  },
});
