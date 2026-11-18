/** Region-owned handoff preparation; never another readiness controller. */
export const chartHandoff: unique symbol = Symbol.for(
  'dotquilt.chart-handoff.v1',
);
export interface RichParticipant extends HTMLElement {
  [chartHandoff](
    owner: import('../region.js').LoadingRegion,
    participants?: readonly RichParticipant[],
  ): import('./handoff.js').HandoffSource;
}
