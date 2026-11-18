export type LoadingState = 'pending' | 'refreshing' | 'ready';
export type Motion = 'system' | 'paused';
export type StylePolicy =
  | Readonly<{ mode: 'inline'; nonce?: string }>
  | Readonly<{ mode: 'external'; href: string }>;
export interface Timing {
  readonly duration?: number;
  readonly easing?: string;
}
export interface HandoffDetail {
  readonly cycle: string | undefined;
  readonly handoffId: number;
  readonly animation: string;
  readonly reason?: string;
}
export interface LoaderErrorDetail {
  readonly code: string;
  readonly field: string;
}
export class LoaderRegistrationError extends Error {
  readonly code = 'registration-conflict';
  constructor(readonly elementName: string) {
    super(
      `${elementName} is already defined by other code. Load one copy of Dotquilt per page.`,
    );
    this.name = 'LoaderRegistrationError';
  }
}
export class LoaderConfigurationError extends TypeError {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LoaderConfigurationError';
  }
}
export interface DotquiltEventMap {
  'dotquilt-handoff-start': CustomEvent<HandoffDetail>;
  'dotquilt-handoff-end': CustomEvent<HandoffDetail>;
  'dotquilt-handoff-cancel': CustomEvent<HandoffDetail>;
  'dotquilt-error': CustomEvent<LoaderErrorDetail>;
}

declare global {
  interface HTMLElementEventMap extends DotquiltEventMap {}
  interface HTMLElementTagNameMap {
    'dotquilt-table-loader': import('./table.js').TableLoader;
    'dotquilt-chart-loader': import('./chart.js').ChartLoader;
    'dotquilt-text-loader': import('./text.js').TextLoader;
    'dotquilt-region': import('./region.js').LoadingRegion;
    'dotquilt-skeleton-block': import('./skeleton.js').SkeletonBlock;
    'dotquilt-skeleton-line': import('./skeleton-line.js').SkeletonLine;
    'dotquilt-skeleton-circle': import('./skeleton-circle.js').SkeletonCircle;
    'dotquilt-skeleton-text': import('./skeleton-text.js').SkeletonText;
    'dotquilt-typing-dots': import('./typing.js').TypingDots;
  }
}
