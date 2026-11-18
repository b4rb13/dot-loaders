import { defineAnimation } from '@dotquilt-internal/core/animations';
import { morphWipe, scan } from '@dotquilt-internal/core/animations/chart';
import { rows, tableShimmer } from '@dotquilt-internal/core/animations/table';
import {
  lock,
  scrambleCharacters,
} from '@dotquilt-internal/core/animations/text';
export const chartAnimations = { idle: scan(), handoff: morphWipe() };
export const tableAnimations = {
  idle: tableShimmer({ cellStyle: 'badge' }),
  handoff: rows(),
};
export const textAnimations = { idle: scrambleCharacters(), handoff: lock() };
// Pure region output: this intentionally replaces child morphs rather than merging providers.
export const wrapperReveal = defineAnimation({
  contractVersion: 1,
  id: 'examples/report-wrapper',
  family: 'region',
  phase: 'handoff',
  options: { parse: () => ({}) },
  duration: () => 600,
  prepare: () => null,
  frame({ frame, reveal }) {
    reveal({ opacity: frame.progress });
  },
})();
