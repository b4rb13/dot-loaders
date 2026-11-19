import type {
  AnimationSurface,
  Animations,
  Dot,
  GlyphCell,
} from './animations.js';
import { definitionOf } from './internal/binding.js';
import {
  ancestors,
  media,
  node,
  register,
  upgradeProperties,
} from './internal/dom.js';
import type { HandoffSource } from './internal/handoff.js';
import { documentDots } from './internal/ledger.js';
import { LoadingController } from './internal/loading-controller.js';
import { pointer } from './internal/painter.js';
import type { Preset } from './internal/preset.js';
import { textPreset } from './internal/preset.js';
import { capturePresetData } from './internal/preset-data.js';
import type { Runner } from './internal/runner.js';
import { readSurface } from './internal/surface.js';
import {
  defaultTextHandoff as handoff,
  defaultTextIdle as idle,
} from './internal/text-definitions.js';
import { textStyles } from './text-styles.js';

export type TextPreset = import('./internal/preset.js').Preset<'text'>;
export class TextLoader extends LoadingController<'text'> {
  protected override upgrade(): void {
    super.upgrade();
    upgradeProperties(this, ['speed', 'pointerResponse']);
  }
  protected override capturePreset(value: Preset<'text'>): Preset<'text'> {
    return capturePresetData(value, 'text', () => textPreset);
  }
  static override observedAttributes = [
    ...LoadingController.observedAttributes,
    'mask',
    'speed',
    'pointer-response',
  ];
  protected override get family(): 'text' {
    return 'text';
  }
  protected override get styles(): readonly string[] {
    return textStyles;
  }
  protected override handoffSource(): HandoffSource {
    return {
      binding: this.preset?.animations?.handoff ?? handoff,
      host: this,
      animation: 'dotquilt/fade',
    };
  }
  #runner: Runner | undefined;
  #runnerDefinition: unknown;
  #mask: HTMLElement | undefined;
  #surface: AnimationSurface<'text'> | undefined;
  #source: readonly Dot[] = [];
  #nodes: readonly Node[] = [];
  #value = '';
  #geometry: string | undefined;
  #owner: LoadingController | undefined;
  #ownerObserver: MutationObserver | undefined;
  override get activity() {
    return this.#owner?.activity ?? super.activity;
  }
  override get animations(): Animations<'text'> {
    return super.animations;
  }
  override set animations(value: Animations<'text'> | undefined) {
    super.animations = value;
    this.#runner?.reset?.();
  }
  override update(
    patch: Parameters<LoadingController<'text'>['update']>[0] & {
      readonly mask?: string | undefined;
      readonly speed?: number | undefined;
      readonly pointerResponse?: 'none' | 'lift' | undefined;
      readonly preset?: TextPreset | undefined;
    },
  ): void {
    super.update(patch);
  }
  protected override get optionNames(): readonly string[] {
    return [...super.optionNames, 'mask', 'speed', 'pointerResponse'];
  }
  get mask(): string | undefined {
    return this.getAttribute('mask') ?? undefined;
  }
  set mask(value: string | undefined) {
    if (value === undefined) this.removeAttribute('mask');
    else this.setAttribute('mask', String(value));
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
    else this.setAttribute('pointer-response', String(value));
  }
  protected override presetChanged(): void {
    this.#runner?.reset?.();
  }
  override connectedCallback(): void {
    upgradeProperties(this, ['mask']);
    super.connectedCallback();
    let placeholder = this.slot === 'placeholder';
    for (const parent of ancestors(this)) {
      if (parent.localName === 'dotquilt-region') {
        if (placeholder) {
          this.#owner = parent as LoadingController;
          this.#ownerObserver = new MutationObserver(() =>
            this.requestRender(),
          );
          this.#ownerObserver.observe(parent, {
            attributes: true,
            attributeFilter: ['data-presentation', 'state', 'cycle'],
          });
        }
        break;
      }
      placeholder ||= parent.slot === 'placeholder';
    }
    // Unstyled, the mask would render as plain text beside the static one.
    this.whenStyled(() => {
      const placeholderLayer = this.shadowRoot?.querySelector('.p');
      if (placeholderLayer && !this.#mask) {
        this.#mask = node(this.ownerDocument, 'span', {
          class: 'mask',
          'aria-hidden': 'true',
        });
        placeholderLayer.append(this.#mask);
        // A surface measured before the mask existed has no mask glyphs, and
        // the geometry may not change again to replace it: measure anew.
        this.#surface = undefined;
      }
    });
    for (const content of this.querySelectorAll(
      ':scope > [data-dotquilt-text-content]',
    )) {
      content.removeAttribute('aria-hidden');
      content.removeAttribute('inert');
    }
    this.listen(this.ownerDocument.fonts, 'loadingdone', this.#fontChanged);
    this.listen(this.shadowRoot, 'load', this.#fontChanged, true);
    this.listen(this, 'pointermove', this.#pointer as EventListener);
    this.listen(this, 'pointerleave', this.#leave);
  }
  override disconnectedCallback(): void {
    this.#stopIdle(true);
    this.#ownerObserver?.disconnect();
    this.#ownerObserver = undefined;
    this.#owner = undefined;
    this.#surface = undefined;
    this.#source = [];
    this.#nodes = [];
    this.#value = '';
    this.#geometry = undefined;
    super.disconnectedCallback();
  }
  protected override environmentChanged(): void {
    // Re-measure glyphs only when the text's size or font actually changed.
    const changed =
      this.#geometry !== undefined && this.#geometry !== this.#geometryKey();
    if (changed) this.#surface = undefined;
    if (changed && this.presentation === 'handoff') super.refresh();
    else super.environmentChanged();
  }
  #geometryKey(): string {
    const win = this.ownerDocument.defaultView;
    const properties = [
      'font',
      'letterSpacing',
      'wordSpacing',
      'lineHeight',
      'direction',
      'writingMode',
      'whiteSpace',
      'textTransform',
      'padding',
      'borderWidth',
    ] as const;
    return JSON.stringify(
      [this, this.shadowRoot?.querySelector('.c')].flatMap((element) => {
        const css = element && win?.getComputedStyle(element);
        const bounds = element?.getBoundingClientRect();
        return [
          // A translated DOMRect can gain float noise in WebKit. Keep the
          // same 1/64px geometry precision as the handoff bounds checks.
          bounds && Math.round(bounds.width * 64) / 64,
          bounds && Math.round(bounds.height * 64) / 64,
          ...properties.map((property) => css?.[property]),
        ];
      }),
    );
  }
  // A font or stylesheet finished loading somewhere on the page. Re-measure
  // only if this text's geometry changed, so an unrelated font doesn't end a
  // handoff in flight.
  #fontChanged = () => this.environmentChanged();
  #leave = () => {
    Reflect.deleteProperty(this, pointer);
    this.#drawIdle();
  };
  #pointer = (event: PointerEvent) => {
    if (
      this.pointerResponse !== 'lift' ||
      !this.hasAttribute('data-moving') ||
      event.pointerType === 'touch' ||
      !media(this.ownerDocument.defaultView, '(hover:hover) and (pointer:fine)')
    ) {
      // Lift no longer applies (touch, no hover, paused): drop the old position
      // so the drawing does not stay lifted at a stale point.
      Reflect.deleteProperty(this, pointer);
      return;
    }
    const rect = this.getBoundingClientRect();
    Reflect.set(this, pointer, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };
  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (old !== value && name === 'mask') this.#surface = undefined;
    if (
      value !== null &&
      (name === 'speed'
        ? !Number.isFinite(+value) || +value <= 0
        : name === 'pointer-response' && !['none', 'lift'].includes(value))
    )
      this.invalidOption(name);
    super.attributeChangedCallback(name, old, value);
  }
  override refresh(): void {
    this.#surface = undefined;
    super.refresh();
  }
  protected override contentChanged(): void {
    const [nodes, value, precise] = this.#plain();
    if (
      !precise ||
      value !== this.#value ||
      nodes.length !== this.#nodes.length ||
      nodes.some((node, i) => node !== this.#nodes[i])
    )
      this.refresh();
  }
  protected override settled(): void {
    this.#source = [];
    this.#surface = undefined;
  }
  #plain(): [nodes: Text[], value: string, precise: boolean] {
    const nodes: Text[] = [];
    if (this.childNodes.length > 258) return [nodes, '', false];
    let value = '',
      precise = true;
    for (const child of this.childNodes) {
      // The static stylesheet stays until the shadow stylesheet applies.
      if (
        child instanceof Element &&
        (child.hasAttribute('slot') ||
          child.hasAttribute('data-dotquilt-style'))
      )
        continue;
      if (child.childNodes.length > 256) return [nodes, '', false];
      const contents =
        child instanceof Element &&
        child.hasAttribute('data-dotquilt-text-content')
          ? child.childNodes
          : [child];
      for (const content of contents) {
        if (content.nodeType !== 3) {
          if (content.nodeType !== 8) precise = false;
          continue;
        }
        const text = content as Text;
        if (value.length + text.length > 256) {
          precise = false;
          continue;
        }
        nodes.push(text);
        value += text.data;
      }
    }
    return [nodes, value, precise && /^[\x20-\x7e]*$/.test(value)];
  }
  [readSurface](
    _family: 'text',
    ids: readonly string[] = [],
  ): AnimationSurface<'text'> {
    if (this.#surface) return this.#surface;
    this.#geometry = this.#geometryKey();
    const [nodes, value, plain] = this.#plain();
    this.#nodes = nodes;
    this.#value = value;
    const mask = this.mask ?? value;
    const displayMask = mask.length <= 256 ? mask : '';
    if (this.#mask && this.#mask.textContent !== displayMask)
      this.#mask.textContent = displayMask;
    const rect = this.getBoundingClientRect();
    const measure = (texts: readonly Text[]): readonly GlyphCell[] => {
      const cells: GlyphCell[] = [];
      const range = this.ownerDocument.createRange();
      for (const text of texts)
        for (let i = 0; i < text.length; i++) {
          range.setStart(text, i);
          range.setEnd(text, i + 1);
          const b = range.getBoundingClientRect();
          cells.push(
            Object.freeze({
              character: text.data[i] ?? '',
              bounds: Object.freeze({
                x: b.x - rect.x,
                y: b.y - rect.y + b.height * 0.13,
                width: b.width,
                height: b.height * 0.74,
              }),
            }),
          );
        }
      return Object.freeze(cells);
    };
    const supported =
      plain &&
      mask.length <= 256 &&
      /^[\x20-\x7e]*$/.test(mask) &&
      this.ownerDocument.defaultView?.getComputedStyle(this).direction !==
        'rtl';
    const maskCells =
      supported && this.#mask?.firstChild
        ? measure([this.#mask.firstChild as Text])
        : [];
    const valueCells = supported ? measure(nodes) : [];
    const singleLine = (cells: readonly GlyphCell[]) =>
      cells.every(
        (cell) => Math.abs(cell.bounds.y - (cells[0]?.bounds.y ?? 0)) < 1,
      );
    const count = Math.max(
      maskCells.length * 35,
      valueCells.length * 35 + this.#source.length,
    );
    const precise =
      !!supported &&
      singleLine(maskCells) &&
      singleLine(valueCells) &&
      count <= 4096 &&
      documentDots(this.ownerDocument) + count <= 16384 &&
      rect.width > 0 &&
      rect.height > 0;
    this.toggleAttribute('data-dotquilt-glyphs', precise);
    // Content that isn't plain text reports again only after it was plain.
    if (!plain) this.report('generic-text-fallback', 'children');
    else this.accept('children');
    this.#surface = Object.freeze({
      family: 'text',
      width: rect.width,
      height: rect.height,
      input: Object.freeze({
        shapes: Object.freeze([]),
        mask: Object.freeze(maskCells),
        value: Object.freeze(valueCells),
        precise,
      }),
      source: this.#source,
      revealTargetIds: Object.freeze([...ids]),
    });
    return this.#surface;
  }
  #stopIdle(discard = false): void {
    this.#runner?.dispose();
    if (discard) {
      this.#runner = undefined;
      this.#runnerDefinition = undefined;
    }
    this.clearDeadline();
    this.removeAttribute('data-moving');
    Reflect.deleteProperty(this, pointer);
  }
  #drawIdle = (): void => {
    if (!this.isConnected || this.state !== 'pending') {
      this.#stopIdle(true);
      return;
    }
    if (this.#owner && this.#owner.presentation !== 'pending') {
      this.#stopIdle();
      return;
    }
    const surface = this[readSurface]('text');
    if (
      !surface.input.precise ||
      !surface.input.mask.length ||
      media(this.ownerDocument.defaultView, '(forced-colors: active)')
    ) {
      this.#stopIdle();
      return;
    }
    const binding =
      this.animations.idle ?? this.preset?.animations?.idle ?? idle;
    const definition = definitionOf(binding);
    if (this.#runnerDefinition !== definition) {
      this.#runner?.dispose();
      this.#runner = definition.runner?.(
        this,
        (code) => this.report(code, 'animations'),
        this.#drawIdle,
      );
      this.#runnerDefinition = definition;
    }
    const moving = this.allowed(this.activity);
    this.toggleAttribute('data-moving', moving);
    if (!moving || this.pointerResponse !== 'lift')
      Reflect.deleteProperty(this, pointer);
    if (!moving) this.clearDeadline();
    this.#runner?.draw(binding, !moving, this.speed);
    if (moving && this.deadline === undefined) this.arm(this.activity);
  };
  protected override render(): void {
    if (this.state !== 'pending') {
      if (this.#runner) {
        this.#source = this.#runner.capture?.() ?? Object.freeze([]);
        this.#stopIdle(true);
        this.#surface = undefined;
        if (this.state !== 'ready') this.#source = [];
      }
    }
    this[readSurface]('text');
    super.render();
    this.#drawIdle();
  }
}
export function registerTextLoader(): void {
  register('dotquilt-text-loader', TextLoader);
}
