import type { ChartLoader } from './chart.js';
import { chartHandoff, richHandoff } from './internal/chart-participant.js';
import { node, register } from './internal/dom.js';
import type { HandoffSource } from './internal/handoff.js';
import { LoadingController } from './internal/loading-controller.js';
import { curves } from './internal/marks.js';
import { createSkeletonSource } from './internal/skeleton-source.js';
import type { SkeletonBlock } from './skeleton.js';
import { regionStyles } from './styles.js';
import type { TableLoader } from './table.js';
import type { LoadingState } from './types.js';
import type { TypingDots } from './typing.js';
export class LoadingRegion extends LoadingController<'region'> {
  #thread: HTMLElement | undefined;
  #pass: Animation[] = [];
  /**
   * The refresh cue (design/SPEC.md): a row of marks along the top edge.
   * It sits just above the region, so the content never moves.
   */
  protected override refreshCue(): Element {
    if (!this.#thread) {
      this.#thread = node(this.ownerDocument, 'span', {
        class: 'thread',
        part: 'refresh-thread',
        'aria-hidden': 'true',
      });
      this.#thread.append(node(this.ownerDocument, 'span', { class: 'glow' }));
    }
    return this.#thread;
  }
  /** It eases in, and the glow drifts along it once (2.8 s, under the 4 s limit). */
  protected override refreshStarted(cue: Element): void {
    for (const animation of this.#pass.splice(0)) animation.cancel();
    if (!this.canAnimate()) return;
    try {
      this.#pass.push(
        cue.animate(
          { opacity: [0, 1] },
          { duration: 320, easing: curves.settle },
        ),
        (cue.firstElementChild as Element).animate(
          { maskPosition: ['-70% 0', '170% 0'] },
          { duration: 2800, easing: curves.sine },
        ),
      );
    } catch {
      this.report('animation-failed', 'animations');
    }
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const animation of this.#pass.splice(0)) animation.cancel();
  }
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
    // A table hands over like every other placeholder (morph.ts) unless a
    // chart is in the placeholder or anyone picks an animation.
    const morph =
      !rich.some(
        (participant) => participant.localName === 'dotquilt-chart-loader',
      ) &&
      !this.animations.handoff &&
      !this.preset?.animations?.handoff &&
      !rich.some((participant) => participant[richHandoff]);
    if (chart && !morph) {
      const binding =
        this.animations.handoff ?? this.preset?.animations?.handoff;
      if (binding) return { binding, host: this, animation: binding.id };
      return chart[chartHandoff](this, rich);
    }
    const child = participants.find(
      (participant): participant is SkeletonBlock =>
        'animations' in participant && !(chartHandoff in participant),
    );
    return createSkeletonSource(child, this, participants);
  }
}
export function registerLoadingRegion(): void {
  register('dotquilt-region', LoadingRegion);
}
export { refreshStyles } from './internal/element.js';

export type RegionPreset = import('./internal/preset.js').Preset<'region'>;
