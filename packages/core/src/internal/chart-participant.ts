/** Region-owned handoff preparation; never another readiness controller. */
export const chartHandoff: unique symbol = Symbol('dotquilt.chart-handoff');
/** Whether a dense loader needs its own rich handoff: a provider or a chosen animation. */
export const richHandoff: unique symbol = Symbol('dotquilt.rich-handoff');
export interface RichParticipant extends HTMLElement {
  readonly [richHandoff]: boolean;
  [chartHandoff](
    owner: import('../region.js').LoadingRegion,
    participants?: readonly RichParticipant[],
  ): import('./handoff.js').HandoffSource;
}
