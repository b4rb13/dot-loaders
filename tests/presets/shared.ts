import { defineAnimation, definePreset } from 'dotquilt/animations';

export const cases = [
  ['block', 'skeleton', 'skeleton-block', 'SkeletonBlock', 'skeleton'],
  ['line', 'skeleton', 'skeleton-line', 'SkeletonLine', 'line'],
  ['circle', 'skeleton', 'skeleton-circle', 'SkeletonCircle', 'circle'],
  ['multiline', 'skeleton', 'skeleton-text', 'SkeletonText', 'skeleton-text'],
  ['typing', 'typing', 'typing-dots', 'TypingDots', 'typing'],
  ['text', 'text', 'text-loader', 'TextLoader', 'text'],
  ['chart', 'chart', 'chart-loader', 'ChartLoader', 'chart'],
  ['table', 'table', 'table-loader', 'TableLoader', 'table'],
] as const;
export const css = (name: string, framework = 'core') => ({
  mode: 'external' as const,
  href: `/${framework}/styles/${name}.css`,
});
export const presets = {
  skeleton: definePreset({
    kind: 'skeleton',
    speed: 0.6,
    pointerResponse: 'lift',
  }),
  text: definePreset({
    kind: 'text',
    speed: 0.7,
    pointerResponse: 'lift',
    timing: { duration: 500, easing: 'linear' },
  }),
  chart: definePreset({
    kind: 'chart',
    variant: 'scatter',
    speed: 0.5,
    pointerResponse: 'lift',
  }),
  table: definePreset({ kind: 'table', speed: 0.4, pointerResponse: 'lift' }),
  typing: definePreset({ kind: 'typing', count: 5, speed: 0.8 }),
  region: definePreset({
    kind: 'region',
    timing: { duration: 600, easing: 'linear' },
  }),
};

export function authoredHandoff(id = 'fixture/preset-reveal') {
  return defineAnimation({
    contractVersion: 1,
    id,
    family: 'region',
    phase: 'handoff',
    options: { parse: () => ({}) },
    duration: () => 750,
    prepare: () => undefined,
    frame: (context) => {
      context.reveal({ opacity: context.frame.progress });
      return undefined;
    },
  })();
}
export function authoredPreset() {
  return definePreset({
    kind: 'region',
    animations: { handoff: authoredHandoff() },
    timing: { duration: 650 },
  });
}

export interface FixtureAPI {
  errors: { id: string; code: string }[];
  events: { id: string; type: string; animation: string; reason?: string }[];
  patch(id: string, patch: Record<string, unknown>): void;
  identity(): boolean;
  remove(): void;
  customHandoff(explicit?: boolean): void;
}
declare global {
  interface Window {
    presets: FixtureAPI;
  }
}
export function diagnostics(): Pick<FixtureAPI, 'errors' | 'events'> {
  const errors: FixtureAPI['errors'] = [],
    events: FixtureAPI['events'] = [];
  document.addEventListener('dotquilt-error', (event) =>
    errors.push({
      id: (event.target as HTMLElement).id,
      code: (event as CustomEvent<{ code: string }>).detail.code,
    }),
  );
  for (const type of [
    'dotquilt-handoff-start',
    'dotquilt-handoff-end',
    'dotquilt-handoff-cancel',
  ] as const)
    document.addEventListener(type, (event) =>
      events.push({
        id: (event.target as HTMLElement).id,
        type,
        ...(event as CustomEvent<{ animation: string; reason?: string }>)
          .detail,
      }),
    );
  return { errors, events };
}
