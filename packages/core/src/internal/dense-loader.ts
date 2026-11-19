import type {
  AnimationBinding,
  AnimationSurface,
  Animations,
  Dot,
} from '../animations.js';
import type { LoadingRegion } from '../region.js';
import { definitionOf, validateBindings } from './binding.js';
import {
  chartHandoff,
  type RichParticipant,
  richHandoff,
} from './chart-participant.js';
import { contentBox, surfaceEnvironment } from './content-box.js';
import { coordinatedHandoff } from './coordinated-handoff.js';
import {
  installDensePainter,
  invalidateDensePainter,
} from './dense/managed-painter.js';
import {
  ancestors,
  media,
  motionRestricted,
  upgradeProperties,
} from './dom.js';
import { type Activity, ManagedElement } from './element.js';
import { EventElement } from './event-element.js';
import {
  type HandoffDriver,
  type HandoffSource,
  runHandoff,
} from './handoff.js';
import { dotRadius, markOf } from './marks.js';
import { denseParts, morphMarks, type Part } from './morph-marks.js';
import { pointer } from './painter.js';
import type { Runner } from './runner.js';
import { readSurface } from './surface.js';

export type DenseFamily = 'chart' | 'table';
export type PointerResponse = 'none' | 'lift';
export type Bounds = Readonly<{ width: number; height: number }>;
type Input<F extends DenseFamily> = AnimationSurface<F>['input'];
/** Turns the content box into the handoff's target input. */
export type Projector<F extends DenseFamily> = (
  bounds: Bounds,
  report: (code: string) => void,
) => Input<F>;

interface Owner extends HTMLElement {
  activity: Activity;
  state: string;
  presentation: string;
  refresh(): void;
}

const empty: readonly Dot[] = /* @__PURE__ */ Object.freeze([]);

/**
 * Shared behaviour of the dot-field loaders (ChartLoader, TableLoader): one
 * dense painter per element, an idle runner while pending, and a rich
 * handoff whose target geometry comes from the caller's `targetProvider`.
 * Subclasses supply the family-specific pieces through the abstract hooks.
 */
export abstract class DenseLoader<
  F extends DenseFamily,
  Provider extends (bounds: Bounds) => unknown,
> extends EventElement<F> {
  static override observedAttributes = [
    ...ManagedElement.observedAttributes,
    'speed',
    'pointer-response',
  ];

  protected abstract readonly family: F;
  /** Shadow styles for this family. */
  protected abstract readonly styles: readonly string[];
  /** Symbol under which the surface carries the resolved dot appearance. */
  protected abstract readonly appearanceKey: symbol;
  protected abstract readonly emptyInput: Input<F>;
  protected abstract defaultIdle(): AnimationBinding<F, 'idle'>;
  protected abstract defaultHandoff(): AnimationBinding<F, 'handoff'>;
  /** The element that holds the static drawing inside the shadow root. */
  protected abstract createSurface(document: Document): Node;
  /**
   * Captures the options the projection needs when the handoff is requested,
   * so later option changes don't leak into a handoff already in flight.
   */
  protected abstract projector(provider: Provider | undefined): Projector<F>;
  /** Input used when the handoff has not projected one yet. */
  protected surfaceInput(input: Input<F>, _width: number): Input<F> {
    return input;
  }
  /** Runs once per connection, before the shadow surface is built. */
  protected prepareConnection(): void {}
  /** Runs on each render while the owning region is not pending. */
  protected settled(): void {}

  #bindings: Animations<F> = {};
  #provider: Provider | undefined;
  #runner: Runner | undefined;
  #createRunner: unknown;
  #source: readonly Dot[] = empty;
  #input: Input<F> | undefined;
  #geometry: AnimationSurface<F> | undefined;
  #environment: string | undefined;

  protected override upgrade(): void {
    upgradeProperties(this, [
      'stylePolicy',
      'preset',
      'animations',
      'motion',
      'speed',
      'pointerResponse',
      'targetProvider',
    ]);
  }

  get speed(): number {
    const n = Number(this.getAttribute('speed') ?? this.preset?.speed ?? 1);
    return Number.isFinite(n) && n > 0 ? Math.min(4, n) : 1;
  }
  set speed(value: number | undefined) {
    if (value === undefined) this.removeAttribute('speed');
    else this.setAttribute('speed', String(value));
  }
  get pointerResponse(): PointerResponse {
    return (this.getAttribute('pointer-response') ??
      this.preset?.pointerResponse) === 'lift'
      ? 'lift'
      : 'none';
  }
  set pointerResponse(value: PointerResponse | undefined) {
    if (value === undefined) this.removeAttribute('pointer-response');
    else this.setAttribute('pointer-response', value);
  }
  get animations(): Animations<F> {
    return this.#bindings;
  }
  set animations(value: Animations<F> | undefined) {
    try {
      validateBindings(value, this.family);
      this.#bindings = Object.freeze({ ...value });
      this.#runner?.reset?.();
      this.accept('animations');
    } catch {
      this.#bindings = {};
      this.report('invalid-binding', 'animations');
    }
    this.requestRender();
  }
  get targetProvider(): Provider | undefined {
    return this.#provider;
  }
  set targetProvider(value: Provider | undefined) {
    this.#provider = typeof value === 'function' ? value : undefined;
    if (value !== undefined && !this.#provider)
      this.report('invalid-provider', 'targetProvider');
    else this.accept('targetProvider');
  }
  /** The region this loader is the placeholder of, if any. */
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

  protected override get optionNames(): readonly string[] {
    return [
      ...super.optionNames,
      'speed',
      'pointerResponse',
      'animations',
      'targetProvider',
    ];
  }
  protected override presetChanged(): void {
    this.#runner?.reset?.();
  }

  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (
      value !== null &&
      ((name === 'pointer-response' && !['none', 'lift'].includes(value)) ||
        (name === 'speed' &&
          !(Number.isFinite(Number(value)) && Number(value) > 0)))
    )
      this.invalidOption(name);
    super.attributeChangedCallback(name, old, value);
    // Another mark has another size and pitch, so the field is rebuilt.
    if (name === 'mark' && old !== value && this.shadowRoot) this.refresh();
  }
  override connectedCallback(): void {
    installDensePainter(this);
    this.prepareConnection();
    super.connectedCallback();
    this.setAttribute('data-dotquilt-surface', '');
    this.setAttribute('aria-hidden', 'true');
    if (!this.shadowRoot)
      this.attachStyledShadow(this.styles, true).append(
        this.createSurface(this.ownerDocument),
      );
    // Server-rendered fallback markup is replaced by the live surface.
    this.whenStyled(() => {
      for (const child of this.querySelectorAll(
        ':scope > [data-dotquilt-style],:scope > [data-dotquilt-static]',
      ))
        child.remove();
    });
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
    this.clearSurface();
  }

  refresh(): void {
    invalidateDensePainter(this);
    this.#runner?.reset?.();
    this.clearSurface();
    this.resources?.eligible(true);
    this.requestRender();
  }

  [readSurface](_family: F, ids: readonly string[] = []): AnimationSurface<F> {
    if (!this.#geometry) {
      const { width, height } = contentBox(this);
      // Let CSS resolve lengths/calc once per invalidation, never per frame.
      const field = this.shadowRoot?.querySelector('.surface');
      const resolved =
        field && this.ownerDocument.defaultView?.getComputedStyle(field);
      // The tile is the pitch across and down; dashes have different ones.
      const [across = 0, down = across] = (resolved?.backgroundSize ?? '')
        .split(/\s+/)
        .map(parseFloat);
      const pitch = across || 6,
        rows = down || pitch,
        gap = parseFloat(resolved?.gap ?? ''),
        // Dots take their size from the CSS; squares and dashes have a fixed
        // spec size, drawn at the default radius.
        size =
          markOf(this) === 'dot'
            ? Math.max(0, pitch - (gap >= 0 ? gap : 4))
            : 2 * dotRadius;
      this.#geometry = Object.freeze({
        family: this.family,
        width,
        height,
        input: this.surfaceInput(this.#input ?? this.emptyInput, width),
        source: this.#source,
        revealTargetIds: Object.freeze([...ids]),
        [this.appearanceKey]: Object.freeze({
          pitch: Math.max(2, Math.min(64, pitch)),
          rows: Math.max(2, Math.min(64, rows)),
          scale: Math.max(0.1, Math.min(8, size / 2)),
        }),
      }) as AnimationSurface<F>;
    }
    return this.#geometry;
  }

  /** Its marks as last drawn, for the region's morph handoff (morph.ts). */
  [morphMarks](origin: DOMRect): readonly Part[] {
    return denseParts(this, origin, this.#runner?.capture?.() ?? empty);
  }
  /** Whether it needs its rich handoff: real geometry from a provider, or a chosen animation. */
  get [richHandoff](): boolean {
    return !!(
      this.#provider ??
      this.#bindings.handoff ??
      this.preset?.animations?.handoff
    );
  }

  [chartHandoff](
    owner: LoadingRegion,
    participants?: readonly RichParticipant[],
  ): HandoffSource {
    if (participants && participants.length > 1)
      return coordinatedHandoff(
        owner,
        participants.map((child) => child[chartHandoff](owner)),
      );
    this.#clearPointer();
    const binding =
      this.#bindings.handoff ??
      this.preset?.animations?.handoff ??
      this.defaultHandoff();
    const project = this.projector(this.#provider),
      easing = owner.timing.easing;
    return {
      binding,
      host: this,
      animation: binding.id,
      prepare: (selected, request) => {
        this.#input = project(Object.freeze(contentBox(this)), request.report);
        this.#source = this.#runner?.capture?.() ?? empty;
        // Release the outgoing painter before admitting the handoff painter.
        // The captured dot snapshot keeps continuity without a double peak.
        this.#runner?.dispose();
        this.#geometry = undefined;
        const captured = selected ?? binding;
        let driver: HandoffDriver;
        try {
          driver = runHandoff(undefined, captured, {
            ...request,
            // The handoff also ends when this loader leaves its region.
            current: () =>
              request.current() && this.isConnected && this.owner === owner,
          });
        } catch (error) {
          this.clearSurface();
          throw error;
        }
        return {
          ...driver,
          restricted: () => motionRestricted(this),
          draw: (linear, eased) =>
            driver.draw?.(linear, easing === undefined ? linear : eased),
          dispose: () => {
            driver.dispose();
            this.clearSurface();
          },
        };
      },
    };
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

  /** Drops the measured surface and the handoff's projected input. */
  protected clearSurface(): void {
    this.#geometry = undefined;
    this.#source = empty;
    this.#input = undefined;
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
      this.settled();
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
      this.#bindings.idle ??
      this.preset?.animations?.idle ??
      this.defaultIdle();
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
