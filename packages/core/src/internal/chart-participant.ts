/** Region-owned handoff preparation; never another readiness controller. */
export const chartHandoff: unique symbol = Symbol('dotquilt.chart-handoff');
export interface RichParticipant extends HTMLElement {
  [chartHandoff](
    owner: import('../region.js').LoadingRegion,
    participants?: readonly RichParticipant[],
  ): import('./handoff.js').HandoffSource;
}
