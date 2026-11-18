import {
  bars,
  cycle,
  morphWipe,
  ridge,
  scan,
  scatter,
  terrain,
} from '@dotquilt-internal/core/animations/chart';
import { dissolve, pulse } from '@dotquilt-internal/core/animations/skeleton';
import {
  rows,
  tableShimmer,
  typeOn,
} from '@dotquilt-internal/core/animations/table';
import {
  fade,
  labelPulse,
  lock,
  printText,
  scramble,
  scrambleCharacters,
  scrambleWords,
} from '@dotquilt-internal/core/animations/text';

// Local bindings are immutable data. Assign a family's bindings to `animations`;
// use `preset` for shared defaults. The owning region controls the total handoff.
export const recipes = {
  skeleton: {
    idle: [pulse({ periodMs: 1600 })],
    handoff: [dissolve({ duration: 300, fallPx: 5 })],
  },
  text: {
    idle: [
      scramble({ changesPerSecond: 2.8 }),
      scrambleCharacters({ changesPerSecond: 2.8 }),
      scrambleWords({ changesPerSecond: 2.8 }),
      labelPulse({ travelPxPerSecond: 70 }),
    ],
    handoff: [
      lock({ staggerMs: 24, reelMs: 55, settleMs: 90, pop: 0.2 }),
      printText({ staggerMs: 24, reelMs: 55, settleMs: 90, pop: 0.2 }),
      fade({ duration: 150 }),
    ],
  },
  chart: {
    idle: [
      ridge({ amplitude: 0.24, highlightWidth: 90 }),
      scan({ amplitude: 0.24, bandWidth: 36, trail: 160 }),
      terrain({ amplitude: 0.24, relief: 1 }),
      bars({ sway: 0.07 }),
      scatter({ radius: 13, spread: 0.24, sway: 0.045 }),
      cycle({ holdMs: 3200, blendMs: 460 }),
    ],
    handoff: [morphWipe({ morphEnd: 0.86, wipeStart: 0.29, edge: 40 })],
  },
  table: {
    idle: [
      typeOn({ cadenceMs: 600, cellStyle: 'auto' }),
      tableShimmer({ cadenceMs: 600, cellStyle: 'text-badge' }),
    ],
    handoff: [rows({ staggerMs: 35, settlePx: 4 })],
  },
} as const;
