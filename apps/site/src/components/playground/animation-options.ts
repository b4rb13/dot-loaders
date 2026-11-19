/**
 * Every animation's options, with the ranges the factories accept
 * (packages/core/src/*-animations.ts). The playground builds its sliders from
 * this table and writes non-default values into the code it generates.
 */
import type { Component } from './settings';

export interface NumberOption {
  readonly key: string;
  readonly label: string;
  readonly default: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: string;
}
export interface ChoiceOption {
  readonly key: string;
  readonly label: string;
  readonly default: string;
  readonly values: readonly (readonly [string, string])[];
}
export type AnimationOption = NumberOption | ChoiceOption;

const n = (
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  unit = '',
): NumberOption => ({ key, label, default: value, min, max, step, unit });

const textHandoff = [
  n('staggerMs', 'Stagger', 40, 0, 60, 1, 'ms'),
  n('reelMs', 'Reel', 55, 0, 100, 1, 'ms'),
  n('settleMs', 'Settle', 300, 40, 400, 10, 'ms'),
  n('pop', 'Pop', 0, 0, 0.3, 0.01),
];
const tableIdle: AnimationOption[] = [
  n('cadenceMs', 'Cadence', 600, 250, 1200, 10, 'ms'),
  {
    key: 'cellStyle',
    label: 'Cells',
    default: 'auto',
    values: [
      ['auto', 'From columns'],
      ['text', 'Text'],
      ['number', 'Number'],
      ['badge', 'Badge'],
      ['date', 'Date'],
      ['badge-text', 'Badge, text'],
      ['text-badge', 'Text, badge'],
    ],
  },
];
const scrambleRate = (value: number) => [
  n('changesPerSecond', 'Changes', value, 0.5, 4, 0.1, '/s'),
];

export const animationOptions: Record<string, readonly AnimationOption[]> = {
  pulse: [n('periodMs', 'Glow period', 2800, 800, 4000, 100, 'ms')],
  dissolve: [
    n('duration', 'Duration', 300, 0, 2000, 50, 'ms'),
    n('fallPx', 'Fall', 5, 0, 8, 0.5, 'px'),
  ],
  scramble: scrambleRate(3.6),
  scrambleCharacters: scrambleRate(2.8),
  scrambleWords: scrambleRate(2.8),
  labelPulse: [n('travelPxPerSecond', 'Travel', 70, 20, 140, 1, 'px/s')],
  lock: textHandoff,
  printText: textHandoff,
  fade: [n('duration', 'Duration', 150, 0, 4000, 50, 'ms')],
  ridge: [
    n('amplitude', 'Amplitude', 0.24, 0, 0.4, 0.01),
    n('highlightWidth', 'Highlight', 90, 20, 180, 1, 'px'),
  ],
  scan: [
    n('amplitude', 'Amplitude', 0.24, 0, 0.4, 0.01),
    n('bandWidth', 'Band', 36, 12, 80, 1, 'px'),
    n('trail', 'Trail', 160, 40, 240, 1, 'px'),
  ],
  terrain: [
    n('amplitude', 'Amplitude', 0.24, 0, 0.4, 0.01),
    n('relief', 'Relief', 1, 0.4, 1.4, 0.05),
  ],
  bars: [n('sway', 'Sway', 0.07, 0, 0.12, 0.01)],
  scatter: [
    n('radius', 'Radius', 13, 6, 24, 1, 'px'),
    n('spread', 'Spread', 0.24, 0.1, 0.35, 0.01),
    n('sway', 'Sway', 0.045, 0, 0.1, 0.005),
  ],
  cycle: [
    n('holdMs', 'Hold', 3200, 800, 3200, 100, 'ms'),
    n('blendMs', 'Blend', 460, 200, 600, 10, 'ms'),
  ],
  morphWipe: [
    n('morphEnd', 'Glide ends', 0.55, 0.55, 0.95, 0.01),
    n('wipeStart', 'Draw starts', 0.48, 0.15, 0.6, 0.01),
    n('edge', 'Edge', 40, 4, 80, 1, 'px'),
  ],
  typeOn: tableIdle,
  tableShimmer: tableIdle,
  rows: [
    n('staggerMs', 'Row stagger', 80, 0, 120, 1, 'ms'),
    n('settlePx', 'Settle', 5, 0, 8, 0.5, 'px'),
  ],
};

/** The built-in animation each component uses when none is chosen. */
export const defaultIdle: Record<Component, string | undefined> = {
  skeleton: 'pulse',
  text: 'scramble',
  chart: 'ridge',
  table: 'tableShimmer',
  typing: undefined,
};
/** Skeleton, text, table and typing hand over with the built-in morph, which has no options. */
export const defaultHandoff: Record<Component, string | undefined> = {
  skeleton: undefined,
  text: undefined,
  chart: 'morphWipe',
  table: undefined,
  typing: undefined,
};

/** Only the options that differ from their defaults. */
export function changed(
  name: string | undefined,
  values: Readonly<Record<string, number | string>>,
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const option of (name && animationOptions[name]) || [])
    if (
      values[option.key] !== undefined &&
      values[option.key] !== option.default
    )
      out[option.key] = values[option.key] as number | string;
  return out;
}
