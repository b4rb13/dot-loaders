import {
  bars,
  morphWipe,
  ridge,
  scatter,
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
  scramble,
} from '@dotquilt-internal/core/animations/text';

// Local bindings are immutable data. Assign a family's bindings to `animations`;
// use `preset` for shared defaults. The owning region controls the total handoff.
export const recipes = {
  skeleton: {
    idle: [pulse({ periodMs: 2800 })],
    handoff: [dissolve({ duration: 300, fallPx: 5 })],
  },
  text: {
    idle: [
      scramble({ changesPerSecond: 1000 / 280 }),
      labelPulse({ travelPxPerSecond: 70 }),
    ],
    handoff: [
      lock({ staggerMs: 40, reelMs: 55, settleMs: 300, pop: 0 }),
      fade({ duration: 150 }),
    ],
  },
  chart: {
    idle: [
      ridge({ amplitude: 0.24, highlightWidth: 90 }),
      bars({ sway: 0.07 }),
      scatter({ radius: 13, spread: 0.24, sway: 0.045 }),
    ],
    handoff: [morphWipe({ morphEnd: 0.55, wipeStart: 0.48, edge: 40 })],
  },
  table: {
    idle: [
      tableShimmer({ cadenceMs: 600, cellStyle: 'auto' }),
      typeOn({ cadenceMs: 600, cellStyle: 'text-badge' }),
    ],
    handoff: [rows({ staggerMs: 80, settlePx: 5 })],
  },
} as const;
