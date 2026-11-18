import type { ChartLoader } from './chart.js';
import { chartHandoff } from './internal/chart-participant.js';
import { node, register } from './internal/dom.js';
import type { HandoffSource } from './internal/handoff.js';
import { LoadingController } from './internal/loading-controller.js';
import { createSkeletonSource } from './internal/skeleton-source.js';
import type { SkeletonBlock } from './skeleton.js';
import { regionStyles } from './styles.js';
import type { TableLoader } from './table.js';
import type { LoadingState } from './types.js';
import type { TypingDots } from './typing.js';
export class LoadingRegion extends LoadingController<'region'> {
  /** A region draws no marks of its own; its placeholder takes `mark`. */
  protected override get optionNames(): readonly string[] {
    return super.optionNames.filter((name) => name !== 'mark');
  }
  protected override contentChanged(): void {
    this.refresh();
  }
  protected override settled(): void {}
  protected override get family(): 'region' {
    return 'region';
  }
  protected override get styles(): readonly string[] {
    return regionStyles;
  }
  protected override placeholderChanged(
    placeholder: HTMLSlotElement,
    state: LoadingState,
  ): void {
    if (state === 'pending' && !placeholder.assignedNodes().length) {
      if (!placeholder.firstChild)
        placeholder.append(
          node(this.ownerDocument, 'span', { class: 'fallback' }),
        );
      this.report('missing-placeholder', 'placeholder');
    }
  }
  protected participants(): (
    | SkeletonBlock
    | TypingDots
    | ChartLoader
    | TableLoader
  )[] {
    return [
      ...this.querySelectorAll<
        SkeletonBlock | TypingDots | ChartLoader | TableLoader
      >('[data-dotquilt-surface]'),
    ].filter((child) => child.owner === this);
  }
  protected override refreshParticipants(): void {
    for (const child of this.participants()) child.refresh();
  }
  protected override handoffSource(): HandoffSource {
    const participants = this.participants();
    const rich = participants.filter(
      (participant): participant is ChartLoader | TableLoader =>
        chartHandoff in participant,
    );
    const chart = rich[0];
    if (chart) {
      const binding =
        this.animations.handoff ?? this.preset?.animations?.handoff;
      if (binding) return { binding, host: this, animation: binding.id };
      return chart[chartHandoff](this, rich);
    }
    const child = participants.find(
      (participant): participant is SkeletonBlock =>
        'animations' in participant,
    );
    return createSkeletonSource(child, this, participants);
  }
}
export function registerLoadingRegion(): void {
  register('dotquilt-region', LoadingRegion);
}
export { refreshStyles } from './internal/element.js';

export type RegionPreset = import('./internal/preset.js').Preset<'region'>;
