import type { AnimationSurface, Animations, Dot, Rect } from './animations.js';
import { chartStyles } from './chart-styles.js';
import { definitionOf, validateBindings } from './internal/binding.js';
import { chartAppearance } from './internal/chart-appearance.js';
import {
  defaultMorphWipe,
  defaultRidge,
} from './internal/chart-definitions.js';
import {
  chartHandoff,
  type RichParticipant,
} from './internal/chart-participant.js';
import {
  chartProjection,
  emptyChartSource as empty,
  emptyChartInput as emptyInput,
} from './internal/chart-projection.js';
import { contentBox, surfaceEnvironment } from './internal/content-box.js';
import { coordinatedHandoff } from './internal/coordinated-handoff.js';
import {
  installDensePainter,
  invalidateDensePainter,
} from './internal/dense/managed-painter.js';
import {
  ancestors,
  installStyles,
  media,
  motionRestricted,
  node,
  register,
  upgradeProperties,
} from './internal/dom.js';
import { type Activity, ManagedElement } from './internal/element.js';
import { EventElement } from './internal/event-element.js';
import type { LoadingController } from './internal/loading-controller.js';
import { pointer } from './internal/painter.js';
import type { Preset } from './internal/preset.js';
import { chartPreset } from './internal/preset.js';
import { capturePresetData } from './internal/preset-data.js';
import type { Runner } from './internal/runner.js';
import { readSurface } from './internal/surface.js';
import type { LoadingRegion } from './region.js';
import type { Motion, StylePolicy } from './types.js';
export type ChartVariant = 'line' | 'bar' | 'scatter';
export interface Point {
  readonly x: number;
  readonly y: number;
}
export type ChartInput =
  | Readonly<{ kind: 'line'; points: readonly Point[]; baseline: number }>
  | Readonly<{ kind: 'bar'; bars: readonly Rect[]; baseline: number }>
  | Readonly<{ kind: 'scatter'; points: readonly Point[] }>;
export type TargetGeometry =
  | ChartInput
  | Readonly<{ kind: 'points'; points: readonly Point[] }>
  | Readonly<{ kind: 'rects'; rects: readonly Rect[] }>;
export type TargetProvider = (
  bounds: Readonly<{ width: number; height: number }>,
) => TargetGeometry | null;
export type ChartPreset = import('./internal/preset.js').Preset<'chart'>;
interface Owner extends HTMLElement {
  activity: Activity;
  state: string;
  presentation: string;
}
export class ChartLoader extends EventElement<'chart'> {
  protected override upgrade(): void {
    upgradeProperties(this, [
      'stylePolicy',
      'preset',
      'animations',
      'motion',
      'speed',
      'pointerResponse',
      'variant',
      'targetProvider',
    ]);
  }
  protected override capturePreset(value: Preset<'chart'>): Preset<'chart'> {
    return capturePresetData(value, 'chart', () => chartPreset);
  }
  static override observedAttributes = [
    ...ManagedElement.observedAttributes,
    'variant',
    'speed',
    'pointer-response',
  ];
  #bindings: Animations<'chart'> = {};
  #provider: TargetProvider | undefined;
  #runner: Runner | undefined;
  #createRunner: unknown;
  #source: readonly Dot[] = empty;
  #input: ChartInput = emptyInput;
  #geometry: AnimationSurface<'chart'> | undefined;
  #environment: string | undefined;
  get variant(): ChartVariant {
    const value = this.getAttribute('variant') ?? this.preset?.variant;
    return value === 'bar' || value === 'scatter' ? value : 'line';
  }
  set variant(value: ChartVariant | undefined) {
    if (value === undefined) this.removeAttribute('variant');
    else this.setAttribute('variant', value);
  }
  get speed(): number {
    const n = Number(this.getAttribute('speed') ?? this.preset?.speed ?? 1);
    return Number.isFinite(n) && n > 0 ? Math.min(4, n) : 1;
  }
  set speed(value: number | undefined) {
    if (value === undefined) this.removeAttribute('speed');
    else this.setAttribute('speed', String(value));
  }
  get pointerResponse(): 'none' | 'lift' {
    return (this.getAttribute('pointer-response') ??
      this.preset?.pointerResponse) === 'lift'
      ? 'lift'
      : 'none';
  }
  set pointerResponse(value: 'none' | 'lift' | undefined) {
    if (value === undefined) this.removeAttribute('pointer-response');
    else this.setAttribute('pointer-response', value);
  }
  get animations(): Animations<'chart'> {
    return this.#bindings;
  }
  set animations(value: Animations<'chart'> | undefined) {
    try {
      validateBindings(value, 'chart');
      this.#bindings = Object.freeze({ ...value });
      this.#runner?.reset?.();
    } catch {
      this.#bindings = {};
      this.report('invalid-binding', 'animations');
    }
    this.requestRender();
  }
  protected override presetChanged(): void {
    this.#runner?.reset?.();
  }
  get targetProvider(): TargetProvider | undefined {
    return this.#provider;
  }
  set targetProvider(value: TargetProvider | undefined) {
    this.#provider = typeof value === 'function' ? value : undefined;
    if (value !== undefined && !this.#provider)
      this.report('invalid-provider', 'targetProvider');
  }
  get owner(): Owner | undefined {
    return this.cachedOwner(() => {
      const owner = ancestors(this).find(
        (e) => e.localName === 'dotquilt-region',
      ) as Owner | undefined;
      if (!owner) return undefined;
      let top: Element = this;
      while (top.parentElement && top.parentElement !== owner)
        top = top.parentElement;
      return top.getAttribute('slot') === 'placeholder' ? owner : undefined;
    });
  }
  get activity(): Activity {
    return this.owner?.activity ?? this.ownActivity;
  }
  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (
      value !== null &&
      ((name === 'variant' && !['line', 'bar', 'scatter'].includes(value)) ||
        (name === 'pointer-response' && !['none', 'lift'].includes(value)) ||
        (name === 'speed' &&
          !(Number.isFinite(Number(value)) && Number(value) > 0)))
    )
      this.report('invalid-option', name);
    super.attributeChangedCallback(name, old, value);
  }
  override connectedCallback(): void {
    installDensePainter(this);
    // Remove static preset decoration before replaying explicit caller properties.
    const marker = 'data-dotquilt-preset-variant';
    const decoration = this.getAttribute(marker);
    if (decoration !== null) {
      if (
        !Object.hasOwn(this, 'variant') &&
        this.getAttribute('variant') === decoration
      )
        this.removeAttribute('variant');
      this.removeAttribute(marker);
    }
    super.connectedCallback();
    this.setAttribute('data-dotquilt-surface', '');
    this.setAttribute('aria-hidden', 'true');
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      installStyles(root, chartStyles, this.policy);
      root.append(
        node(this.ownerDocument, 'div', {
          class: 'surface',
          part: 'surface',
          'aria-hidden': 'true',
        }),
      );
    }
    for (const child of this.querySelectorAll(
      ':scope > [data-dotquilt-style],:scope > [data-dotquilt-static]',
    ))
      child.remove();
    this.listen(this.shadowRoot, 'load', () => this.refresh(), true);
    const pointerHost = this.owner ?? this;
    this.listen(pointerHost, 'pointermove', this.#pointer as EventListener);
    this.listen(pointerHost, 'pointerleave', this.#clearPointer);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#runner?.dispose();
    this.#provider = undefined;
    this.#clearPointer();
    this.#clear();
  }
  update(
    patch: Readonly<{
      variant?: ChartVariant | undefined;
      speed?: number | undefined;
      pointerResponse?: 'none' | 'lift' | undefined;
      animations?: Animations<'chart'> | undefined;
      preset?: ChartPreset | undefined;
      targetProvider?: TargetProvider | undefined;
      motion?: Motion | undefined;
      stylePolicy?: StylePolicy | undefined;
    }>,
  ): void {
    for (const [key, value] of Object.entries(patch))
      Reflect.set(this, key, value);
  }
  refresh(): void {
    invalidateDensePainter(this);
    this.#runner?.reset?.();
    this.#clear();
    this.resources?.eligible(true);
    this.requestRender();
  }
  [readSurface](
    _family: 'chart',
    ids: readonly string[] = [],
  ): AnimationSurface<'chart'> {
    if (!this.#geometry) {
      const { width, height } = contentBox(this);
      // Let CSS resolve lengths/calc once per invalidation, never per frame.
      const field = this.shadowRoot?.querySelector('.surface');
      const resolved =
        field && this.ownerDocument.defaultView?.getComputedStyle(field);
      const pitch = parseFloat(resolved?.backgroundSize ?? '') || 6,
        gap = parseFloat(resolved?.gap ?? ''),
        size = Math.max(0, pitch - (gap >= 0 ? gap : 4));
      this.#geometry = Object.freeze({
        family: 'chart',
        width,
        height,
        input: this.#input,
        source: this.#source,
        revealTargetIds: Object.freeze([...ids]),
        [chartAppearance]: Object.freeze({
          pitch: Math.max(2, Math.min(64, pitch)),
          scale: Math.max(0.1, Math.min(8, size / 2)),
        }),
      });
    }
    return this.#geometry;
  }
  [chartHandoff](
    owner: LoadingRegion,
    participants?: readonly RichParticipant[],
  ): ReturnType<LoadingController['handoffSource']> {
    if (participants && participants.length > 1)
      return coordinatedHandoff(
        owner,
        participants.map((child) => child[chartHandoff](owner)),
      );
    this.#clearPointer();
    const binding =
      this.#bindings.handoff ??
      this.preset?.animations?.handoff ??
      defaultMorphWipe;
    const provider = this.#provider,
      variant = this.variant,
      easing = owner.timing.easing;
    return [
      binding,
      this,
      binding.id,
      (
        selected,
        host,
        content,
        targets,
        duration,
        current,
        own,
        report,
        scope,
      ) => {
        const bounds = Object.freeze(contentBox(this));
        this.#input = chartProjection(provider, bounds, variant, report);
        this.#source = this.#runner?.capture?.() ?? empty;
        this.#runner?.dispose();
        this.#geometry = undefined;
        const valid = () =>
          current() && this.isConnected && this.owner === owner;
        const captured = selected ?? binding;
        let driver: import('./internal/handoff.js').HandoffDriver;
        try {
          driver = (
            definitionOf(captured)
              .handoff as typeof import('./internal/handoff.js').createHandoff
          )(
            captured,
            host,
            content,
            targets,
            duration,
            valid,
            own,
            report,
            scope,
          );
        } catch (error) {
          this.#clear();
          throw error;
        }
        return {
          ...driver,
          restricted: () => motionRestricted(this),
          draw: (linear, eased) =>
            driver.draw?.(linear, easing === undefined ? linear : eased),
          dispose: () => {
            driver.dispose();
            this.#clear();
          },
        };
      },
    ];
  }
  protected override environmentChanged(): void {
    const environment = surfaceEnvironment(this);
    if (environment === this.#environment) {
      // Nothing the drawing depends on changed: only re-check eligibility.
      this.resources?.eligible(true);
      this.requestRender();
      return;
    }
    this.#environment = environment;
    this.refresh();
  }
  #clear(): void {
    this.#geometry = undefined;
    this.#source = empty;
    this.#input = emptyInput;
  }
  #clearPointer = () => Reflect.deleteProperty(this, pointer);

  #pointer = (event: PointerEvent) => {
    if (
      this.pointerResponse !== 'lift' ||
      !this.hasAttribute('data-moving') ||
      event.pointerType === 'touch' ||
      !media(this.ownerDocument.defaultView, '(hover:hover) and (pointer:fine)')
    ) {
      // Lift no longer applies (touch, no hover, paused): drop the old position
      // so the drawing does not stay lifted at a stale point.
      this.#clearPointer();
      return;
    }
    const r = (
      this.shadowRoot?.querySelector('svg[data-dotquilt-painter]') ?? this
    ).getBoundingClientRect();
    if (!r.width || !r.height) return;
    Reflect.set(this, pointer, {
      x:
        (event.clientX - r.left) *
        ((this.#geometry?.width ?? r.width) / r.width),
      y:
        (event.clientY - r.top) *
        ((this.#geometry?.height ?? r.height) / r.height),
    });
  };
  protected override render(): void {
    const owner = this.owner;
    if (owner && owner.presentation !== 'pending') {
      this.#clearPointer();
      this.removeAttribute('data-moving');
      this.#runner?.dispose();
      return;
    }
    const moving = this.allowed(this.activity);
    if (media(this.ownerDocument.defaultView, '(forced-colors: active)')) {
      this.#runner?.dispose();
      this.removeAttribute('data-moving');
      this.#clearPointer();
      return;
    }
    this.toggleAttribute('data-moving', moving);
    if (!moving || this.pointerResponse !== 'lift') this.#clearPointer();
    if (moving && (this.activity.started === undefined || !this.deadline))
      this.arm(this.activity);
    const binding =
      this.#bindings.idle ?? this.preset?.animations?.idle ?? defaultRidge;
    const createRunner = definitionOf(binding).runner;
    if (this.#runner && this.#createRunner !== createRunner) {
      // A different idle definition may need a different renderer.
      this.#runner.dispose();
      this.#runner = undefined;
    }
    this.#createRunner = createRunner;
    this.#runner ??= createRunner?.(
      this,
      (code) => this.report(code, 'animations'),
      () => this.requestRender(),
    );
    this.#runner?.draw(binding, !moving, this.speed);
  }
}
export function registerChartLoader(): void {
  register('dotquilt-chart-loader', ChartLoader);
}
export { refreshStyles } from './internal/element.js';
